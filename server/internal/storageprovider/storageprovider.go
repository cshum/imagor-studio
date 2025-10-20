package storageprovider

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/noopstorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"go.uber.org/zap"
)

// StorageState represents the current state of storage configuration
type StorageState string

const (
	StorageStateNoop       StorageState = "noop"
	StorageStateConfigured StorageState = "configured"
)

// Provider handles storage creation with state management
type Provider struct {
	logger         *zap.Logger
	registryStore  registrystore.Store
	config         *config.Config
	currentStorage storage.Storage
	storageState   StorageState
	configLoadedAt int64 // Unix milliseconds when storage config was loaded
	mutex          sync.RWMutex
}

// New creates a new storage provider
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config) *Provider {
	return &Provider{
		logger:         logger,
		registryStore:  registryStore,
		config:         cfg,
		storageState:   StorageStateNoop,
		configLoadedAt: time.Now().UnixMilli(),
		mutex:          sync.RWMutex{},
	}
}

// NewStorageFromConfig creates storage based on configuration
func (p *Provider) NewStorageFromConfig(cfg *config.Config) (storage.Storage, error) {
	switch cfg.StorageType {
	case "file", "filesystem":
		return p.NewFileStorage(cfg)
	case "s3":
		return p.NewS3Storage(cfg)
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", cfg.StorageType)
	}
}

// NewFileStorage creates a file storage instance
func (p *Provider) NewFileStorage(cfg *config.Config) (storage.Storage, error) {
	p.logger.Info("Creating file storage",
		zap.String("baseDir", cfg.FileStorageBaseDir),
		zap.String("mkdirPermissions", cfg.FileStorageMkdirPermissions.String()),
		zap.String("writePermissions", cfg.FileStorageWritePermissions.String()),
	)

	return filestorage.New(cfg.FileStorageBaseDir,
		filestorage.WithMkdirPermission(cfg.FileStorageMkdirPermissions),
		filestorage.WithWritePermission(cfg.FileStorageWritePermissions),
		filestorage.WithLogger(p.logger),
	)
}

// NewS3Storage creates an S3 storage instance
func (p *Provider) NewS3Storage(cfg *config.Config) (storage.Storage, error) {
	if cfg.S3StorageBucket == "" {
		return nil, fmt.Errorf("s3-storage-bucket is required when storage-type is s3")
	}

	p.logger.Info("Creating S3 storage",
		zap.String("bucket", cfg.S3StorageBucket),
		zap.String("region", cfg.S3StorageRegion),
		zap.String("endpoint", cfg.S3StorageEndpoint),
		zap.String("baseDir", cfg.S3StorageBaseDir),
	)

	var options []s3storage.Option

	if cfg.S3StorageRegion != "" {
		options = append(options, s3storage.WithRegion(cfg.S3StorageRegion))
	}

	if cfg.S3StorageEndpoint != "" {
		options = append(options, s3storage.WithEndpoint(cfg.S3StorageEndpoint))
	}

	if cfg.S3StorageAccessKeyID != "" && cfg.S3StorageSecretAccessKey != "" {
		options = append(options, s3storage.WithCredentials(
			cfg.S3StorageAccessKeyID,
			cfg.S3StorageSecretAccessKey,
			cfg.S3StorageSessionToken,
		))
	}

	if cfg.S3StorageBaseDir != "" {
		options = append(options, s3storage.WithBaseDir(cfg.S3StorageBaseDir))
	}

	options = append(options, s3storage.WithForcePathStyle(cfg.S3StorageForcePathStyle))

	return s3storage.New(cfg.S3StorageBucket, options...)
}

// GetStorage returns the current storage instance, checking registry if in NoOp state
func (p *Provider) GetStorage() storage.Storage {
	p.mutex.RLock()
	if p.storageState == StorageStateConfigured {
		defer p.mutex.RUnlock()
		return p.currentStorage
	}
	p.mutex.RUnlock()

	// For NoOp state, check registry once and try to configure storage
	return p.loadStorageFromRegistry()
}

