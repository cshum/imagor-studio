// cmd/server/main.go
package main

import (
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/server"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.LoadBasic()
	if err != nil {
		// Create a temporary logger for error reporting since config loading failed
		logger, _ := zap.NewProduction()
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Create and start server
	server, err := server.New(cfg)
	if err != nil {
		// Create a temporary logger for error reporting since server creation failed
		logger, _ := zap.NewProduction()
		logger.Fatal("Failed to create server", zap.Error(err))
	}

	// Graceful shutdown
	defer func() {
		if err := server.Close(); err != nil {
			// We can't access the logger here easily, so just print the error
			fmt.Printf("Error closing server: %v\n", err)
		}
	}()

	if err := server.Run(); err != nil {
		// Create a temporary logger for error reporting since server run failed
		logger, _ := zap.NewProduction()
		logger.Fatal("Server failed", zap.Error(err))
	}
}
