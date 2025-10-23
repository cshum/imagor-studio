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
	"github.com/cshum/imagorvideo"
	"go.uber.org/zap"
)

// ImagorMode represents the imagor operation mode
type ImagorMode string

const (
	ImagorModeEmbedded ImagorMode = "embedded"
	ImagorModeExternal ImagorMode = "external"
)

// String returns the string representation of the mode
func (m ImagorMode) String() string {
	return string(m)
}

// ImagorConfig holds imagor configuration
type ImagorConfig struct {
	Mode           ImagorMode // embedded or external
	BaseURL        string     // External URL or "/imagor" for embedded
	Secret         string     // Secret key for URL signing
	Unsafe         bool       // Enable unsafe URLs for development
	SignerType     string     // Hash algorithm: "sha1", "sha256", "sha512" (for external mode)
	SignerTruncate int        // Signature truncation length (for external mode)
}

// Provider handles imagor configuration with state management
type Provider struct {
	logger          *zap.Logger
	registryStore   registrystore.Store
	config          *config.Config
	storageProvider *storageprovider.Provider
	currentConfig   *ImagorConfig
	imagorHandler   http.Handler   // For embedded mode
	imagorInstance  *imagor.Imagor // For shutdown cleanup
	configLoadedAt  int64          // Unix milliseconds when config was loaded
	mutex           sync.RWMutex
}

// New creates a new imagor provider
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config, storageProvider *storageprovider.Provider) *Provider {
	return &Provider{
		logger:          logger,
		registryStore:   registryStore,
		config:          cfg,
		storageProvider: storageProvider,
		configLoadedAt:  time.Now().UnixMilli(),
		mutex:           sync.RWMutex{},
	}
}

// createDefaultEmbeddedConfig creates a default embedded mode configuration
func createDefaultEmbeddedConfig(cfg *config.Config) *ImagorConfig {
	// Use enriched config values (CLI/ENV/registry) with safe defaults as fallback
	secret := cfg.ImagorSecret
	if secret == "" {
		secret = cfg.JWTSecret // Fallback to JWT secret if no imagor secret provided
	}

	signerType := cfg.ImagorSignerType
	if signerType == "" {
		signerType = "sha256" // Safe default
	}

	signerTruncate := cfg.ImagorSignerTruncate
	if signerTruncate == 0 {
		signerTruncate = 32 // Safe default
	}

	return &ImagorConfig{
		Mode:           ImagorModeEmbedded,
		BaseURL:        "/imagor",
		Secret:         secret,
		Unsafe:         cfg.ImagorUnsafe, // Use enriched value (respects CLI/ENV)
		SignerType:     signerType,
		SignerTruncate: signerTruncate,
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

	if p.currentConfig != nil && p.currentConfig.Mode == ImagorModeEmbedded {
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
			if strings.ToLower(cfg.ImagorMode) == "embedded" {
				// For embedded mode, use the createDefaultEmbeddedConfig which handles all the configuration
				imagorConfig = createDefaultEmbeddedConfig(cfg)
			} else {
				// For external mode, use the provided values
				imagorConfig = &ImagorConfig{
					Mode:           ImagorMode(strings.ToLower(cfg.ImagorMode)),
					BaseURL:        cfg.ImagorBaseURL,
					Secret:         cfg.ImagorSecret,
					Unsafe:         cfg.ImagorUnsafe,
					SignerType:     cfg.ImagorSignerType,
					SignerTruncate: cfg.ImagorSignerTruncate,
				}
			}

			p.logger.Info("Imagor initialized from startup config", zap.String("mode", imagorConfig.Mode.String()))
		}
	} else {
		p.logger.Info("Imagor initialized from registry", zap.String("mode", imagorConfig.Mode.String()))
	}
	// Create embedded handler if needed
	if imagorConfig.Mode == ImagorModeEmbedded {
		handler, err := p.createEmbeddedHandler(imagorConfig)
		if err != nil {
			return fmt.Errorf("failed to create embedded imagor handler: %w", err)
		}
		p.imagorHandler = handler
	}

	p.currentConfig = imagorConfig
	p.configLoadedAt = time.Now().UnixMilli()

	return nil
}