// InitializeWithConfig initializes storage with the given configuration
func (p *Provider) InitializeWithConfig(cfg *config.Config) error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	// Try to create storage from config first (env/CLI)
	s, err := p.NewStorageFromConfig(cfg)
	if s != nil && err == nil {
		// Env/CLI config worked - use it immediately
		p.currentStorage = s
		p.storageState = StorageStateConfigured
		p.configLoadedAt = time.Now().UnixMilli()
		p.logger.Info("Storage initialized successfully", zap.String("type", cfg.StorageType))
		return nil
	}

	// Env config failed, check if we should enable lazy loading
	if p.isStorageConfiguredInRegistry() {
		// Registry has config - set up for lazy loading
		p.currentStorage = noopstorage.New()
		p.storageState = StorageStateNoop
		p.logger.Info("Storage will be lazy loaded from registry")
	} else {
		// No config anywhere - use NoOp
		p.currentStorage = noopstorage.New()
		p.storageState = StorageStateNoop
		p.logger.Info("No storage configuration found, using NoOp storage")
	}

	return nil
}

// IsRestartRequired checks if a restart is required due to storage configuration changes
func (p *Provider) IsRestartRequired() bool {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	if p.storageState == StorageStateNoop {
		return false // No restart needed for first-time setup
	}

	ctx := context.Background()
	result := registryutil.GetEffectiveValue(ctx, p.registryStore, p.config, "config.storage_config_updated_at")
	if !result.Exists {
		return false
	}

	configUpdatedAt, err := strconv.ParseInt(result.Value, 10, 64)
	if err != nil {
		return false
	}

	return configUpdatedAt > p.configLoadedAt
}

// ReloadFromRegistry forces a reload of storage configuration from registry
func (p *Provider) ReloadFromRegistry() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	// Check if storage is configured in registry
	if !p.isStorageConfiguredInRegistry() {
		p.logger.Info("No storage configuration found in registry, keeping NoOp storage")
		return nil
	}

	// Try to create storage from registry configuration
	cfg, err := p.buildConfigFromRegistry()
	if err != nil {
		return fmt.Errorf("failed to build config from registry: %w", err)
	}

	s, err := p.NewStorageFromConfig(cfg)
	if err != nil {
		return fmt.Errorf("failed to create storage from registry config: %w", err)
	}

	p.currentStorage = s
	p.storageState = StorageStateConfigured
	p.configLoadedAt = time.Now().UnixMilli()
	p.logger.Info("Storage reloaded from registry", zap.String("type", cfg.StorageType))

	return nil
}

// loadStorageFromRegistry attempts to load storage configuration from registry
func (p *Provider) loadStorageFromRegistry() storage.Storage {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.storageState == StorageStateConfigured {
		return p.currentStorage
	}

	// Check if storage is now configured in registry
	if !p.isStorageConfiguredInRegistry() {
		return p.currentStorage // Still NoOp
	}

	// Try to create storage from registry configuration
	cfg, err := p.buildConfigFromRegistry()
	if err != nil {
		p.logger.Error("Failed to build config from registry", zap.Error(err))
		return p.currentStorage
	}

	s, err := p.NewStorageFromConfig(cfg)
	if err != nil {
		p.logger.Error("Failed to create storage from registry config", zap.Error(err))
		return p.currentStorage
	}

	p.currentStorage = s
	p.storageState = StorageStateConfigured
	p.configLoadedAt = time.Now().UnixMilli()
	p.logger.Info("Storage configured from registry", zap.String("type", cfg.StorageType))

	return p.currentStorage
}

// isStorageConfiguredInRegistry checks if storage is configured in the registry
func (p *Provider) isStorageConfiguredInRegistry() bool {
	ctx := context.Background()
	result := registryutil.GetEffectiveValue(ctx, p.registryStore, p.config, "config.storage_configured")
	return result.Exists && result.Value == "true"
}

