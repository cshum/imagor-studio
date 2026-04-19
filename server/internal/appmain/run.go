package appmain

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/server"
	"go.uber.org/zap"
)

func Run(embedFS fs.FS, mode server.Mode) {
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

	srv, err := server.New(cfg, embedFS, logger, args, mode)
	if err != nil {
		logger.Fatal("Failed to create server", zap.Error(err), zap.String("mode", string(mode)))
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	serverErrChan := make(chan error, 1)
	go func() {
		logger.Info("Starting server...", zap.String("mode", string(mode)))
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
