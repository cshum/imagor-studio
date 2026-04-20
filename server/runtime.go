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
	internalserver "github.com/cshum/imagor-studio/server/internal/server"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"go.uber.org/zap"
)

type Mode = internalserver.Mode

const (
	ModeSelfHosted = internalserver.ModeSelfHosted
	ModeCloud      = internalserver.ModeCloud
)

func Run(embedFS fs.FS, mode Mode) {
	run(embedFS, mode, management.CloudFactories{})
}

func RunCloudWithFactories(embedFS fs.FS, factories management.CloudFactories) {
	run(embedFS, ModeCloud, factories)
}

func run(embedFS fs.FS, mode Mode, factories management.CloudFactories) {
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

	var srv *internalserver.Server
	if internalserver.Mode(mode) == internalserver.ModeCloud && factories.Stores != nil {
		services, initErr := bootstrap.InitializeCloudWithFactories(cfg, logger, args, factories)
		if initErr != nil {
			logger.Fatal("Failed to initialize cloud services", zap.Error(initErr))
		}
		srv, err = internalserver.NewFromServices(cfg, embedFS, logger, services, internalserver.Mode(mode), factories)
	} else {
		srv, err = internalserver.New(cfg, embedFS, logger, args, internalserver.Mode(mode))
	}
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
