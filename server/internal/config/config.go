package config

import (
	"flag"
	"fmt"
	"os"

	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"github.com/peterbourgon/ff/v3"
	"go.uber.org/zap"
)

type Config struct {
	Port        int
	StorageType string
	Storage     storage.Storage
	Logger      *zap.Logger
}

func Load() (*Config, error) {
	fs := flag.NewFlagSet("imagor-studio", flag.ExitOnError)

	var (
		port        = fs.Int("port", 8080, "port to listen on")
		storageType = fs.String("storage-type", "file", "storage type (file or s3)")

		// FileStorage options
		fileStorageBaseDir         = fs.String("file-storage-base-dir", "./files", "base directory for file storage")
		fileStorageDirPermissions  = fs.Int("file-storage-dir-permissions", 0755, "directory permissions for file storage")
		fileStorageFilePermissions = fs.Int("file-storage-file-permissions", 0644, "file permissions for file storage")

		// S3Storage options
		awsRegion          = fs.String("aws-region", "", "AWS Region")
		awsAccessKeyID     = fs.String("aws-access-key-id", "", "AWS Access Key ID")
		awsSecretAccessKey = fs.String("aws-secret-access-key", "", "AWS Secret Access Key")
		awsSessionToken    = fs.String("aws-session-token", "", "AWS Session Token")
		s3Endpoint         = fs.String("s3-endpoint", "", "Optional S3 Endpoint")
		s3StorageBucket    = fs.String("s3-storage-bucket", "", "bucket name for s3 storage")
		s3StorageBaseDir   = fs.String("s3-storage-base-dir", "", "base directory for s3 storage")
	)

	_ = fs.String("config", ".env", "config file (optional)")

	err := ff.Parse(fs, os.Args[1:],
		ff.WithEnvVars(),
		ff.WithConfigFileFlag("config"),
		ff.WithIgnoreUndefined(true),
		ff.WithAllowMissingConfigFile(true),
		ff.WithConfigFileParser(ff.EnvParser),
	)

	if err != nil {
		return nil, fmt.Errorf("error parsing configuration: %w", err)
	}

	// Initialize zap logger
	logger, err := zap.NewProduction()
	if err != nil {
		return nil, fmt.Errorf("error initializing logger: %w", err)
	}

	cfg := &Config{
		Port:        *port,
		StorageType: *storageType,
		Logger:      logger,
	}

	// Create storage based on type
	switch cfg.StorageType {
	case "s3":
		s3Storage, err := s3storage.New(*s3StorageBucket,
			s3storage.WithRegion(*awsRegion),
			s3storage.WithEndpoint(*s3Endpoint),
			s3storage.WithCredentials(*awsAccessKeyID, *awsSecretAccessKey, *awsSessionToken),
			s3storage.WithBaseDir(*s3StorageBaseDir),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create S3 storage: %w", err)
		}
		cfg.Storage = s3Storage
	case "file":
		fileStorage, err := filestorage.New(*fileStorageBaseDir,
			filestorage.WithDirPermissions(os.FileMode(*fileStorageDirPermissions)),
			filestorage.WithFilePermissions(os.FileMode(*fileStorageFilePermissions)),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create file storage: %w", err)
		}
		cfg.Storage = fileStorage
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", cfg.StorageType)
	}

	// Log configuration
	cfg.Logger.Info("Configuration loaded",
		zap.Int("port", cfg.Port),
		zap.String("awsRegion", *awsRegion),
		zap.Bool("awsCredentialsProvided", *awsAccessKeyID != "" && *awsSecretAccessKey != ""),
		zap.String("storageType", cfg.StorageType),
		zap.String("s3StorageBucket", *s3StorageBucket),
		zap.String("s3StorageBaseDir", *s3StorageBaseDir),
		zap.String("s3Endpoint", *s3Endpoint),
		zap.String("fileStorageBaseDir", *fileStorageBaseDir),
		zap.Int("fileStorageDirPermissions", *fileStorageDirPermissions),
		zap.Int("fileStorageFilePermissions", *fileStorageFilePermissions),
	)

	return cfg, nil
}