// buildConfigFromRegistry builds a config object from registry values using batch operations
func (p *Provider) buildConfigFromRegistry() (*config.Config, error) {
	ctx := context.Background()
	cfg := &config.Config{}

	// Get all possible storage configuration keys in one batch call
	results := registryutil.GetEffectiveValues(ctx, p.registryStore, p.config,
		"config.storage_type",
		// File storage keys
		"config.file_storage_base_dir",
		"config.file_storage_mkdir_permissions",
		"config.file_storage_write_permissions",
		// S3 storage keys
		"config.s3_storage_bucket",
		"config.s3_storage_region",
		"config.s3_storage_endpoint",
		"config.s3_storage_force_path_style",
		"config.s3_storage_access_key_id",
		"config.s3_storage_secret_access_key",
		"config.s3_storage_session_token",
		"config.s3_storage_base_dir")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Get storage type
	storageTypeResult := resultMap["config.storage_type"]
	if !storageTypeResult.Exists {
		return nil, fmt.Errorf("storage type not found in registry")
	}
	cfg.StorageType = storageTypeResult.Value

	// Load type-specific configuration
	switch cfg.StorageType {
	case "file", "filesystem":
		if err := p.loadFileConfigFromResults(resultMap, cfg); err != nil {
			return nil, err
		}
	case "s3":
		if err := p.loadS3ConfigFromResults(resultMap, cfg); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", cfg.StorageType)
	}

	return cfg, nil
}

// loadFileConfigFromResults loads file storage configuration from pre-fetched results
func (p *Provider) loadFileConfigFromResults(resultMap map[string]registryutil.EffectiveValueResult, cfg *config.Config) error {
	if result := resultMap["config.file_storage_base_dir"]; result.Exists {
		cfg.FileStorageBaseDir = result.Value
	} else {
		cfg.FileStorageBaseDir = "/app/gallery" // Default
	}

	if result := resultMap["config.file_storage_mkdir_permissions"]; result.Exists {
		perm, err := strconv.ParseUint(result.Value, 8, 32)
		if err != nil {
			return fmt.Errorf("invalid file mkdir permissions: %w", err)
		}
		cfg.FileStorageMkdirPermissions = os.FileMode(perm)
	} else {
		cfg.FileStorageMkdirPermissions = 0755 // Default
	}

	if result := resultMap["config.file_storage_write_permissions"]; result.Exists {
		perm, err := strconv.ParseUint(result.Value, 8, 32)
		if err != nil {
			return fmt.Errorf("invalid file write permissions: %w", err)
		}
		cfg.FileStorageWritePermissions = os.FileMode(perm)
	} else {
		cfg.FileStorageWritePermissions = 0644 // Default
	}

	return nil
}

// loadS3ConfigFromResults loads S3 storage configuration from pre-fetched results
func (p *Provider) loadS3ConfigFromResults(resultMap map[string]registryutil.EffectiveValueResult, cfg *config.Config) error {
	if result := resultMap["config.s3_storage_bucket"]; result.Exists {
		cfg.S3StorageBucket = result.Value
	} else {
		return fmt.Errorf("s3 bucket is required")
	}

	if result := resultMap["config.s3_storage_region"]; result.Exists {
		cfg.S3StorageRegion = result.Value
	}

	if result := resultMap["config.s3_storage_endpoint"]; result.Exists {
		cfg.S3StorageEndpoint = result.Value
	}

	if result := resultMap["config.s3_storage_force_path_style"]; result.Exists {
		forcePathStyle, err := strconv.ParseBool(result.Value)
		if err != nil {
			return fmt.Errorf("invalid s3 force path style value: %w", err)
		}
		cfg.S3StorageForcePathStyle = forcePathStyle
	}

	if result := resultMap["config.s3_storage_access_key_id"]; result.Exists {
		cfg.S3StorageAccessKeyID = result.Value
	}

	if result := resultMap["config.s3_storage_secret_access_key"]; result.Exists {
		cfg.S3StorageSecretAccessKey = result.Value
	}

	if result := resultMap["config.s3_storage_session_token"]; result.Exists {
		cfg.S3StorageSessionToken = result.Value
	}

	if result := resultMap["config.s3_storage_base_dir"]; result.Exists {
		cfg.S3StorageBaseDir = result.Value
	}

	return nil
}