// IsRestartRequired checks if a restart is required due to imagor configuration changes
func (p *Provider) IsRestartRequired() bool {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	ctx := context.Background()

	// Check both imagor config changes and storage config changes
	results := registryutil.GetEffectiveValues(ctx, p.registryStore, p.config,
		"config.imagor_config_updated_at",
		"config.storage_config_updated_at")

	for _, result := range results {
		if !result.Exists {
			continue
		}

		configUpdatedAt, err := strconv.ParseInt(result.Value, 10, 64)
		if err != nil {
			continue
		}

		if configUpdatedAt > p.configLoadedAt {
			return true
		}
	}

	return false
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
	if imagorConfig.Mode == ImagorModeEmbedded {
		handler, err := p.createEmbeddedHandler(imagorConfig)
		if err != nil {
			return fmt.Errorf("failed to create embedded imagor handler: %w", err)
		}
		p.imagorHandler = handler
	} else {
		p.imagorHandler = nil
	}

	p.currentConfig = imagorConfig
	p.configLoadedAt = time.Now().UnixMilli()
	p.logger.Info("Imagor reloaded from registry", zap.String("mode", imagorConfig.Mode.String()))

	return nil
}

// loadConfigFromRegistry attempts to load imagor configuration from registry
func (p *Provider) loadConfigFromRegistry() *ImagorConfig {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.currentConfig != nil {
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
	if imagorConfig.Mode == ImagorModeEmbedded {
		handler, err := p.createEmbeddedHandler(imagorConfig)
		if err != nil {
			p.logger.Error("Failed to create embedded imagor handler", zap.Error(err))
			return p.currentConfig
		}
		p.imagorHandler = handler
	}

	p.currentConfig = imagorConfig
	p.configLoadedAt = time.Now().UnixMilli()
	p.logger.Info("Imagor configured from registry", zap.String("mode", imagorConfig.Mode.String()))

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
		Mode: ImagorMode(modeResult.Value),
	}

	if imagorConfig.Mode == ImagorModeEmbedded {
		// Embedded mode: Simple configuration with fixed secure defaults
		imagorConfig.BaseURL = "/imagor"
		imagorConfig.Unsafe = false              // Fixed: always false
		imagorConfig.SignerType = "sha256"       // Fixed: always SHA256
		imagorConfig.SignerTruncate = 32         // Fixed: always 32-char truncation
		imagorConfig.Secret = p.config.JWTSecret // Always use JWT secret (no override)
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

	if cfg.Mode == ImagorModeEmbedded {
		// For embedded mode, use the configured signer settings
		if cfg.Unsafe {
			path = imagorpath.GenerateUnsafe(params)
		} else if cfg.Secret != "" {
			hashAlg := getHashAlgorithm(cfg.SignerType)
			signer = imagorpath.NewHMACSigner(hashAlg, cfg.SignerTruncate, cfg.Secret)
			path = imagorpath.Generate(params, signer)
		} else {
			return "", fmt.Errorf("imagor secret is required for signed URLs")
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

	// Add processors in order: video processor first, then vips processor
	// The video processor will handle video/audio files and forward others to vips
	options = append(options, imagor.WithProcessors(
		imagorvideo.NewProcessor(
			imagorvideo.WithLogger(p.logger),
		),
		vipsprocessor.NewProcessor(
			vipsprocessor.WithLogger(p.logger),
		),
	))

	// Use configurable signer settings for embedded mode
	if cfg.Secret != "" && !cfg.Unsafe {
		hashAlg := getHashAlgorithm(cfg.SignerType)
		signer := imagorpath.NewHMACSigner(hashAlg, cfg.SignerTruncate, cfg.Secret)
		options = append(options, imagor.WithSigner(signer))
	}

	// Configure storage based on current storage provider
	if storageOptions := p.buildStorageOptions(cfg); len(storageOptions) > 0 {
		options = append(options, storageOptions...)
	}

	app := imagor.New(options...)

	// Store the imagor instance for shutdown cleanup
	p.imagorInstance = app

	// Start the imagor instance
	ctx := context.Background()
	if err := app.Startup(ctx); err != nil {
		return nil, fmt.Errorf("failed to start imagor: %w", err)
	}

	return app, nil
}

// Shutdown gracefully shuts down the imagor instance
func (p *Provider) Shutdown(ctx context.Context) error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.imagorInstance != nil {
		p.logger.Debug("Shutting down imagor instance...")
		if err := p.imagorInstance.Shutdown(ctx); err != nil {
			p.logger.Error("Error shutting down imagor", zap.Error(err))
			return err
		}
		p.imagorInstance = nil
		p.logger.Debug("Imagor shutdown completed")
	}

	return nil
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
			filestorage.WithMkdirPermission(storageConfig.FileStorageMkdirPermissions.String()),
			filestorage.WithWritePermission(storageConfig.FileStorageWritePermissions.String()),
			filestorage.WithSafeChars("--"),
		}

		// Use custom SafeChars for embedded mode to handle Unicode characters
		if cfg.Mode == ImagorModeEmbedded {
			fileStorageOptions = append(fileStorageOptions,
				filestorage.WithSafeChars("--"), // Use no-op SafeChars to preserve Unicode
			)
		}

		fileStorage := filestorage.New(
			storageConfig.FileStorageBaseDir,
			fileStorageOptions...,
		)
		options = append(options, imagor.WithLoaders(fileStorage))

	case "s3":
		// Create imagor S3 storage as LOADER only
		awsConfig := p.buildAWSConfig(storageConfig)
		if awsConfig == nil {
			p.logger.Error("Failed to build AWS config for imagor S3 storage")
			return nil
		}

		s3Storage := s3storage.New(*awsConfig, storageConfig.S3StorageBucket,
			s3storage.WithBaseDir(storageConfig.S3StorageBaseDir),
			s3storage.WithEndpoint(storageConfig.S3StorageEndpoint),
			s3storage.WithForcePathStyle(storageConfig.S3StorageForcePathStyle),
			s3storage.WithSafeChars("--"),
		)
		options = append(options, imagor.WithLoaders(s3Storage))

	default:
		p.logger.Warn("Unsupported storage type for imagor", zap.String("type", storageConfig.StorageType))
		return nil
	}

	return options
}

