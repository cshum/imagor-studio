package main

import (
	"fmt"
	"os"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/database"
	"github.com/cshum/imagor-studio/server/internal/migrator"
	"go.uber.org/zap"
)

func main() {
	// Create logger
	logger, err := zap.NewProduction()
	if err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}

	// Load configuration using the existing config system
	// This supports CLI args, environment variables, and .env files
	cfg, err := config.Load(nil, nil)
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Connect to database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Create migration service
	service := migrator.NewService(db, logger)

	// Execute migration command (validation happens inside service)
	if err := service.Execute(cfg); err != nil {
		logger.Fatal("Migration command failed",
			zap.String("command", cfg.MigrateCommand),
			zap.Error(err))
	}

	logger.Info("Migration command completed successfully",
		zap.String("command", cfg.MigrateCommand))
}
