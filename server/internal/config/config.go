package config

import (
	"flag"
	"fmt"
	"os"

	"github.com/cshum/imagor-studio/server/internal/storage"
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
		port               = fs.Int("port", 8080, "port to listen on")
		storageType        = fs.String("storage-type", "filesystem", "storage type (filesystem or s3)")
		s3Bucket           = fs.String("s3-bucket", "", "S3 bucket name")
		awsRegion          = fs.String("aws-region", "", "AWS Region")
		awsAccessKeyID     = fs.String("aws-access-key-id", "", "AWS Access Key ID (optional)")
		awsSecretAccessKey = fs.String("aws-secret-access-key", "", "AWS Secret Access Key (optional)")
		awsSessionToken    = fs.String("aws-session-token", "", "AWS Session Token (optional)")
		s3Endpoint         = fs.String("s3-endpoint", "", "Optional S3 Endpoint")
		filesysRoot        = fs.String("filesys-root", "./files", "root directory for filesystem storage")
	)

	_ = fs.String("config", ".env", "Retrieve configuration from the given file")

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
	loggerConfig := zap.NewDevelopmentConfig()
	loggerConfig.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
	logger, err := loggerConfig.Build()
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
		s3Storage, err := storage.NewS3Storage(*s3Bucket, *awsRegion, *s3Endpoint, *awsAccessKeyID, *awsSecretAccessKey, *awsSessionToken)
		if err != nil {
			return nil, fmt.Errorf("failed to create S3 storage: %w", err)
		}
		cfg.Storage = s3Storage
	case "filesystem":
		filesystemStorage, err := storage.NewFilesystemStorage(*filesysRoot)
		if err != nil {
			return nil, fmt.Errorf("failed to create filesystem storage: %w", err)
		}
		cfg.Storage = filesystemStorage
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", cfg.StorageType)
	}

	// Log configuration
	cfg.Logger.Debug("Configuration loaded",
		zap.Int("port", cfg.Port),
		zap.String("storageType", cfg.StorageType),
		zap.String("s3Bucket", *s3Bucket),
		zap.String("awsRegion", *awsRegion),
		zap.String("s3Endpoint", *s3Endpoint),
		zap.String("filesysRoot", *filesysRoot),
		zap.Bool("awsCredentialsProvided", *awsAccessKeyID != "" && *awsSecretAccessKey != ""),
	)

	return cfg, nil
}
