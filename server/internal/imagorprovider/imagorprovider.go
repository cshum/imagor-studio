package imagorprovider

import (
	"context"
	"crypto/sha1"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor/imagorpath"
	"github.com/cshum/imagor/storage/filestorage"
	"github.com/cshum/imagor/storage/s3storage"
	"go.uber.org/zap"
)

// ImagorState represents the current state of imagor configuration
type ImagorState string

const (
	ImagorStateDisabled   ImagorState = "disabled"
	ImagorStateConfigured ImagorState = "configured"
)

// ImagorConfig holds imagor configuration
type ImagorConfig struct {
	Mode      string // "external", "embedded", "disabled"
	BaseURL   string // External URL or "/imagor" for embedded
	Secret    string // Secret key for URL signing
	Unsafe    bool   // Enable unsafe URLs for development
	CachePath string // Cache directory path (empty = no caching)
}

// Provider handles imagor configuration with state management
type Provider struct {
	logger          *zap.Logger
	registryStore   registrystore.Store
	config          *config.Config
	storageProvider *storageprovider.Provider
	currentConfig   *ImagorConfig
	imagorHandler   http.Handler // For embedded mode
	imagorState     ImagorState
	configLoadedAt  int64 // Unix milliseconds when config was loaded
	mutex           sync.RWMutex
}

// New creates a new imagor provider
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config, storageProvider *storageprovider.Provider) *Provider {
	return &Provider{
		logger:          logger,
		registryStore:   registryStore,
		config:          cfg,
		storageProvider: storageProvider,
		imagorState:     ImagorStateDisabled,
		configLoadedAt:  time.Now().UnixMilli(),
		mutex:           sync.RWMutex{},
	}
}

// GetConfig returns the current imagor configuration
func (p *Provider) GetConfig() *ImagorConfig {
	p.mutex.RLock()
	if p.imagorState == ImagorStateConfigured {
		defer p.mutex.RUnlock()
		return p.currentConfig
	}
	p.mutex.RUnlock()

	// For disabled state, check registry once and try to configure
	return p.loadConfigFromRegistry()
}

// GetHandler returns the HTTP handler for embedded mode (nil for external/disabled)
func (p *Provider) GetHandler() http.Handler {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	if p.imagorState == ImagorStateConfigured &&
		p.currentConfig != nil &&
		p.currentConfig.Mode == "embedded" {
		return p.imagorHandler
	}
	return nil
}

// InitializeWithConfig initializes imagor with the given configuration
func (p *Provider) InitializeWithConfig(cfg *config.Config) error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	// Check if imagor is configured in registry
	if p.isImagorConfiguredInRegistry() {
		imagorConfig, err := p.buildConfigFromRegistry()
		if err != nil {
			p.logger.Warn("Failed to create imagor config from registry, using disabled state", zap.Error(err))
			p.currentConfig = &ImagorConfig{Mode: "disabled"}
			p.imagorState = ImagorStateDisabled
			return nil
		}

		// Create embedded handler if needed
		if imagorConfig.Mode == "embedded" {
			handler, err := p.createEmbeddedHandler(imagorConfig)
			if err != nil {
				p.logger.Warn("Failed to create embedded imagor handler, using disabled state", zap.Error(err))
				p.currentConfig = &ImagorConfig{Mode: "disabled"}
				p.imagorState = ImagorStateDisabled
				return nil
			}
			p.imagorHandler = handler
		}

		p.currentConfig = imagorConfig
		p.imagorState = ImagorStateConfigured
		p.configLoadedAt = time.Now().UnixMilli()
		p.logger.Info("Imagor initialized successfully", zap.String("mode", imagorConfig.Mode))
	} else {
		// Use config from startup flags/env
		imagorConfig := &ImagorConfig{
			Mode:    cfg.ImagorMode,
			BaseURL: cfg.ImagorURL,
			Secret:  cfg.ImagorSecret,
			Unsafe:  cfg.ImagorUnsafe,
		}

		// Adjust base URL for embedded mode
		if imagorConfig.Mode == "embedded" {
			imagorConfig.BaseURL = "/imagor"
			handler, err := p.createEmbeddedHandler(imagorConfig)
			if err != nil {
				p.logger.Warn("Failed to create embedded imagor handler, using disabled state", zap.Error(err))
				imagorConfig.Mode = "disabled"
			} else {
				p.imagorHandler = handler
			}
		}

		p.currentConfig = imagorConfig
		if imagorConfig.Mode == "disabled" {
			p.imagorState = ImagorStateDisabled
		} else {
			p.imagorState = ImagorStateConfigured
		}
		p.configLoadedAt = time.Now().UnixMilli()
		p.logger.Info("Imagor initialized from config", zap.String("mode", imagorConfig.Mode))
	}

	return nil
}

