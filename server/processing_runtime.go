package tools

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/processingruntime"
	internalserver "github.com/cshum/imagor-studio/server/internal/server"
	"github.com/cshum/imagor-studio/server/pkg/management"
	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
	"go.uber.org/zap"
)

func RunDefaultProcessing(embedFS fs.FS) {
	RunProcessingWithFactory(embedFS, DefaultProcessingRuntimeFactory)
}

var DefaultProcessingRuntimeFactory sharedprocessing.RuntimeFactory = processingruntime.DefaultProcessingRuntimeFactory

func RunProcessingWithFactory(embedFS fs.FS, runtimeFactory sharedprocessing.RuntimeFactory) {
	RunProcessingWithBuilder(embedFS, func(cfg *config.Config, logger *zap.Logger) (*bootstrap.Services, error) {
		return InitializeProcessingWithFactory(cfg, logger, runtimeFactory)
	})
}

func InitializeProcessingWithFactory(cfg *config.Config, logger *zap.Logger, runtimeFactory sharedprocessing.RuntimeFactory) (*bootstrap.Services, error) {
	return bootstrap.InitializeProcessingWithFactory(cfg, logger, runtimeFactory)
}

func RunProcessingWithBuilder(embedFS fs.FS, build func(cfg *config.Config, logger *zap.Logger) (*bootstrap.Services, error)) {
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

	services, err := build(cfg, logger)
	if err != nil {
		logger.Fatal("Failed to initialize processing services", zap.Error(err))
	}

	srv, err := internalserver.NewFromServices(cfg, embedFS, logger, services, ModeSelfHosted, management.CloudConfig{}, management.CloudFactories{})
	if err != nil {
		logger.Fatal("Failed to create processing server", zap.Error(err))
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	serverErrChan := make(chan error, 1)
	go func() {
		logger.Info("Starting processing server...")
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
