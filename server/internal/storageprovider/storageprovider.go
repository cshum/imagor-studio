package storageprovider

import (
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"go.uber.org/zap"
)

// Provider handles storage creation
type Provider struct {
	logger *zap.Logger
}

// New creates a new storage provider
func New(logger *zap.Logger) *Provider {
	return &Provider{
		logger: logger,
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
