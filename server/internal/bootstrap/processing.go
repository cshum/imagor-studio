package bootstrap

import (
	"fmt"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/cloudruntime"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/cshum/imagor-studio/server/internal/noop"
	"github.com/cshum/imagor-studio/server/internal/processingdefault"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"go.uber.org/zap"
)

type ProcessingRuntimeFactory func(cfg *config.Config, logger *zap.Logger) (cloudruntime.SpaceConfigReader, imagor.Loader, imagorprovider.ProviderOption, error)

func defaultProcessingRuntimeFactory(cfg *config.Config, logger *zap.Logger) (cloudruntime.SpaceConfigReader, imagor.Loader, imagorprovider.ProviderOption, error) {
	return processingdefault.DefaultProcessingRuntimeFactory(cfg, logger)
}

var DefaultProcessingRuntimeFactory ProcessingRuntimeFactory = defaultProcessingRuntimeFactory
var DefaultProcessingRuntimeFactoryOption = imagorprovider.WithSpaceConfigStore

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
	var orgStore org.OrgStore = noop.NewOrgStore()
	var spaceStore space.SpaceStore = noop.NewSpaceStore()

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
