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

// ImagorConfig holds imagor configuration
type ImagorConfig struct {
	Secret         string // Secret key for URL signing
	Unsafe         bool   // Enable unsafe URLs for development
	SignerType     string // Hash algorithm: "sha1", "sha256", "sha512"
	SignerTruncate int    // Signature truncation length
}

// Provider handles imagor configuration with state management
type Provider struct {
	logger          *zap.Logger
	registryStore   registrystore.Store
	config          *config.Config
	storageProvider *storageprovider.Provider
	currentConfig   *ImagorConfig
	imagorHandler   http.Handler   // Embedded imagor HTTP handler
	imagorInstance  *imagor.Imagor // For shutdown cleanup
	mutex           sync.RWMutex
}

// New creates a new imagor provider
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config, storageProvider *storageprovider.Provider) *Provider {
	return &Provider{
		logger:          logger,
		registryStore:   registryStore,
		config:          cfg,
		storageProvider: storageProvider,
		mutex:           sync.RWMutex{},
	}
}

// buildConfig creates imagor configuration from registry, CLI, or defaults
func (p *Provider) buildConfig() (*ImagorConfig, error) {
	return p.buildConfigFromRegistry()
}

// GetConfig returns the current imagor configuration
func (p *Provider) GetConfig() *ImagorConfig {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.currentConfig
}

// GetHandler returns the HTTP handler for the embedded imagor instance
func (p *Provider) GetHandler() http.Handler {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.imagorHandler
}

// GetInstance returns the imagor instance (for in-process request handling)
func (p *Provider) GetInstance() *imagor.Imagor {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.imagorInstance
}

// Initialize initializes imagor using registry and provider configuration
func (p *Provider) Initialize() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	imagorConfig, err := p.buildConfig()
	if err != nil {
		return fmt.Errorf("failed to build imagor configuration: %w", err)
	}

	return p.setupHandler(imagorConfig, "Imagor initialized")
}

// setupHandler creates the embedded handler and updates provider state
func (p *Provider) setupHandler(imagorConfig *ImagorConfig, logMessage string) error {
	handler, err := p.createEmbeddedHandler(imagorConfig)
	if err != nil {
		return fmt.Errorf("failed to create embedded imagor handler: %w", err)
	}
	p.imagorHandler = handler
	p.currentConfig = imagorConfig
	p.logger.Info(logMessage)
	return nil
}

// ReloadFromRegistry forces a reload of imagor configuration from registry
func (p *Provider) ReloadFromRegistry() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	imagorConfig, err := p.buildConfig()
	if err != nil {
		return fmt.Errorf("failed to build imagor configuration: %w", err)
	}

	return p.setupHandler(imagorConfig, "Imagor reloaded from registry")
}

