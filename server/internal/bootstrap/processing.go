package bootstrap

import (
	"fmt"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/cloud/spaceconfigstore"
	"github.com/cshum/imagor-studio/server/internal/cloud/spaceloader"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/cloudruntime"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/cshum/imagor-studio/server/internal/noop"
	"go.uber.org/zap"
)

type ProcessingRuntimeFactory func(cfg *config.Config, logger *zap.Logger) (cloudruntime.SpaceConfigReader, imagor.Loader, imagorprovider.ProviderOption, error)

func defaultProcessingRuntimeFactory(cfg *config.Config, logger *zap.Logger) (cloudruntime.SpaceConfigReader, imagor.Loader, imagorprovider.ProviderOption, error) {
	spaceConfigStore := spaceconfigstore.New(
		cfg.SpacesEndpoint,
		cfg.InternalAPISecret,
		logger,
	)
	loader := spaceloader.New(spaceConfigStore, cfg.SpaceBaseDomain)
	return spaceConfigStore, loader, imagorprovider.WithSpaceConfigStore(spaceConfigStore, cfg.SpaceBaseDomain), nil
}

var DefaultProcessingRuntimeFactory ProcessingRuntimeFactory = defaultProcessingRuntimeFactory

func InitializeProcessing(cfg *config.Config, logger *zap.Logger) (*Services, error) {
	return initializeProcessingWithFactory(cfg, logger, DefaultProcessingRuntimeFactory)
}

func InitializeProcessingWithFactory(cfg *config.Config, logger *zap.Logger, runtimeFactory ProcessingRuntimeFactory) (*Services, error) {
	return initializeProcessingWithFactory(cfg, logger, runtimeFactory)
}

// InitializeProcessing sets up services for a cloud processing node.
func initializeProcessingWithFactory(cfg *config.Config, logger *zap.Logger, runtimeFactory ProcessingRuntimeFactory) (*Services, error) {
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("IMAGOR_JWT_SECRET is required in processing mode (no database to auto-generate it)")
	}

	registryStore := noop.NewRegistryStore()
	userStore := noop.NewUserStore()
	var orgStore cloudcontract.OrgStore = noop.NewOrgStore()
	var spaceStore cloudcontract.SpaceStore = noop.NewSpaceStore()

	tokenManager := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTExpiration)

	spaceConfigStore, loader, processingOption, err := runtimeFactory(cfg, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize processing runtime: %w", err)
	}

	imagorProvider := imagorprovider.New(
		logger, registryStore, cfg, loader,
		processingOption,
	)
	if err := imagorProvider.Initialize(); err != nil {
		return nil, fmt.Errorf("failed to initialize imagor: %w", err)
	}

	licenseService := license.NewService(registryStore, cfg)

	logger.Info("processing mode initialized",
		zap.String("spacesEndpoint", cfg.SpacesEndpoint),
		zap.String("spaceBaseDomain", cfg.SpaceBaseDomain),
	)

	return &Services{
		DB:               nil,
		TokenManager:     tokenManager,
		Storage:          nil,
		StorageProvider:  nil,
		ImagorProvider:   imagorProvider,
		RegistryStore:    registryStore,
		UserStore:        userStore,
		OrgStore:         orgStore,
		SpaceStore:       spaceStore,
		SpaceInviteStore: nil,
		InviteSender:     nil,
		SpaceConfigStore: spaceConfigStore,
		LicenseService:   licenseService,
		Encryption:       nil,
		Config:           cfg,
		Logger:           logger,
	}, nil
}
