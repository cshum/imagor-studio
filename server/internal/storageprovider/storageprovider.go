package storageprovider

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"go.uber.org/zap"
)

// Provider handles storage creation and configuration
type Provider struct {
	logger        *zap.Logger
	registryStore registrystore.Store
}

// New creates a new storage provider
func New(logger *zap.Logger, registryStore registrystore.Store) *Provider {
	return &Provider{
		logger:        logger,
		registryStore: registryStore,
	}
}

// NewStorageFromConfig creates storage based on configuration with registry-first loading
func (p *Provider) NewStorageFromConfig(cfg *config.Config) (storage.Storage, error) {
	// Get storage type with priority: env -> registry -> config default
	storageType := p.getConfigValue("STORAGE_TYPE", cfg.StorageType, "file")

	switch storageType {
	case "file", "filesystem":
		return p.NewFileStorage(cfg)
	case "s3":
		return p.NewS3Storage(cfg)
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", storageType)
	}
}

// NewFileStorage creates a file storage instance
func (p *Provider) NewFileStorage(cfg *config.Config) (storage.Storage, error) {
	baseDir := p.getConfigValue("FILE_BASE_DIR", cfg.FileBaseDir, "./storage")

	p.logger.Info("Creating file storage",
		zap.String("baseDir", baseDir),
		zap.String("mkdirPermissions", cfg.FileMkdirPermissions.String()),
		zap.String("writePermissions", cfg.FileWritePermissions.String()),
	)

	return filestorage.New(baseDir,
		filestorage.WithMkdirPermission(cfg.FileMkdirPermissions),
		filestorage.WithWritePermission(cfg.FileWritePermissions),
	)
}

// NewS3Storage creates an S3 storage instance
func (p *Provider) NewS3Storage(cfg *config.Config) (storage.Storage, error) {
	bucket := p.getConfigValue("S3_BUCKET", cfg.S3Bucket, "")
	region := p.getConfigValue("S3_REGION", cfg.S3Region, "")
	endpoint := p.getConfigValue("S3_ENDPOINT", cfg.S3Endpoint, "")
	accessKeyID := p.getConfigValue("S3_ACCESS_KEY_ID", cfg.S3AccessKeyID, "")
	secretAccessKey := p.getConfigValue("S3_SECRET_ACCESS_KEY", cfg.S3SecretAccessKey, "")
	sessionToken := p.getConfigValue("S3_SESSION_TOKEN", cfg.S3SessionToken, "")
	baseDir := p.getConfigValue("S3_BASE_DIR", cfg.S3BaseDir, "")

	if bucket == "" {
		return nil, fmt.Errorf("s3-bucket is required when storage-type is s3")
	}

	p.logger.Info("Creating S3 storage",
		zap.String("bucket", bucket),
		zap.String("region", region),
		zap.String("endpoint", endpoint),
		zap.String("baseDir", baseDir),
	)

	var options []s3storage.Option

	if region != "" {
		options = append(options, s3storage.WithRegion(region))
	}

	if endpoint != "" {
		options = append(options, s3storage.WithEndpoint(endpoint))
	}

	if accessKeyID != "" && secretAccessKey != "" {
		options = append(options, s3storage.WithCredentials(
			accessKeyID,
			secretAccessKey,
			sessionToken,
		))
	}

	if baseDir != "" {
		options = append(options, s3storage.WithBaseDir(baseDir))
	}

	return s3storage.New(bucket, options...)
}

// getConfigValue implements the priority system: env var -> registry -> default
func (p *Provider) getConfigValue(envKey, envValue, defaultValue string) string {
	// 1. Environment variable (highest priority)
	if envValue != "" {
		return envValue
	}

	// 2. Check environment variable directly (in case envValue wasn't set from env)
	if envVal := os.Getenv(envKey); envVal != "" {
		return envVal
	}

	// 3. System registry (middle priority)
	ctx := context.Background()
	registryKey := strings.ToLower(strings.ReplaceAll(envKey, "_", "_"))
	registryEntry, err := p.registryStore.Get(ctx, "system", registryKey)
	if err == nil && registryEntry != nil && registryEntry.Value != "" {
		return registryEntry.Value
	}

	// 4. Default value (lowest priority)
	return defaultValue
}
