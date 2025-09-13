// cmd/server/main.go
package main

import (
	"fmt"
	"os"
	"strings"

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

	// Try to load config without registry first (for basic validation)
	// If JWT secret is missing, we'll let the bootstrap process handle auto-generation
	cfg, err := config.Load(args, nil)
	if err != nil {
		// If the error is about missing JWT secret, we can proceed to bootstrap
		// which will handle auto-generation
		if !isJWTSecretError(err) {
			logger.Fatal("Failed to load configuration", zap.Error(err))
		}
		// For JWT secret errors, we still need to parse other config values
		// So we'll pass a dummy JWT secret to get the config, then let bootstrap override it
		argsWithDummyJWT := append(args, "--jwt-secret", "dummy-will-be-replaced")
		cfg, err = config.Load(argsWithDummyJWT, nil)
		if err != nil {
			logger.Fatal("Failed to load configuration even with dummy JWT secret", zap.Error(err))
		}
	}

	// Create and start server with logger and args
	// The bootstrap process will handle JWT secret auto-generation
	srv, err := server.New(cfg, logger, args)
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

// isJWTSecretError checks if the error is related to missing JWT secret
func isJWTSecretError(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "jwt-secret is required") ||
		strings.Contains(err.Error(), "JWT secret"))
}
