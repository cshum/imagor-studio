package storageprovider

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"sync"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/noopstorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"go.uber.org/zap"
)

// Provider handles storage creation with state management.
//
// The storage instance is built once (from env/CLI config or registry) and
// cached. Configuration changes written via the admin UI are picked up by the
// background sync loop (server.startSyncLoop), which calls ReloadFromRegistry()
// every 30 seconds — no server restart required for any storage type.
//
// On first startup, if env/CLI config is valid, the instance is built
// immediately. Otherwise the provider starts in a "not configured" state and
// lazily builds the instance on the first GetStorage() call after registry
// config becomes available.
type Provider struct {
	logger        *zap.Logger
	registryStore registrystore.Store
	config        *config.Config

	currentStorage storage.Storage
	configured     bool   // true once real (non-noop) storage is loaded
	configKey      string // fingerprint of the currently-loaded config; empty = noop/unconfigured

	mutex sync.RWMutex
}

// storageConfigSnapshot contains all storage-relevant fields used to detect
// config changes.  It is JSON-marshalled (struct field order is deterministic
// in Go) and then SHA-256 hashed so that sensitive values (secrets, tokens)
// are never stored in plaintext in the fingerprint.
type storageConfigSnapshot struct {
	// common
	Type string
	// file storage
	BaseDir   string
	MkdirPerm uint32
	WritePerm uint32
	// s3 storage
	Bucket    string
	Region    string
	Endpoint  string
	PathStyle bool
	KeyID     string
	Secret    string
	Token     string
	S3BaseDir string
}

// storageConfigKey returns a 16-char hex fingerprint of the storage config.
// Any change to any field — including credentials — produces a different key.
// The raw values of sensitive fields are never readable from the key itself.
func storageConfigKey(cfg *config.Config) string {
	snap := storageConfigSnapshot{
		Type:      cfg.StorageType,
		BaseDir:   cfg.FileStorageBaseDir,
		MkdirPerm: uint32(cfg.FileStorageMkdirPermissions),
		WritePerm: uint32(cfg.FileStorageWritePermissions),
		Bucket:    cfg.S3StorageBucket,
		Region:    cfg.AWSRegion,
		Endpoint:  cfg.S3Endpoint,
		PathStyle: cfg.S3ForcePathStyle,
		KeyID:     cfg.AWSAccessKeyID,
		Secret:    cfg.AWSSecretAccessKey,
		Token:     cfg.AWSSessionToken,
		S3BaseDir: cfg.S3StorageBaseDir,
	}
	b, _ := json.Marshal(snap)
	sum := sha256.Sum256(b)
	return fmt.Sprintf("%x", sum[:8]) // 16 hex chars
}

