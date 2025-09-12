package imagorprovider

import (
	"context"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"fmt"
	"hash"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
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
	"github.com/cshum/imagor/processor/vipsprocessor"
	"github.com/cshum/imagor/storage/filestorage"
	"github.com/cshum/imagor/storage/s3storage"
	"go.uber.org/zap"
)

// ImagorState represents the current state of imagor configuration
type ImagorState string

const (
	ImagorStateConfigured ImagorState = "configured"
)

// ImagorConfig holds imagor configuration
type ImagorConfig struct {
	Mode           string // "external", "embedded", "disabled"
	BaseURL        string // External URL or "/imagor" for embedded
	Secret         string // Secret key for URL signing
	Unsafe         bool   // Enable unsafe URLs for development
	CachePath      string // Cache directory path (empty = no caching)
	SignerType     string // Hash algorithm: "sha1", "sha256", "sha512" (for external mode)
	SignerTruncate int    // Signature truncation length (for external mode)
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
		imagorState:     ImagorStateConfigured, // Always start as configured
		configLoadedAt:  time.Now().UnixMilli(),
		mutex:           sync.RWMutex{},
	}
}

// createDefaultEmbeddedConfig creates a default embedded mode configuration
func createDefaultEmbeddedConfig(cfg *config.Config) *ImagorConfig {
	return &ImagorConfig{
		Mode:           "embedded",
		BaseURL:        "/imagor",
		Secret:         cfg.JWTSecret,   // Default to JWT secret (configurable)
		Unsafe:         false,           // Always false (fixed)
		CachePath:      ".imagor-cache", // Default (configurable)
		SignerType:     "sha256",        // Fixed: always SHA256
		SignerTruncate: 28,              // Fixed: always 28-char truncation
	}
}

// GetConfig returns the current imagor configuration
func (p *Provider) GetConfig() *ImagorConfig {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.currentConfig
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

	// Try to load from registry first
	imagorConfig, err := p.buildConfigFromRegistry()
	if err != nil || imagorConfig.Mode == "" {
		// No valid registry config, check startup config or default to embedded
		if cfg.ImagorMode == "" {
			// Default to embedded mode
			imagorConfig = createDefaultEmbeddedConfig(cfg)
			p.logger.Info("Imagor defaulted to embedded mode")
		} else {
			// Use startup config
			imagorConfig = &ImagorConfig{
				Mode:    cfg.ImagorMode,
				BaseURL: cfg.ImagorURL,
				Secret:  cfg.ImagorSecret,
				Unsafe:  cfg.ImagorUnsafe,
			}

			// Adjust base URL for embedded mode
			if imagorConfig.Mode == "embedded" {
				imagorConfig.BaseURL = "/imagor"
			}

			p.logger.Info("Imagor initialized from startup config", zap.String("mode", imagorConfig.Mode))
		}
	} else {
		p.logger.Info("Imagor initialized from registry", zap.String("mode", imagorConfig.Mode))
	}
	// Create embedded handler if needed
	if imagorConfig.Mode == "embedded" {
		handler, err := p.createEmbeddedHandler(imagorConfig)
		if err != nil {
			return fmt.Errorf("failed to create embedded imagor handler: %w", err)
		}
		p.imagorHandler = handler
	}

	p.currentConfig = imagorConfig
	p.imagorState = ImagorStateConfigured
	p.configLoadedAt = time.Now().UnixMilli()

	return nil
}

