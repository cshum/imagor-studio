package main

import (
	"fmt"
	"os"

	tools "github.com/cshum/imagor-studio/server"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/server"
	"go.uber.org/zap"
)

func main() {
	// Create logger early in the application lifecycle
	logger, err := zap.NewProduction()
	if err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}

	args := os.Args[1:]

	// Load config normally - JWT secret is optional at this stage
	// Bootstrap will handle JWT secret resolution
	cfg, err := config.Load(args, nil)
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Create and start server with logger and args
	// The bootstrap process will handle JWT secret auto-generation
	srv, err := server.New(cfg, tools.EmbedFS, logger, args)
	if err != nil {
		logger.Fatal("Failed to create server", zap.Error(err))
	}

	// Graceful shutdown
	defer func() {
		if err := srv.Close(); err != nil {
			logger.Error("Error closing server", zap.Error(err))
		}
	}()

	if err := srv.Run(); err != nil {
		logger.Fatal("Server failed", zap.Error(err))
	}
}
