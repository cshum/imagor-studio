package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

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

	// Create server with logger and args
	// The bootstrap process will handle JWT secret auto-generation
	srv, err := server.New(cfg, tools.EmbedFS, logger, args)
	if err != nil {
		logger.Fatal("Failed to create server", zap.Error(err))
	}

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start server in a goroutine
	serverErrChan := make(chan error, 1)
	go func() {
		logger.Info("Starting server...")
		if err := srv.Run(); err != nil {
			serverErrChan <- err
		}
	}()

	// Wait for either a signal or server error
	select {
	case sig := <-sigChan:
		logger.Info("Received shutdown signal", zap.String("signal", sig.String()))
		
		// Create context with timeout for graceful shutdown
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		
		// Shutdown HTTP server gracefully
		if err := srv.Shutdown(ctx); err != nil {
			logger.Error("HTTP server shutdown failed", zap.Error(err))
		}
		
		// Close database and other resources
		if err := srv.Close(); err != nil {
			logger.Error("Error closing server resources", zap.Error(err))
		}
		
		logger.Info("Graceful shutdown completed")
		
	case err := <-serverErrChan:
		logger.Error("Server error", zap.Error(err))
		
		// Close resources on error
		if closeErr := srv.Close(); closeErr != nil {
			logger.Error("Error closing server resources", zap.Error(closeErr))
		}
		
		os.Exit(1)
	}
}
