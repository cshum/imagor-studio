package config

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/peterbourgon/ff/v3"
	"go.uber.org/zap"
)

type Config struct {
	Port         int
	DBPath       string
	ImagorSecret string

	// JWT Configuration
	JWTSecret     string
	JWTExpiration time.Duration

	Logger *zap.Logger
}

func Load() (*Config, error) {
	fs := flag.NewFlagSet("imagor-studio", flag.ExitOnError)

	var (
		port          = fs.Int("port", 8080, "port to listen on")
		dbPath        = fs.String("db-path", "storage.db", "path to SQLite database file")
		imagorSecret  = fs.String("imagor-secret", "", "secret key for encrypting storage configs")
		jwtSecret     = fs.String("jwt-secret", "", "secret key for JWT signing")
		jwtExpiration = fs.Duration("jwt-expiration", 24*time.Hour, "JWT token expiration duration")
		err           error
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

	if *imagorSecret == "" {
		return nil, fmt.Errorf("imagor-secret is required")
	}

	if *jwtSecret == "" {
		return nil, fmt.Errorf("jwt-secret is required")
	}

	cfg := &Config{
		Port:          *port,
		DBPath:        *dbPath,
		ImagorSecret:  *imagorSecret,
		JWTSecret:     *jwtSecret,
		JWTExpiration: *jwtExpiration,
		Logger:        logger,
	}

	cfg.Logger.Info("Configuration loaded",
		zap.Int("port", cfg.Port),
		zap.String("dbPath", cfg.DBPath),
		zap.Duration("jwtExpiration", cfg.JWTExpiration),
	)

	return cfg, nil
}
