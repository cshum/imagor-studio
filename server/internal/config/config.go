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
		storageType = fs.String("storage-type", "filesystem", "storage type (filesystem or s3)")

		// FileStorage options
		filesysBaseDir  = fs.String("filesys-base-dir", "./files", "base directory for filesystem storage")
		dirPermissions  = fs.Int("dir-permissions", 0755, "directory permissions for filesystem storage")
		filePermissions = fs.Int("file-permissions", 0644, "file permissions for filesystem storage")

		// S3Storage options
		s3Bucket           = fs.String("s3-bucket", "", "S3 bucket name")
		awsRegion          = fs.String("aws-region", "", "AWS Region")
		awsAccessKeyID     = fs.String("aws-access-key-id", "", "AWS Access Key ID")
		awsSecretAccessKey = fs.String("aws-secret-access-key", "", "AWS Secret Access Key")
		awsSessionToken    = fs.String("aws-session-token", "", "AWS Session Token")
		s3Endpoint         = fs.String("s3-endpoint", "", "Optional S3 Endpoint")
	)

	_ = fs.String("config", ".env", "config file (optional)")

	err := ff.Parse(fs, os.Args[1:],
		ff.WithEnvVars(),
		ff.WithConfigFileFlag("config"),
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
		s3Storage, err := s3storage.New(*s3Bucket,
			s3storage.WithRegion(*awsRegion),
			s3storage.WithEndpoint(*s3Endpoint),
			s3storage.WithCredentials(*awsAccessKeyID, *awsSecretAccessKey, *awsSessionToken),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create S3 storage: %w", err)
		}
		cfg.Storage = s3Storage
	case "filesystem":
		fileStorage, err := filestorage.New(*filesysBaseDir,
			filestorage.WithDirPermissions(os.FileMode(*dirPermissions)),
			filestorage.WithFilePermissions(os.FileMode(*filePermissions)),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create filesystem storage: %w", err)
		}
		cfg.Storage = fileStorage
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", cfg.StorageType)
	}

	// Log configuration
	cfg.Logger.Info("Configuration loaded",
		zap.Int("port", cfg.Port),
		zap.String("storageType", cfg.StorageType),
		zap.String("s3Bucket", *s3Bucket),
		zap.String("awsRegion", *awsRegion),
		zap.String("s3Endpoint", *s3Endpoint),
		zap.String("filesysBaseDir", *filesysBaseDir),
		zap.Int("dirPermissions", *dirPermissions),
		zap.Int("filePermissions", *filePermissions),
		zap.Bool("awsCredentialsProvided", *awsAccessKeyID != "" && *awsSecretAccessKey != ""),
	)

	return cfg, nil
}
