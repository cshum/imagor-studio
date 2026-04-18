package runapp

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	tools "github.com/cshum/imagor-studio/server"
	"github.com/cshum/imagor-studio/server/internal/config"
	serverpkg "github.com/cshum/imagor-studio/server/internal/server"
	"go.uber.org/zap"
)

// Run loads configuration, creates the server, and handles graceful shutdown.
func Run(args []string) {
	logger, err := zap.NewProduction()
	if err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}

	cfg, err := config.Load(args, nil)
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	srv, err := serverpkg.New(cfg, tools.EmbedFS, logger, args)
	if err != nil {
		logger.Fatal("Failed to create server", zap.Error(err))
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	serverErrChan := make(chan error, 1)
	go func() {
		logger.Info("Starting server...")
		if err := srv.Run(); err != nil {
			serverErrChan <- err
		}
	}()

	select {
	case sig := <-sigChan:
		logger.Info("Received shutdown signal", zap.String("signal", sig.String()))

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			logger.Error("HTTP server shutdown failed", zap.Error(err))
		}

		if err := srv.Close(); err != nil {
			logger.Error("Error closing server resources", zap.Error(err))
		}

		logger.Info("Shutdown completed")

	case err := <-serverErrChan:
		logger.Error("Server error", zap.Error(err))

		if closeErr := srv.Close(); closeErr != nil {
			logger.Error("Error closing server resources", zap.Error(closeErr))
		}

		os.Exit(1)
	}
}