// getStorageConfig gets the current storage configuration directly from registry
func (p *Provider) getStorageConfig() *config.Config {
	// Try to build from registry first
	cfg, err := p.buildStorageConfigFromRegistry()
	if err != nil || cfg.StorageType == "" {
		// Fall back to original config if no valid storage type found
		p.logger.Debug("No valid storage configuration found in registry, using original config", zap.Error(err))
		return p.config
	}

	return cfg
}

// buildStorageConfigFromRegistry builds storage configuration from registry
func (p *Provider) buildStorageConfigFromRegistry() (*config.Config, error) {
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
		return p.config, nil // Fall back to original config
	}
	cfg.StorageType = storageTypeResult.Value

	// Load type-specific configuration
	switch cfg.StorageType {
	case "file", "filesystem":
		p.loadFileConfigFromResults(resultMap, cfg)
	case "s3":
		p.loadS3ConfigFromResults(resultMap, cfg)
	}

	return cfg, nil
}

// loadFileConfigFromResults loads file storage configuration from pre-fetched results
func (p *Provider) loadFileConfigFromResults(resultMap map[string]registryutil.EffectiveValueResult, cfg *config.Config) {
	if result := resultMap["config.file_storage_base_dir"]; result.Exists {
		cfg.FileStorageBaseDir = result.Value
	} else {
		cfg.FileStorageBaseDir = "/app/gallery" // Default
	}

	if result := resultMap["config.file_storage_mkdir_permissions"]; result.Exists {
		if perm, err := strconv.ParseUint(result.Value, 8, 32); err == nil {
			cfg.FileStorageMkdirPermissions = os.FileMode(perm)
		}
	} else {
		cfg.FileStorageMkdirPermissions = 0755 // Default
	}

	if result := resultMap["config.file_storage_write_permissions"]; result.Exists {
		if perm, err := strconv.ParseUint(result.Value, 8, 32); err == nil {
			cfg.FileStorageWritePermissions = os.FileMode(perm)
		}
	} else {
		cfg.FileStorageWritePermissions = 0644 // Default
	}
}

// loadS3ConfigFromResults loads S3 storage configuration from pre-fetched results
func (p *Provider) loadS3ConfigFromResults(resultMap map[string]registryutil.EffectiveValueResult, cfg *config.Config) {
	if result := resultMap["config.s3_storage_bucket"]; result.Exists {
		cfg.S3StorageBucket = result.Value
	}

	if result := resultMap["config.s3_storage_region"]; result.Exists {
		cfg.S3StorageRegion = result.Value
	}

	if result := resultMap["config.s3_storage_endpoint"]; result.Exists {
		cfg.S3StorageEndpoint = result.Value
	}

	if result := resultMap["config.s3_storage_force_path_style"]; result.Exists {
		if forcePathStyle, err := strconv.ParseBool(result.Value); err == nil {
			cfg.S3StorageForcePathStyle = forcePathStyle
		}
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
	if storageConfig.S3StorageRegion != "" {
		cfg.Region = storageConfig.S3StorageRegion
	}

	// Set credentials if provided
	if storageConfig.S3StorageAccessKeyID != "" && storageConfig.S3StorageSecretAccessKey != "" {
		cfg.Credentials = credentials.NewStaticCredentialsProvider(
			storageConfig.S3StorageAccessKeyID,
			storageConfig.S3StorageSecretAccessKey,
			storageConfig.S3StorageSessionToken,
		)
	}

	return &cfg
}