// IsRestartRequired checks if a restart is required due to imagor configuration changes
func (p *Provider) IsRestartRequired() bool {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

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

	// Try to create config from registry configuration
	imagorConfig, err := p.buildConfigFromRegistry()
	if err != nil || imagorConfig.Mode == "" {
		// No valid registry config, default to embedded mode
		imagorConfig = createDefaultEmbeddedConfig(p.config)
		p.logger.Info("No imagor configuration found in registry, defaulting to embedded mode")
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

	// Try to create config from registry configuration
	imagorConfig, err := p.buildConfigFromRegistry()
	if err != nil || imagorConfig.Mode == "" {
		// No valid registry config, default to embedded mode
		imagorConfig = createDefaultEmbeddedConfig(p.config)
		p.logger.Info("No imagor configuration found in registry, defaulting to embedded mode")
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

// buildConfigFromRegistry builds an imagor config object from registry values
func (p *Provider) buildConfigFromRegistry() (*ImagorConfig, error) {
	ctx := context.Background()

	// Get all imagor configuration keys in one batch call
	results := registryutil.GetEffectiveValues(ctx, p.registryStore, p.config,
		"config.imagor_mode",
		"config.imagor_base_url",
		"config.imagor_secret",
		"config.imagor_unsafe",
		"config.imagor_cache_path",
		"config.imagor_signer_type",
		"config.imagor_signer_truncate")

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

	if imagorConfig.Mode == "embedded" {
		// Embedded mode: Simple configuration with fixed secure defaults
		imagorConfig.BaseURL = "/imagor"
		imagorConfig.Unsafe = false        // Fixed: always false
		imagorConfig.SignerType = "sha256" // Fixed: always SHA256
		imagorConfig.SignerTruncate = 28   // Fixed: always 28-char truncation

		// Configurable: Secret (defaults to JWT secret)
		if secretResult := resultMap["config.imagor_secret"]; secretResult.Exists {
			imagorConfig.Secret = secretResult.Value
		} else {
			imagorConfig.Secret = p.config.JWTSecret // Default to JWT secret
		}

		// Configurable: Cache path (defaults to ".imagor-cache", empty = no cache)
		if cachePathResult := resultMap["config.imagor_cache_path"]; cachePathResult.Exists {
			imagorConfig.CachePath = cachePathResult.Value // Could be empty string for no cache
		} else {
			imagorConfig.CachePath = ".imagor-cache" // Default
		}

	} else {
		// External mode: Fully configurable

		// Base URL
		if baseURLResult := resultMap["config.imagor_base_url"]; baseURLResult.Exists {
			imagorConfig.BaseURL = baseURLResult.Value
		} else {
			imagorConfig.BaseURL = "http://localhost:8000" // Default for external
		}

		// Secret
		if secretResult := resultMap["config.imagor_secret"]; secretResult.Exists {
			imagorConfig.Secret = secretResult.Value
		}

		// Unsafe flag
		if unsafeResult := resultMap["config.imagor_unsafe"]; unsafeResult.Exists {
			if unsafe, err := strconv.ParseBool(unsafeResult.Value); err == nil {
				imagorConfig.Unsafe = unsafe
			}
		}

		// Signer type (defaults to SHA1 for external)
		if signerTypeResult := resultMap["config.imagor_signer_type"]; signerTypeResult.Exists {
			imagorConfig.SignerType = signerTypeResult.Value
		} else {
			imagorConfig.SignerType = "sha1" // Default for external
		}

		// Signer truncate (defaults to 0 for external)
		if signerTruncateResult := resultMap["config.imagor_signer_truncate"]; signerTruncateResult.Exists {
			if truncate, err := strconv.Atoi(signerTruncateResult.Value); err == nil {
				imagorConfig.SignerTruncate = truncate
			}
		} else {
			imagorConfig.SignerTruncate = 0 // Default for external (no truncation)
		}

		// External mode has no cache path
		imagorConfig.CachePath = ""
	}

	return imagorConfig, nil
}

// getHashAlgorithm returns the hash algorithm function based on signer type
func getHashAlgorithm(signerType string) func() hash.Hash {
	switch strings.ToLower(signerType) {
	case "sha256":
		return sha256.New
	case "sha512":
		return sha512.New
	default:
		return sha1.New // default
	}
}

// GenerateURL generates an imagor URL for the given image path and parameters
func (p *Provider) GenerateURL(imagePath string, params imagorpath.Params) (string, error) {
	// Get current imagor configuration
	cfg := p.GetConfig()
	if cfg == nil {
		return "", fmt.Errorf("imagor configuration not available")
	}

	// Set the image path in params
	params.Image = imagePath

	// Generate path using imagorpath
	var path string
	var signer imagorpath.Signer

	if cfg.Mode == "embedded" {
		// For embedded mode, use fixed SHA256 + 28-char truncation with configurable secret
		secret := cfg.Secret
		if secret == "" {
			secret = p.config.JWTSecret
		}
		if secret != "" {
			// Use fixed signer for embedded mode: SHA256 + 28-char truncation
			signer = imagorpath.NewHMACSigner(sha256.New, 28, secret)
			path = imagorpath.Generate(params, signer)
		} else {
			return "", fmt.Errorf("imagor secret is required for embedded mode")
		}
	} else if cfg.Secret != "" {
		// Use configurable signer for external mode
		hashAlg := getHashAlgorithm(cfg.SignerType)
		signer = imagorpath.NewHMACSigner(hashAlg, cfg.SignerTruncate, cfg.Secret)
		path = imagorpath.Generate(params, signer)
	} else if cfg.Unsafe {
		path = imagorpath.GenerateUnsafe(params)
	} else {
		return "", fmt.Errorf("imagor secret is required for signed URLs")
	}

	// Combine with base URL
	return fmt.Sprintf("%s/%s", cfg.BaseURL, path), nil
}

// createEmbeddedHandler creates an embedded imagor handler
func (p *Provider) createEmbeddedHandler(cfg *ImagorConfig) (http.Handler, error) {
	var options []imagor.Option

	// Add vipsprocessor with default configuration
	options = append(options, imagor.WithProcessors(
		vipsprocessor.NewProcessor(
			vipsprocessor.WithLogger(p.logger),
		),
	))

	// Use server's JWT secret with SHA256 and 28-char truncation
	if p.config.JWTSecret != "" {
		signer := imagorpath.NewHMACSigner(sha256.New, 28, p.config.JWTSecret)
		options = append(options, imagor.WithSigner(signer))
	}

	// Add modified time check if caching is enabled
	if cfg.CachePath != "" {
		options = append(options, imagor.WithModifiedTimeCheck(true))
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
		// Create imagor file storage as LOADER only with custom SafeChars for Unicode handling
		fileStorageOptions := []filestorage.Option{
			filestorage.WithMkdirPermission(storageConfig.FileMkdirPermissions.String()),
			filestorage.WithWritePermission(storageConfig.FileWritePermissions.String()),
			filestorage.WithSafeChars("--"),
		}

		// Use custom SafeChars for embedded mode to handle Unicode characters
		if cfg.Mode == "embedded" {
			fileStorageOptions = append(fileStorageOptions,
				filestorage.WithSafeChars("--"), // Use no-op SafeChars to preserve Unicode
			)
		}

		fileStorage := filestorage.New(
			storageConfig.FileBaseDir,
			fileStorageOptions...,
		)
		options = append(options, imagor.WithLoaders(fileStorage))

		// Add result storage only if cache path is configured
		if cfg.CachePath != "" {
			cacheStorageOptions := []filestorage.Option{
				filestorage.WithMkdirPermission(storageConfig.FileMkdirPermissions.String()),
				filestorage.WithWritePermission(storageConfig.FileWritePermissions.String()),
			}
			cacheStorage := filestorage.New(
				filepath.Join(storageConfig.FileBaseDir, cfg.CachePath),
				cacheStorageOptions...,
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
			s3storage.WithSafeChars("--"),
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
