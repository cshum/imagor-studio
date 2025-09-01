// cmd/server/main.go
package main

import (
	"fmt"
	"os"

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
	cfg, err := config.Load(args, nil)
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Create and start server with logger and args
	server, err := server.New(cfg, logger, args)
	if err != nil {
		logger.Fatal("Failed to create server", zap.Error(err))
	}

	// Graceful shutdown
	defer func() {
		if err := server.Close(); err != nil {
			logger.Error("Error closing server", zap.Error(err))
		}
	}()

	if err := server.Run(); err != nil {
		logger.Fatal("Server failed", zap.Error(err))
	}
}