// IsRestartRequired checks if a restart is required due to imagor configuration changes
func (p *Provider) IsRestartRequired() bool {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	if p.imagorState == ImagorStateDisabled {
		return false // No restart needed for first-time setup
	}

	ctx := context.Background()
	result := registryutil.GetEffectiveValue(ctx, p.registryStore, p.config, "config.imagor_config_updated_at")
	if !result.Exists {
		return false
	}

	configUpdatedAt, err := strconv.ParseInt(result.Value, 10, 64)
	if err != nil {
		return false
	}

	return configUpdatedAt > p.configLoadedAt
}

// ReloadFromRegistry forces a reload of imagor configuration from registry
func (p *Provider) ReloadFromRegistry() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	// Check if imagor is configured in registry
	if !p.isImagorConfiguredInRegistry() {
		p.logger.Info("No imagor configuration found in registry, keeping disabled state")
		return nil
	}

	// Try to create config from registry configuration
	imagorConfig, err := p.buildConfigFromRegistry()
	if err != nil {
		return fmt.Errorf("failed to build imagor config from registry: %w", err)
	}

	// Create embedded handler if needed
	if imagorConfig.Mode == "embedded" {
		handler, err := p.createEmbeddedHandler(imagorConfig)
		if err != nil {
			return fmt.Errorf("failed to create embedded imagor handler: %w", err)
		}
		p.imagorHandler = handler
	} else {
		p.imagorHandler = nil
	}

	p.currentConfig = imagorConfig
	p.imagorState = ImagorStateConfigured
	p.configLoadedAt = time.Now().UnixMilli()
	p.logger.Info("Imagor reloaded from registry", zap.String("mode", imagorConfig.Mode))

	return nil
}

// loadConfigFromRegistry attempts to load imagor configuration from registry
func (p *Provider) loadConfigFromRegistry() *ImagorConfig {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.imagorState == ImagorStateConfigured {
		return p.currentConfig
	}

	// Check if imagor is now configured in registry
	if !p.isImagorConfiguredInRegistry() {
		return p.currentConfig // Still disabled
	}

	// Try to create config from registry configuration
	imagorConfig, err := p.buildConfigFromRegistry()
	if err != nil {
		p.logger.Error("Failed to build imagor config from registry", zap.Error(err))
		return p.currentConfig
	}

	// Create embedded handler if needed
	if imagorConfig.Mode == "embedded" {
		handler, err := p.createEmbeddedHandler(imagorConfig)
		if err != nil {
			p.logger.Error("Failed to create embedded imagor handler", zap.Error(err))
			return p.currentConfig
		}
		p.imagorHandler = handler
	}

	p.currentConfig = imagorConfig
	p.imagorState = ImagorStateConfigured
	p.configLoadedAt = time.Now().UnixMilli()
	p.logger.Info("Imagor configured from registry", zap.String("mode", imagorConfig.Mode))

	return p.currentConfig
}

// isImagorConfiguredInRegistry checks if imagor is configured in the registry
func (p *Provider) isImagorConfiguredInRegistry() bool {
	ctx := context.Background()
	result := registryutil.GetEffectiveValue(ctx, p.registryStore, p.config, "config.imagor_configured")
	return result.Exists && result.Value == "true"
}

