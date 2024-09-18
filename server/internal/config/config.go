// internal/config/config.go

package config

import (
	"flag"
	"fmt"
	"github.com/cshum/imagor-studio/server/internal/storagemanager"
	"os"

	"github.com/peterbourgon/ff/v3"
	"go.uber.org/zap"
)

type Config struct {
	Port           int
	StorageManager *storagemanager.StorageManager
	Logger         *zap.Logger
}

func Load() (*Config, error) {
	fs := flag.NewFlagSet("imagor-studio", flag.ExitOnError)

	var (
		port              = fs.Int("port", 8080, "port to listen on")
		storageConfigFile = fs.String("storage-config", "storage_config.json", "path to storage configuration file")
		err               error
	)

	_ = fs.String("config", ".env", "config file (optional)")

	if err = ff.Parse(fs, os.Args[1:],
		ff.WithEnvVars(),
		ff.WithConfigFileFlag("config"),
		ff.WithIgnoreUndefined(true),
		ff.WithAllowMissingConfigFile(true),
		ff.WithConfigFileParser(ff.EnvParser),
	); err != nil {
		return nil, fmt.Errorf("error parsing configuration: %w", err)
	}

	logger, err := zap.NewProduction()
	if err != nil {
		return nil, fmt.Errorf("error initializing logger: %w", err)
	}

	storageManager, err := storagemanager.New(*storageConfigFile)
	if err != nil {
		return nil, fmt.Errorf("error initializing storage manager: %w", err)
	}

	cfg := &Config{
		Port:           *port,
		Logger:         logger,
		StorageManager: storageManager,
	}

	cfg.Logger.Info("Configuration loaded",
		zap.Int("port", cfg.Port),
		zap.Int("storageCount", len(storageManager.GetConfigs())),
	)

	return cfg, nil
}
