package entrypoint

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"go.uber.org/zap"
)

func RunCloudWorkerWithFactoriesAndArgs(args []string, factories management.CloudFactories, runner management.CloudWorkerRunner) {
	logger, err := newLoggerFromEnv()
	if err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}

	if runner == nil {
		logger.Fatal("Cloud worker runner is required")
	}

	cfg, err := config.Load(args, nil)
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	cloudConfig := management.CloudConfig{}
	if factories.ConfigLoader != nil {
		cloudConfig, err = factories.ConfigLoader(args)
		if err != nil {
			logger.Fatal("Failed to load cloud configuration", zap.Error(err))
		}
	}

	services, err := bootstrap.InitializeCloudWithFactories(cfg, logger, args, cloudConfig, factories)
	if err != nil {
		logger.Fatal("Failed to initialize cloud worker services", zap.Error(err))
	}

	workerServices := management.CloudWorkerServices{
		DB:                   services.DB,
		UserStore:            services.UserStore,
		OrgStore:             services.OrgStore,
		SpaceStore:           services.SpaceStore,
		SpaceInviteStore:     services.SpaceInviteStore,
		HostedStorageStore:   services.HostedStorageStore,
		ProcessingUsageStore: services.ProcessingUsageStore,
		BillingService:       services.BillingService,
		CloudConfig:          cloudConfig,
		Logger:               services.Logger,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	workerErrChan := make(chan error, 1)
	go func() {
		logger.Info("Starting cloud worker")
		if err := runner(ctx, workerServices, cloudConfig); err != nil {
			workerErrChan <- err
		}
	}()

	select {
	case sig := <-sigChan:
		logger.Info("Received shutdown signal", zap.String("signal", sig.String()))
		cancel()
		select {
		case err := <-workerErrChan:
			if err != nil && err != context.Canceled {
				logger.Error("Cloud worker exited during shutdown", zap.Error(err))
			}
		case <-time.After(5 * time.Second):
		}
	case err := <-workerErrChan:
		cancel()
		if err != nil && err != context.Canceled {
			logger.Error("Cloud worker error", zap.Error(err))
			if closeErr := closeCloudWorkerServices(services); closeErr != nil {
				logger.Error("Error closing cloud worker resources", zap.Error(closeErr))
			}
			os.Exit(1)
		}
	}

	if err := closeCloudWorkerServices(services); err != nil {
		logger.Error("Error closing cloud worker resources", zap.Error(err))
		os.Exit(1)
	}

	logger.Info("Cloud worker shutdown completed")
}

func closeCloudWorkerServices(services *bootstrap.Services) error {
	if services == nil {
		return nil
	}

	ctx := context.Background()
	if services.ImagorProvider != nil {
		if err := services.ImagorProvider.Shutdown(ctx); err != nil {
			return err
		}
	}

	if services.DB != nil {
		if err := services.DB.Close(); err != nil {
			return err
		}
	}

	return nil
}