// buildConfigFromRegistry builds an imagor config object from registry values
func (p *Provider) buildConfigFromRegistry() (*ImagorConfig, error) {
	ctx := context.Background()

	// Get all imagor configuration keys in one batch call
	results := registryutil.GetEffectiveValues(ctx, p.registryStore, p.config,
		"config.imagor_mode",
		"config.imagor_base_url",
		"config.imagor_secret",
		"config.imagor_unsafe",
		"config.imagor_cache_path")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Get imagor mode
	modeResult := resultMap["config.imagor_mode"]
	if !modeResult.Exists {
		return nil, fmt.Errorf("imagor mode not found in registry")
	}

	imagorConfig := &ImagorConfig{
		Mode: modeResult.Value,
	}

	// Set base URL and default cache path based on mode
	if imagorConfig.Mode == "embedded" {
		imagorConfig.BaseURL = "/imagor"
		imagorConfig.CachePath = ".imagor-cache" // Default for embedded
	} else if baseURLResult := resultMap["config.imagor_base_url"]; baseURLResult.Exists {
		imagorConfig.BaseURL = baseURLResult.Value
		// No default cache for external mode
	} else {
		imagorConfig.BaseURL = "http://localhost:8000" // Default for external
	}

	// Override cache path if explicitly configured
	if cachePathResult := resultMap["config.imagor_cache_path"]; cachePathResult.Exists {
		imagorConfig.CachePath = cachePathResult.Value
	}

	// Get secret
	if secretResult := resultMap["config.imagor_secret"]; secretResult.Exists {
		imagorConfig.Secret = secretResult.Value
	}

	// Get unsafe flag
	if unsafeResult := resultMap["config.imagor_unsafe"]; unsafeResult.Exists {
		if unsafe, err := strconv.ParseBool(unsafeResult.Value); err == nil {
			imagorConfig.Unsafe = unsafe
		}
	}

	return imagorConfig, nil
}

// GenerateURL generates an imagor URL for the given image path and parameters
func (p *Provider) GenerateURL(imagePath string, params imagorpath.Params) (string, error) {
	// Get current imagor configuration
	cfg := p.GetConfig()
	if cfg == nil || cfg.Mode == "disabled" {
		// Return direct file URL without processing when disabled
		return fmt.Sprintf("/api/file/%s", url.PathEscape(imagePath)), nil
	}

	// Set the image path in params
	params.Image = imagePath

	// Generate path using imagorpath
	var path string
	if cfg.Unsafe {
		path = imagorpath.GenerateUnsafe(params)
	} else {
		// Generate signed path
		if cfg.Secret == "" {
			return "", fmt.Errorf("imagor secret is required for signed URLs")
		}
		signer := imagorpath.NewDefaultSigner(cfg.Secret)
		path = imagorpath.Generate(params, signer)
	}

	// Combine with base URL
	if cfg.BaseURL == "/imagor" {
		// Embedded mode - relative path
		return fmt.Sprintf("%s/%s", cfg.BaseURL, path), nil
	} else {
		// External mode - full URL
		return fmt.Sprintf("%s/%s", cfg.BaseURL, path), nil
	}
}

// createEmbeddedHandler creates an embedded imagor handler
func (p *Provider) createEmbeddedHandler(cfg *ImagorConfig) (http.Handler, error) {
	options := []imagor.Option{
		imagor.WithUnsafe(cfg.Unsafe),
	}

	// Add signer if secret is provided
	if cfg.Secret != "" {
		alg := sha1.New // Default to SHA1 like imagor
		signer := imagorpath.NewHMACSigner(alg, 0, cfg.Secret)
		options = append(options, imagor.WithSigner(signer))
	}

	// Configure storage based on current storage provider
	if storageOptions := p.buildStorageOptions(cfg); len(storageOptions) > 0 {
		options = append(options, storageOptions...)
	}

	app := imagor.New(options...)
	return app, nil
}

