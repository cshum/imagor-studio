package bootstrap

import (
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/spaceconfigstore"
	"github.com/cshum/imagor-studio/server/internal/spaceinvite"
	"github.com/cshum/imagor-studio/server/internal/spacestore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

func initializeManagementMode(cfg *config.Config, logger *zap.Logger, args []string) (*Services, error) {
	db, err := initializeDatabase(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}
	initOK := false
	defer func() {
		if !initOK {
			_ = db.Close()
		}
	}()

	if err := runMigrationsIfNeeded(db, cfg, logger); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	services, err := buildManagementServices(db, cfg, logger, args)
	if err != nil {
		return nil, err
	}

	initOK = true
	return services, nil
}

func buildManagementServices(db *bun.DB, cfg *config.Config, logger *zap.Logger, args []string) (*Services, error) {
	encryptionService := encryption.NewService(cfg.DatabaseURL)
	registryStore := registrystore.New(db, logger, encryptionService)

	if err := resolveJWTSecret(cfg, registryStore); err != nil {
		return nil, fmt.Errorf("failed to resolve JWT secret: %w", err)
	}

	encryptionService.SetJWTKey(cfg.JWTSecret)

	enhancedCfg, err := config.Load(args, registryStore)
	if err != nil {
		return nil, fmt.Errorf("failed to apply registry values to config: %w", err)
	}
	if enhancedCfg.JWTSecret == "" {
		enhancedCfg.JWTSecret = cfg.JWTSecret
	}

	tokenManager := auth.NewTokenManager(enhancedCfg.JWTSecret, enhancedCfg.JWTExpiration)
	storageProvider := storageprovider.New(logger, registryStore, enhancedCfg)
	if err := storageProvider.InitializeWithConfig(enhancedCfg); err != nil {
		return nil, fmt.Errorf("failed to initialize storage: %w", err)
	}
	stor := storageProvider.GetStorage()
	userStore := userstore.New(db, logger)

	orgStore, spaceStore, spaceInviteStore := initializeCloudStores(db, encryptionService, enhancedCfg, logger)
	inviteSender, err := initializeInviteSender(enhancedCfg)
	if err != nil {
		return nil, err
	}

	loader := imagorprovider.NewStorageLoader(storageProvider)
	imagorProvider := imagorprovider.New(logger, registryStore, enhancedCfg, loader)
	if err := imagorProvider.Initialize(); err != nil {
		return nil, fmt.Errorf("failed to initialize imagor: %w", err)
	}

	licenseService := license.NewService(registryStore, enhancedCfg)

	logger.Info("Configuration loaded",
		zap.Int("port", enhancedCfg.Port),
		zap.String("databaseURL", enhancedCfg.DatabaseURL),
		zap.Duration("jwtExpiration", enhancedCfg.JWTExpiration),
		zap.String("storageType", enhancedCfg.StorageType),
	)

	return &Services{
		DB:               db,
		TokenManager:     tokenManager,
		Storage:          stor,
		StorageProvider:  storageProvider,
		ImagorProvider:   imagorProvider,
		RegistryStore:    registryStore,
		UserStore:        userStore,
		OrgStore:         orgStore,
		SpaceStore:       spaceStore,
		SpaceInviteStore: spaceInviteStore,
		InviteSender:     inviteSender,
		SpaceConfigStore: nil,
		LicenseService:   licenseService,
		Encryption:       encryptionService,
		Config:           enhancedCfg,
		Logger:           logger,
	}, nil
}

func initializeCloudStores(db *bun.DB, encryptionService *encryption.Service, cfg *config.Config, logger *zap.Logger) (orgstore.Store, spacestore.Store, spaceinvite.Store) {
	var orgStore orgstore.Store
	var spaceStore spacestore.Store
	var spaceInviteStore spaceinvite.Store

	if cfg.InternalAPISecret != "" {
		orgStore = orgstore.New(db)
		spaceStore = spacestore.New(db, encryptionService)
		spaceInviteStore = spaceinvite.NewStore(db)
		logger.Info("multi-tenant mode: org and space stores initialized")
	}

	return orgStore, spaceStore, spaceInviteStore
}

func initializeInviteSender(cfg *config.Config) (spaceinvite.EmailSender, error) {
	if cfg.SESFromEmail == "" {
		return nil, nil
	}

	sesRegion := cfg.SESRegion
	if sesRegion == "" {
		sesRegion = cfg.AWSRegion
	}

	sender, err := spaceinvite.NewSESEmailSender(sesRegion, cfg.SESFromEmail, cfg.AppUrl, cfg.AppApiUrl)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize invitation email sender: %w", err)
	}

	return sender, nil
}

func buildServices(
	db *bun.DB,
	tokenManager *auth.TokenManager,
	stor storage.Storage,
	storageProvider *storageprovider.Provider,
	imagorProvider *imagorprovider.Provider,
	registryStore registrystore.Store,
	userStore userstore.Store,
	orgStore orgstore.Store,
	spaceStore spacestore.Store,
	spaceInviteStore spaceinvite.Store,
	inviteSender spaceinvite.EmailSender,
	spaceConfigStore *spaceconfigstore.SpaceConfigStore,
	licenseService *license.Service,
	encryptionService *encryption.Service,
	cfg *config.Config,
	logger *zap.Logger,
) *Services {
	return &Services{
		DB:               db,
		TokenManager:     tokenManager,
		Storage:          stor,
		StorageProvider:  storageProvider,
		ImagorProvider:   imagorProvider,
		RegistryStore:    registryStore,
		UserStore:        userStore,
		OrgStore:         orgStore,
		SpaceStore:       spaceStore,
		SpaceInviteStore: spaceInviteStore,
		InviteSender:     inviteSender,
		SpaceConfigStore: spaceConfigStore,
		LicenseService:   licenseService,
		Encryption:       encryptionService,
		Config:           cfg,
		Logger:           logger,
	}
}