// buildConfigFromRegistry builds an imagor config object from registry values
func (p *Provider) buildConfigFromRegistry() (*ImagorConfig, error) {
	ctx := context.Background()

	results := registryutil.GetEffectiveValues(ctx, p.registryStore, p.config,
		"config.imagor_secret",
		"config.imagor_unsafe",
		"config.imagor_signer_type",
		"config.imagor_signer_truncate")

	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	imagorConfig := &ImagorConfig{}

	if signerTypeResult := resultMap["config.imagor_signer_type"]; signerTypeResult.Exists {
		imagorConfig.SignerType = signerTypeResult.Value
	} else {
		imagorConfig.SignerType = "sha1"
	}

	if signerTruncateResult := resultMap["config.imagor_signer_truncate"]; signerTruncateResult.Exists {
		if truncate, err := strconv.Atoi(signerTruncateResult.Value); err == nil {
			imagorConfig.SignerTruncate = truncate
		}
	}

	if unsafeResult := resultMap["config.imagor_unsafe"]; unsafeResult.Exists {
		if unsafe, err := strconv.ParseBool(unsafeResult.Value); err == nil {
			imagorConfig.Unsafe = unsafe
		}
	}

	if secretResult := resultMap["config.imagor_secret"]; secretResult.Exists {
		imagorConfig.Secret = secretResult.Value
	} else if !imagorConfig.Unsafe {
		// defaults to jwt secret, sha256, truncate 32 if imagor secret not set
		imagorConfig.Secret = p.config.JWTSecret
		imagorConfig.SignerType = "sha256"
		imagorConfig.SignerTruncate = 32
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
	cfg := p.GetConfig()
	if cfg == nil {
		return "", fmt.Errorf("imagor configuration not available")
	}

	params.Image = imagePath

	// Auto-enable base64 encoding if path contains spaces or special characters
	if strings.Contains(imagePath, " ") ||
		strings.ContainsAny(imagePath, "?#&()") {
		params.Base64Image = true
	}

	if cfg.Unsafe {
		return fmt.Sprintf("/%s", imagorpath.GenerateUnsafe(params)), nil
	}

	hashAlg := getHashAlgorithm(cfg.SignerType)
	signer := imagorpath.NewHMACSigner(hashAlg, cfg.SignerTruncate, cfg.Secret)
	return fmt.Sprintf("/%s", imagorpath.Generate(params, signer)), nil
}

// createEmbeddedHandler creates an embedded imagor handler
func (p *Provider) createEmbeddedHandler(cfg *ImagorConfig) (http.Handler, error) {
	var options []imagor.Option

	// Add processors: video processor first, then vips processor
	options = append(options, imagor.WithProcessors(
		imagorvideo.NewProcessor(
			imagorvideo.WithLogger(p.logger),
		),
		vipsprocessor.NewProcessor(
			vipsprocessor.WithLogger(p.logger),
			vipsprocessor.WithCacheSize(200*1024*1024), // 200 MiB in-memory image cache
			vipsprocessor.WithCacheTTL(time.Hour),
		),
	))

	if !cfg.Unsafe {
		hashAlg := getHashAlgorithm(cfg.SignerType)
		signer := imagorpath.NewHMACSigner(hashAlg, cfg.SignerTruncate, cfg.Secret)
		options = append(options, imagor.WithSigner(signer))
	} else {
		options = append(options, imagor.WithUnsafe(true))
	}

	// Configure storage based on current storage provider
	if storageOptions := p.buildStorageOptions(); len(storageOptions) > 0 {
		options = append(options, storageOptions...)
	}

	app := imagor.New(options...)

	// Store the imagor instance for shutdown cleanup
	p.imagorInstance = app

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
func (p *Provider) buildStorageOptions() []imagor.Option {
	storageConfig := p.getStorageConfig()
	if storageConfig == nil {
		p.logger.Warn("No storage configuration available for imagor")
		return nil
	}

	var options []imagor.Option

	switch storageConfig.StorageType {
	case "file", "filesystem":
		fileStorage := filestorage.New(
			storageConfig.FileStorageBaseDir,
			filestorage.WithMkdirPermission(storageConfig.FileStorageMkdirPermissions.String()),
			filestorage.WithWritePermission(storageConfig.FileStorageWritePermissions.String()),
			filestorage.WithSafeChars("--"),
		)
		options = append(options, imagor.WithLoaders(fileStorage))

	case "s3":
		awsConfig := p.buildAWSConfig(storageConfig)
		if awsConfig == nil {
			p.logger.Error("Failed to build AWS config for imagor S3 storage")
			return nil
		}

		s3Storage := s3storage.New(*awsConfig, storageConfig.S3StorageBucket,
			s3storage.WithBaseDir(storageConfig.S3StorageBaseDir),
			s3storage.WithEndpoint(storageConfig.S3Endpoint),
			s3storage.WithForcePathStyle(storageConfig.S3ForcePathStyle),
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
	cfg, err := p.buildStorageConfigFromRegistry()
	if err != nil || cfg.StorageType == "" {
		p.logger.Debug("No valid storage configuration found in registry, using original config", zap.Error(err))
		return p.config
	}
	return cfg
}

// buildStorageConfigFromRegistry builds storage configuration from registry
func (p *Provider) buildStorageConfigFromRegistry() (*config.Config, error) {
	ctx := context.Background()
	cfg := &config.Config{}

	results := registryutil.GetEffectiveValues(ctx, p.registryStore, p.config,
		"config.storage_type",
		"config.file_storage_base_dir",
		"config.file_storage_mkdir_permissions",
		"config.file_storage_write_permissions",
		"config.s3_storage_bucket",
		"config.s3_storage_region",
		"config.s3_storage_endpoint",
		"config.s3_storage_force_path_style",
		"config.s3_storage_access_key_id",
		"config.s3_storage_secret_access_key",
		"config.s3_storage_session_token",
		"config.s3_storage_base_dir")

	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	storageTypeResult := resultMap["config.storage_type"]
	if !storageTypeResult.Exists {
		return p.config, nil
	}
	cfg.StorageType = storageTypeResult.Value

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
		cfg.FileStorageBaseDir = "/app/gallery"
	}

	if result := resultMap["config.file_storage_mkdir_permissions"]; result.Exists {
		if perm, err := strconv.ParseUint(result.Value, 8, 32); err == nil {
			cfg.FileStorageMkdirPermissions = os.FileMode(perm)
		}
	} else {
		cfg.FileStorageMkdirPermissions = 0755
	}

	if result := resultMap["config.file_storage_write_permissions"]; result.Exists {
		if perm, err := strconv.ParseUint(result.Value, 8, 32); err == nil {
			cfg.FileStorageWritePermissions = os.FileMode(perm)
		}
	} else {
		cfg.FileStorageWritePermissions = 0644
	}
}

// loadS3ConfigFromResults loads S3 storage configuration from pre-fetched results
func (p *Provider) loadS3ConfigFromResults(resultMap map[string]registryutil.EffectiveValueResult, cfg *config.Config) {
	if result := resultMap["config.s3_storage_bucket"]; result.Exists {
		cfg.S3StorageBucket = result.Value
	}
	if result := resultMap["config.s3_storage_region"]; result.Exists {
		cfg.AWSRegion = result.Value
	}
	if result := resultMap["config.s3_storage_endpoint"]; result.Exists {
		cfg.S3Endpoint = result.Value
	}
	if result := resultMap["config.s3_storage_force_path_style"]; result.Exists {
		if forcePathStyle, err := strconv.ParseBool(result.Value); err == nil {
			cfg.S3ForcePathStyle = forcePathStyle
		}
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
}

// buildAWSConfig creates AWS configuration from storage settings
func (p *Provider) buildAWSConfig(storageConfig *config.Config) *aws.Config {
	ctx := context.Background()

	cfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		p.logger.Error("Failed to load default AWS config", zap.Error(err))
		return nil
	}

	if storageConfig.AWSRegion != "" {
		cfg.Region = storageConfig.AWSRegion
	}

	if storageConfig.AWSAccessKeyID != "" && storageConfig.AWSSecretAccessKey != "" {
		cfg.Credentials = credentials.NewStaticCredentialsProvider(
			storageConfig.AWSAccessKeyID,
			storageConfig.AWSSecretAccessKey,
			storageConfig.AWSSessionToken,
		)
	}

	return &cfg
}