// buildStorageOptions creates imagor storage options based on current storage provider configuration
func (p *Provider) buildStorageOptions(cfg *ImagorConfig) []imagor.Option {
	// Get current storage configuration from storage provider
	storageConfig := p.getStorageConfig()
	if storageConfig == nil {
		p.logger.Warn("No storage configuration available for imagor")
		return nil
	}

	var options []imagor.Option

	switch storageConfig.StorageType {
	case "file", "filesystem":
		// Create imagor file storage as LOADER only
		fileStorage := filestorage.New(
			storageConfig.FileBaseDir,
			filestorage.WithMkdirPermission(storageConfig.FileMkdirPermissions.String()),
			filestorage.WithWritePermission(storageConfig.FileWritePermissions.String()),
		)
		options = append(options, imagor.WithLoaders(fileStorage))

		// Add result storage only if cache path is configured
		if cfg.CachePath != "" {
			cacheStorage := filestorage.New(
				filepath.Join(storageConfig.FileBaseDir, cfg.CachePath),
				filestorage.WithMkdirPermission(storageConfig.FileMkdirPermissions.String()),
				filestorage.WithWritePermission(storageConfig.FileWritePermissions.String()),
			)
			options = append(options, imagor.WithResultStorages(cacheStorage))
		}

	case "s3":
		// Create imagor S3 storage as LOADER only
		awsConfig := p.buildAWSConfig(storageConfig)
		if awsConfig == nil {
			p.logger.Error("Failed to build AWS config for imagor S3 storage")
			return nil
		}

		s3Storage := s3storage.New(*awsConfig, storageConfig.S3Bucket,
			s3storage.WithBaseDir(storageConfig.S3BaseDir),
			s3storage.WithEndpoint(storageConfig.S3Endpoint),
			s3storage.WithForcePathStyle(storageConfig.S3ForcePathStyle),
		)
		options = append(options, imagor.WithLoaders(s3Storage))

		// Add result storage only if cache path is configured
		if cfg.CachePath != "" {
			cacheBaseDir := filepath.Join(storageConfig.S3BaseDir, cfg.CachePath)
			cacheStorage := s3storage.New(*awsConfig, storageConfig.S3Bucket,
				s3storage.WithBaseDir(cacheBaseDir),
				s3storage.WithEndpoint(storageConfig.S3Endpoint),
				s3storage.WithForcePathStyle(storageConfig.S3ForcePathStyle),
			)
			options = append(options, imagor.WithResultStorages(cacheStorage))
		}

	default:
		p.logger.Warn("Unsupported storage type for imagor", zap.String("type", storageConfig.StorageType))
		return nil
	}

	return options
}

// getStorageConfig gets the current storage configuration from storage provider
func (p *Provider) getStorageConfig() *config.Config {
	if p.storageProvider == nil {
		return nil
	}

	// Get current storage from provider
	storage := p.storageProvider.GetStorage()
	if storage == nil {
		return nil
	}

	// We need to extract the configuration from the storage provider
	// For now, we'll use a simple approach by checking the storage provider's internal config
	// This is a bit of a hack, but it works for our use case

	// Try to get storage configuration by checking if storage is configured
	ctx := context.Background()
	storageConfigured := registryutil.GetEffectiveValue(ctx, p.registryStore, p.config, "config.storage_configured")
	if !storageConfigured.Exists || storageConfigured.Value != "true" {
		// Fall back to using the original config
		return p.config
	}

	// Build storage config from registry (similar to storage provider's logic)
	return p.buildStorageConfigFromRegistry()
}

