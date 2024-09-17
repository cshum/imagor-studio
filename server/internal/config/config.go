package config

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"github.com/peterbourgon/ff/v3"
	"go.uber.org/zap"
)

type Config struct {
	Port     int
	Storages map[string]storage.Storage
	Logger   *zap.Logger
}

func Load() (*Config, error) {
	fs := flag.NewFlagSet("imagor-studio", flag.ExitOnError)

	var (
		port = fs.Int("port", 8080, "port to listen on")

		// FileStorage options
		fileStorageBaseDir         = fs.String("file-storage-base-dir", "", "base directory for file storage")
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

	logger, err := zap.NewProduction()
	if err != nil {
		return nil, fmt.Errorf("error initializing logger: %w", err)
	}

	cfg := &Config{
		Port:     *port,
		Logger:   logger,
		Storages: make(map[string]storage.Storage),
	}

	// Determine storage type based on provided configuration
	if *s3StorageBucket != "" {
		// Check if S3 bucket exists
		s3Config, err := config.LoadDefaultConfig(context.TODO(),
			config.WithRegion(*awsRegion),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to load AWS config: %w", err)
		}

		s3Client := s3.NewFromConfig(s3Config)
		_, err = s3Client.HeadBucket(context.TODO(), &s3.HeadBucketInput{
			Bucket: aws.String(*s3StorageBucket),
		})
		if err == nil {
			// S3 bucket exists, use S3 storage
			s3Storage, err := s3storage.New(*s3StorageBucket,
				s3storage.WithRegion(*awsRegion),
				s3storage.WithEndpoint(*s3Endpoint),
				s3storage.WithCredentials(*awsAccessKeyID, *awsSecretAccessKey, *awsSessionToken),
				s3storage.WithBaseDir(*s3StorageBaseDir),
			)
			if err != nil {
				return nil, fmt.Errorf("failed to create S3 storage: %w", err)
			}
			cfg.Storages["default"] = s3Storage
			cfg.Logger.Info("Using S3 storage", zap.String("bucket", *s3StorageBucket))
		} else {
			return nil, fmt.Errorf("s3 bucket does not exist or is not accessible: %w", err)
		}
	} else if *fileStorageBaseDir != "" {
		// File storage base directory is set, use file storage
		fileStorage, err := filestorage.New(*fileStorageBaseDir,
			filestorage.WithDirPermissions(os.FileMode(*fileStorageDirPermissions)),
			filestorage.WithFilePermissions(os.FileMode(*fileStorageFilePermissions)),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to create file storage: %w", err)
		}
		cfg.Storages["default"] = fileStorage
		cfg.Logger.Info("Using file storage", zap.String("baseDir", *fileStorageBaseDir))
	} else {
		return nil, fmt.Errorf("no valid storage configuration found: either S3 bucket or file storage base directory must be set")
	}

	cfg.Logger.Info("Configuration loaded",
		zap.Int("port", cfg.Port),
		zap.String("storageType", fmt.Sprintf("%T", cfg.Storages["default"])),
	)

	return cfg, nil
}
