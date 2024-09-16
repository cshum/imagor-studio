package config

import (
	"flag"
	"fmt"
	"os"

	"github.com/peterbourgon/ff/v3"
	"go.uber.org/zap"
)

type Config struct {
	Port        int
	StorageType string
	S3Bucket    string
	S3Region    string
	FilesysRoot string
	Logger      *zap.Logger
}

func Load() (*Config, error) {
	fs := flag.NewFlagSet("imagor-studio", flag.ExitOnError)

	cfg := &Config{}

	fs.IntVar(&cfg.Port, "port", 8080, "port to listen on")
	fs.StringVar(&cfg.StorageType, "storage-type", "filesystem", "storage type (filesystem or s3)")
	fs.StringVar(&cfg.S3Bucket, "s3-bucket", "", "S3 bucket name")
	fs.StringVar(&cfg.S3Region, "s3-region", "", "S3 region")
	fs.StringVar(&cfg.FilesysRoot, "filesys-root", "./files", "root directory for filesystem storage")

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
	cfg.Logger = logger

	// Log configuration
	cfg.Logger.Debug("Configuration loaded",
		zap.Int("port", cfg.Port),
		zap.String("storageType", cfg.StorageType),
		zap.String("s3Bucket", cfg.S3Bucket),
		zap.String("s3Region", cfg.S3Region),
		zap.String("filesysRoot", cfg.FilesysRoot),
	)

	return cfg, nil
}