// New creates a new storage provider
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config) *Provider {
	return &Provider{
		logger:        logger,
		registryStore: registryStore,
		config:        cfg,
		mutex:         sync.RWMutex{},
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
	p.logger.Debug("Creating file storage",
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

	p.logger.Debug("Creating S3 storage",
		zap.String("bucket", cfg.S3StorageBucket),
		zap.String("region", cfg.AWSRegion),
		zap.String("endpoint", cfg.S3Endpoint),
		zap.String("baseDir", cfg.S3StorageBaseDir),
	)

	var options []s3storage.Option

	if cfg.AWSRegion != "" {
		options = append(options, s3storage.WithRegion(cfg.AWSRegion))
	}

	if cfg.S3Endpoint != "" {
		options = append(options, s3storage.WithEndpoint(cfg.S3Endpoint))
	}

	if cfg.AWSAccessKeyID != "" && cfg.AWSSecretAccessKey != "" {
		options = append(options, s3storage.WithCredentials(
			cfg.AWSAccessKeyID,
			cfg.AWSSecretAccessKey,
			cfg.AWSSessionToken,
		))
	}

	if cfg.S3StorageBaseDir != "" {
		options = append(options, s3storage.WithBaseDir(cfg.S3StorageBaseDir))
	}

	options = append(options, s3storage.WithForcePathStyle(cfg.S3ForcePathStyle))

	return s3storage.New(cfg.S3StorageBucket, options...)
}

// GetStorage returns the current storage instance.
// When not yet configured (e.g. a fresh install), it attempts a one-time lazy
// load from the registry so new storage config takes effect on the next request
// without waiting for the 30s sync tick.
func (p *Provider) GetStorage() storage.Storage {
	p.mutex.RLock()
	if p.configured {
		defer p.mutex.RUnlock()
		return p.currentStorage
	}
	p.mutex.RUnlock()

	// Not configured yet — try to load from registry (lazy init for first-time setup).
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
		p.configured = true
		p.configKey = storageConfigKey(cfg)
		p.logger.Info("Storage initialized successfully", zap.String("type", cfg.StorageType))
		return nil
	}

	// Env config failed, check if we should enable lazy loading
	if p.isStorageConfiguredInRegistry() {
		// Registry has config - set up for lazy loading
		p.currentStorage = noopstorage.New()
		p.configured = false
		p.logger.Info("Storage will be lazy loaded from registry")
	} else {
		// No config anywhere - use NoOp
		p.currentStorage = noopstorage.New()
		p.configured = false
		p.logger.Info("No storage configuration found, using NoOp storage")
	}

	return nil
}

// ReloadFromRegistry forces a reload of storage configuration from registry.
// Called by the background sync loop every 30 seconds so all replicas pick up
// admin-UI config changes without a restart.
//
// If the config fingerprint is identical to what is already loaded, the call
// is a complete no-op (no log, no allocation) — so frequent polling is safe.
func (p *Provider) ReloadFromRegistry() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	// Check if storage is configured in registry
	if !p.isStorageConfiguredInRegistry() {
		// Only log the first time we discover there's no config.
		if p.configKey != "" {
			p.logger.Info("No storage configuration found in registry, keeping NoOp storage")
			p.configKey = ""
		}
		return nil
	}

	// Build the candidate config from the registry.
	cfg, err := p.buildConfigFromRegistry()
	if err != nil {
		return fmt.Errorf("failed to build config from registry: %w", err)
	}

	// Skip if the config hasn't changed — common case during steady-state operation.
	newKey := storageConfigKey(cfg)
	if newKey == p.configKey {
		return nil
	}

	s, err := p.NewStorageFromConfig(cfg)
	if err != nil {
		return fmt.Errorf("failed to create storage from registry config: %w", err)
	}

	p.currentStorage = s
	p.configured = true
	p.configKey = newKey
	p.logger.Info("Storage reloaded from registry", zap.String("type", cfg.StorageType))

	return nil
}

// loadStorageFromRegistry attempts to load storage configuration from registry (lazy init)
func (p *Provider) loadStorageFromRegistry() storage.Storage {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.configured {
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
	p.configured = true
	p.configKey = storageConfigKey(cfg)
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
		cfg.AWSRegion = result.Value
	}

	if result := resultMap["config.s3_storage_endpoint"]; result.Exists {
		cfg.S3Endpoint = result.Value
	}

	if result := resultMap["config.s3_storage_force_path_style"]; result.Exists {
		forcePathStyle, err := strconv.ParseBool(result.Value)
		if err != nil {
			return fmt.Errorf("invalid s3 force path style value: %w", err)
		}
		cfg.S3ForcePathStyle = forcePathStyle
	}

	if result := resultMap["config.s3_storage_access_key_id"]; result.Exists {
		cfg.AWSAccessKeyID = result.Value
	}

	if result := resultMap["config.s3_storage_secret_access_key"]; result.Exists {
		cfg.AWSSecretAccessKey = result.Value
	}

	if result := resultMap["config.s3_storage_session_token"]; result.Exists {
		cfg.AWSSessionToken = result.Value
	}

	if result := resultMap["config.s3_storage_base_dir"]; result.Exists {
		cfg.S3StorageBaseDir = result.Value
	}

	return nil
}