// buildStorageConfigFromRegistry builds storage configuration from registry
func (p *Provider) buildStorageConfigFromRegistry() *config.Config {
	ctx := context.Background()
	cfg := &config.Config{}

	// Get all possible storage configuration keys in one batch call
	results := registryutil.GetEffectiveValues(ctx, p.registryStore, p.config,
		"config.storage_type",
		// File storage keys
		"config.file_base_dir",
		"config.file_mkdir_permissions",
		"config.file_write_permissions",
		// S3 storage keys
		"config.s3_bucket",
		"config.s3_region",
		"config.s3_endpoint",
		"config.s3_force_path_style",
		"config.s3_access_key_id",
		"config.s3_secret_access_key",
		"config.s3_session_token",
		"config.s3_base_dir")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Get storage type
	storageTypeResult := resultMap["config.storage_type"]
	if !storageTypeResult.Exists {
		return p.config // Fall back to original config
	}
	cfg.StorageType = storageTypeResult.Value

	// Load type-specific configuration
	switch cfg.StorageType {
	case "file", "filesystem":
		p.loadFileConfigFromResults(resultMap, cfg)
	case "s3":
		p.loadS3ConfigFromResults(resultMap, cfg)
	}

	return cfg
}

// loadFileConfigFromResults loads file storage configuration from pre-fetched results
func (p *Provider) loadFileConfigFromResults(resultMap map[string]registryutil.EffectiveValueResult, cfg *config.Config) {
	if result := resultMap["config.file_base_dir"]; result.Exists {
		cfg.FileBaseDir = result.Value
	} else {
		cfg.FileBaseDir = "./storage" // Default
	}

	if result := resultMap["config.file_mkdir_permissions"]; result.Exists {
		if perm, err := strconv.ParseUint(result.Value, 8, 32); err == nil {
			cfg.FileMkdirPermissions = os.FileMode(perm)
		}
	} else {
		cfg.FileMkdirPermissions = 0755 // Default
	}

	if result := resultMap["config.file_write_permissions"]; result.Exists {
		if perm, err := strconv.ParseUint(result.Value, 8, 32); err == nil {
			cfg.FileWritePermissions = os.FileMode(perm)
		}
	} else {
		cfg.FileWritePermissions = 0644 // Default
	}
}

// loadS3ConfigFromResults loads S3 storage configuration from pre-fetched results
func (p *Provider) loadS3ConfigFromResults(resultMap map[string]registryutil.EffectiveValueResult, cfg *config.Config) {
	if result := resultMap["config.s3_bucket"]; result.Exists {
		cfg.S3Bucket = result.Value
	}

	if result := resultMap["config.s3_region"]; result.Exists {
		cfg.S3Region = result.Value
	}

	if result := resultMap["config.s3_endpoint"]; result.Exists {
		cfg.S3Endpoint = result.Value
	}

	if result := resultMap["config.s3_force_path_style"]; result.Exists {
		if forcePathStyle, err := strconv.ParseBool(result.Value); err == nil {
			cfg.S3ForcePathStyle = forcePathStyle
		}
	}

	if result := resultMap["config.s3_access_key_id"]; result.Exists {
		cfg.S3AccessKeyID = result.Value
	}

	if result := resultMap["config.s3_secret_access_key"]; result.Exists {
		cfg.S3SecretAccessKey = result.Value
	}

	if result := resultMap["config.s3_session_token"]; result.Exists {
		cfg.S3SessionToken = result.Value
	}

	if result := resultMap["config.s3_base_dir"]; result.Exists {
		cfg.S3BaseDir = result.Value
	}
}

// buildAWSConfig creates AWS configuration from storage settings
func (p *Provider) buildAWSConfig(storageConfig *config.Config) *aws.Config {
	ctx := context.Background()

	// Start with default config
	cfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		p.logger.Error("Failed to load default AWS config", zap.Error(err))
		return nil
	}

	// Set region if provided
	if storageConfig.S3Region != "" {
		cfg.Region = storageConfig.S3Region
	}

	// Set credentials if provided
	if storageConfig.S3AccessKeyID != "" && storageConfig.S3SecretAccessKey != "" {
		cfg.Credentials = credentials.NewStaticCredentialsProvider(
			storageConfig.S3AccessKeyID,
			storageConfig.S3SecretAccessKey,
			storageConfig.S3SessionToken,
		)
	}

	return &cfg
}
