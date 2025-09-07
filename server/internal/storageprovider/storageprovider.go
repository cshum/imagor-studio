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
	currentStorage storage.Storage
	storageState   StorageState
	configLoadedAt int64 // Unix milliseconds when storage config was loaded
	mutex          sync.RWMutex
}

// New creates a new storage provider
func New(logger *zap.Logger, registryStore registrystore.Store) *Provider {
	return &Provider{
		logger:         logger,
		registryStore:  registryStore,
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
		zap.String("baseDir", cfg.FileBaseDir),
		zap.String("mkdirPermissions", cfg.FileMkdirPermissions.String()),
		zap.String("writePermissions", cfg.FileWritePermissions.String()),
	)

	return filestorage.New(cfg.FileBaseDir,
		filestorage.WithMkdirPermission(cfg.FileMkdirPermissions),
		filestorage.WithWritePermission(cfg.FileWritePermissions),
	)
}

// NewS3Storage creates an S3 storage instance
func (p *Provider) NewS3Storage(cfg *config.Config) (storage.Storage, error) {
	if cfg.S3Bucket == "" {
		return nil, fmt.Errorf("s3-bucket is required when storage-type is s3")
	}

	p.logger.Info("Creating S3 storage",
		zap.String("bucket", cfg.S3Bucket),
		zap.String("region", cfg.S3Region),
		zap.String("endpoint", cfg.S3Endpoint),
		zap.String("baseDir", cfg.S3BaseDir),
	)

	var options []s3storage.Option

	if cfg.S3Region != "" {
		options = append(options, s3storage.WithRegion(cfg.S3Region))
	}

	if cfg.S3Endpoint != "" {
		options = append(options, s3storage.WithEndpoint(cfg.S3Endpoint))
	}

	if cfg.S3AccessKeyID != "" && cfg.S3SecretAccessKey != "" {
		options = append(options, s3storage.WithCredentials(
			cfg.S3AccessKeyID,
			cfg.S3SecretAccessKey,
			cfg.S3SessionToken,
		))
	}

	if cfg.S3BaseDir != "" {
		options = append(options, s3storage.WithBaseDir(cfg.S3BaseDir))
	}

	return s3storage.New(cfg.S3Bucket, options...)
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

	// Check if storage is configured in registry
	if p.isStorageConfiguredInRegistry() {
		s, err := p.NewStorageFromConfig(cfg)
		if err != nil {
			p.logger.Warn("Failed to create storage from config, using NoOp storage", zap.Error(err))
			p.currentStorage = noopstorage.New()
			p.storageState = StorageStateNoop
			return nil
		}
		p.currentStorage = s
		p.storageState = StorageStateConfigured
		p.configLoadedAt = time.Now().UnixMilli()
		p.logger.Info("Storage initialized successfully", zap.String("type", cfg.StorageType))
	} else {
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

	configUpdatedAtStr, exists := p.getRegistryValue("config.storage_config_updated_at")
	if !exists {
		return false
	}

	configUpdatedAt, err := strconv.ParseInt(configUpdatedAtStr, 10, 64)
	if err != nil {
		return false
	}

	return configUpdatedAt > p.configLoadedAt
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
	configured, exists := p.getRegistryValue("config.storage_configured")
	return exists && configured == "true"
}

// getRegistryValue gets a value from the registry
func (p *Provider) getRegistryValue(key string) (string, bool) {
	if p.registryStore == nil {
		return "", false
	}

	// Add defensive programming - catch any panics
	defer func() {
		if r := recover(); r != nil {
			// Log the panic and return safe values
			return
		}
	}()

	ctx := context.Background()
	entry, err := p.registryStore.Get(ctx, "system", key)
	if err != nil {
		return "", false
	}
	return entry.Value, true
}

// buildConfigFromRegistry builds a config object from registry values
func (p *Provider) buildConfigFromRegistry() (*config.Config, error) {
	cfg := &config.Config{}

	// Get storage type
	storageType, exists := p.getRegistryValue("config.storage_type")
	if !exists {
		return nil, fmt.Errorf("storage type not found in registry")
	}
	cfg.StorageType = storageType

	// Load type-specific configuration
	switch storageType {
	case "file", "filesystem":
		if err := p.loadFileConfigFromRegistry(cfg); err != nil {
			return nil, err
		}
	case "s3":
		if err := p.loadS3ConfigFromRegistry(cfg); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", storageType)
	}

	return cfg, nil
}

// loadFileConfigFromRegistry loads file storage configuration from registry
func (p *Provider) loadFileConfigFromRegistry(cfg *config.Config) error {
	if baseDir, exists := p.getRegistryValue("config.file_base_dir"); exists {
		cfg.FileBaseDir = baseDir
	} else {
		cfg.FileBaseDir = "./storage" // Default
	}

	if mkdirPerm, exists := p.getRegistryValue("config.file_mkdir_permissions"); exists {
		perm, err := strconv.ParseUint(mkdirPerm, 8, 32)
		if err != nil {
			return fmt.Errorf("invalid file mkdir permissions: %w", err)
		}
		cfg.FileMkdirPermissions = os.FileMode(perm)
	} else {
		cfg.FileMkdirPermissions = 0755 // Default
	}

	if writePerm, exists := p.getRegistryValue("config.file_write_permissions"); exists {
		perm, err := strconv.ParseUint(writePerm, 8, 32)
		if err != nil {
			return fmt.Errorf("invalid file write permissions: %w", err)
		}
		cfg.FileWritePermissions = os.FileMode(perm)
	} else {
		cfg.FileWritePermissions = 0644 // Default
	}

	return nil
}

// loadS3ConfigFromRegistry loads S3 storage configuration from registry
func (p *Provider) loadS3ConfigFromRegistry(cfg *config.Config) error {
	if bucket, exists := p.getRegistryValue("config.s3_bucket"); exists {
		cfg.S3Bucket = bucket
	} else {
		return fmt.Errorf("s3 bucket is required")
	}

	if region, exists := p.getRegistryValue("config.s3_region"); exists {
		cfg.S3Region = region
	}

	if endpoint, exists := p.getRegistryValue("config.s3_endpoint"); exists {
		cfg.S3Endpoint = endpoint
	}

	if accessKey, exists := p.getRegistryValue("config.s3_access_key_id"); exists {
		cfg.S3AccessKeyID = accessKey
	}

	if secretKey, exists := p.getRegistryValue("config.s3_secret_access_key"); exists {
		cfg.S3SecretAccessKey = secretKey
	}

	if sessionToken, exists := p.getRegistryValue("config.s3_session_token"); exists {
		cfg.S3SessionToken = sessionToken
	}

	if baseDir, exists := p.getRegistryValue("config.s3_base_dir"); exists {
		cfg.S3BaseDir = baseDir
	}

	return nil
}
