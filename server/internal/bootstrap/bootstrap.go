package bootstrap

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/database"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/cshum/imagor-studio/server/internal/managementdefault"
	"github.com/cshum/imagor-studio/server/internal/migrator"
	"github.com/cshum/imagor-studio/server/internal/noop"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/encryption"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

const (
	ModeSelfHosted = "selfhosted"
	ModeCloud      = "cloud"
)

// Services contains all initialized application services
type Services struct {
	DB               *bun.DB
	TokenManager     *auth.TokenManager
	Storage          storage.Storage
	StorageProvider  *storageprovider.Provider
	ImagorProvider   *imagorprovider.Provider
	RegistryStore    registrystore.Store
	UserStore        userstore.Store
	OrgStore         org.OrgStore                 // nil in self-hosted; set when InternalAPISecret != ""
	SpaceStore       space.SpaceStore             // nil in self-hosted; set when InternalAPISecret != ""
	SpaceInviteStore space.SpaceInviteStore       // nil when invitation storage is unavailable
	InviteSender     space.InviteSender           // nil when invitation email is not configured
	SpaceConfigStore processing.SpaceConfigReader // nil unless SpacesEndpoint set; Start() called by server
	LicenseService   *license.Service
	Encryption       *encryption.Service
	Config           *config.Config
	Logger           *zap.Logger
}

// Initialize sets up the database, runs migrations, and initializes all services.
// Prefer the explicit mode wrappers for new call sites.
func Initialize(cfg *config.Config, logger *zap.Logger, args []string, mode string) (*Services, error) {
	switch mode {
	case ModeCloud:
		return InitializeCloud(cfg, logger, args)
	case ModeSelfHosted, "":
		return InitializeSelfHosted(cfg, logger, args)
	default:
		return nil, fmt.Errorf("unknown bootstrap mode: %s", mode)
	}
}

func InitializeSelfHosted(cfg *config.Config, logger *zap.Logger, args []string) (*Services, error) {
	return initializeRuntimeMode(cfg, logger, args, ModeSelfHosted, nil, nil)
}

func InitializeCloud(cfg *config.Config, logger *zap.Logger, args []string) (*Services, error) {
	return initializeRuntimeMode(cfg, logger, args, ModeCloud, nil, nil)
}

func InitializeCloudWithFactories(cfg *config.Config, logger *zap.Logger, args []string, cloudStoresFactory management.CloudStoresFactory, inviteSenderFactory management.InviteSenderFactory) (*Services, error) {
	return initializeRuntimeMode(cfg, logger, args, ModeCloud, cloudStoresFactory, inviteSenderFactory)
}

// initializeRuntimeMode sets up runtime services for self-hosted or cloud management modes.
func initializeRuntimeMode(cfg *config.Config, logger *zap.Logger, args []string, mode string, cloudStoresFactory management.CloudStoresFactory, inviteSenderFactory management.InviteSenderFactory) (*Services, error) {
	if cfg.EmbeddedMode {
		return initializeEmbeddedMode(cfg, logger)
	}
	if cfg.SpacesEndpoint != "" {
		return InitializeProcessing(cfg, logger)
	}
	// Initialize database
	db, err := initializeDatabase(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}
	// Guard: close the DB connection if any subsequent step fails so we don't
	// leak the connection pool on error return paths.
	initOK := false
	defer func() {
		if !initOK {
			_ = db.Close()
		}
	}()

	// Run migrations based on database type and configuration
	if err := runMigrationsIfNeeded(db, cfg, logger); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	// Initialize encryption service
	encryptionService := encryption.NewService(cfg.DatabaseURL)

	// Initialize registry store
	registryStore := registrystore.New(db, logger, encryptionService)

	// Resolve JWT secret (from CLI/env, registry, or generate new)
	if err := resolveJWTSecret(cfg, registryStore); err != nil {
		return nil, fmt.Errorf("failed to resolve JWT secret: %w", err)
	}

	// Set JWT key in encryption service BEFORE loading enhanced config
	// This ensures the registry store can decrypt license keys and other JWT-encrypted values
	encryptionService.SetJWTKey(cfg.JWTSecret)

	// Load enhanced config with registry values using the original args
	enhancedCfg, err := config.Load(args, registryStore)
	if err != nil {
		return nil, fmt.Errorf("failed to apply registry values to config: %w", err)
	}

	// Ensure JWT secret is set in enhanced config
	if enhancedCfg.JWTSecret == "" {
		enhancedCfg.JWTSecret = cfg.JWTSecret
	}

	// Initialize token manager
	tokenManager := auth.NewTokenManager(enhancedCfg.JWTSecret, enhancedCfg.JWTExpiration)

	// Initialize storage provider with registry store and config
	storageProvider := storageprovider.New(logger, registryStore, enhancedCfg)

	// Initialize storage with config (will use NoOp if not configured)
	err = storageProvider.InitializeWithConfig(enhancedCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize storage: %w", err)
	}

	// Get the current storage instance
	stor := storageProvider.GetStorage()

	// Initialize user store
	userStore := userstore.New(db, logger)

	var (
		orgStore         org.OrgStore
		spaceStore       space.SpaceStore
		spaceInviteStore space.SpaceInviteStore
	)
	if mode == ModeCloud && cloudStoresFactory != nil {
		orgStore, spaceStore, spaceInviteStore, err = cloudStoresFactory(enhancedCfg, db, encryptionService, logger)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize cloud stores: %w", err)
		}
	} else {
		orgStore, spaceStore, spaceInviteStore = managementdefault.InitializeCloudStores(mode, enhancedCfg, db, encryptionService, logger)
	}

	var inviteSender space.InviteSender
	if mode == ModeCloud && inviteSenderFactory != nil {
		inviteSender, err = inviteSenderFactory(enhancedCfg)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize invitation email sender: %w", err)
		}
	} else {
		inviteSender, err = managementdefault.InitializeInviteSender(enhancedCfg)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize invitation email sender: %w", err)
		}
	}

	var spaceConfigStore processing.SpaceConfigReader
	loader := imagorprovider.NewStorageLoader(storageProvider)

	// Initialize imagor provider with the management-node loader.
	imagorProvider := imagorprovider.New(logger, registryStore, enhancedCfg, loader)

	// Initialize imagor with config (will use disabled if not configured)
	err = imagorProvider.Initialize()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize imagor: %w", err)
	}

	// Initialize license service with config provider
	licenseService := license.NewService(registryStore, enhancedCfg)

	// Log configuration loaded
	logger.Info("Configuration loaded",
		zap.Int("port", enhancedCfg.Port),
		zap.String("databaseURL", enhancedCfg.DatabaseURL),
		zap.Duration("jwtExpiration", enhancedCfg.JWTExpiration),
		zap.String("storageType", enhancedCfg.StorageType),
	)

	initOK = true // all steps succeeded; db ownership transfers to Services
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
		Config:           enhancedCfg,
		Logger:           logger,
	}, nil
}

// initializeEmbeddedMode initializes services for embedded mode (stateless, no database)
func initializeEmbeddedMode(cfg *config.Config, logger *zap.Logger) (*Services, error) {
	// No database initialization in embedded mode
	// No migrations needed

	// Create no-op stores
	registryStore := noop.NewRegistryStore()
	userStore := noop.NewUserStore()

	// Generate a static JWT secret for embedded mode if not provided
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "embedded-mode-static-secret-change-in-production"
	}

	// Initialize token manager
	tokenManager := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTExpiration)

	// Initialize storage provider with no-op registry store and config
	storageProvider := storageprovider.New(logger, registryStore, cfg)

	// Initialize storage with config (will use NoOp if not configured)
	err := storageProvider.InitializeWithConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize storage: %w", err)
	}

	// Get the current storage instance
	stor := storageProvider.GetStorage()

	// Initialize imagor provider with no-op registry store, config, and storage provider
	imagorProvider := imagorprovider.New(logger, registryStore, cfg, imagorprovider.NewStorageLoader(storageProvider))

	// Initialize imagor with config (will use disabled if not configured)
	err = imagorProvider.Initialize()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize imagor: %w", err)
	}

	// Initialize license service with config provider
	licenseService := license.NewService(registryStore, cfg)

	// Log embedded mode configuration loaded
	logger.Info("Embedded mode configuration loaded",
		zap.Int("port", cfg.Port),
		zap.Bool("embeddedMode", cfg.EmbeddedMode),
		zap.Duration("jwtExpiration", cfg.JWTExpiration),
		zap.String("storageType", cfg.StorageType),
	)

	return &Services{
		DB:               nil, // No database in embedded mode
		TokenManager:     tokenManager,
		Storage:          stor,
		StorageProvider:  storageProvider,
		ImagorProvider:   imagorProvider,
		RegistryStore:    registryStore,
		UserStore:        userStore,
		SpaceInviteStore: nil,
		InviteSender:     nil,
		LicenseService:   licenseService,
		Encryption:       nil, // No encryption service in embedded mode
		Config:           cfg,
		Logger:           logger,
	}, nil
}

// initializeDatabase opens and configures the database connection
func initializeDatabase(cfg *config.Config) (*bun.DB, error) {
	return database.Connect(cfg.DatabaseURL)
}

// runMigrationsIfNeeded executes database migrations using the migrator service
func runMigrationsIfNeeded(db *bun.DB, cfg *config.Config, logger *zap.Logger) error {
	// Create migration service and use it for auto-migration logic
	service := migrator.NewService(db, logger)
	return service.ExecuteAutoMigration(cfg)
}

// resolveJWTSecret handles JWT secret resolution: CLI/env -> registry -> generate new
func resolveJWTSecret(cfg *config.Config, registryStore registrystore.Store) error {
	// If JWT secret already provided via CLI/env, use it
	if cfg.JWTSecret != "" {
		return nil
	}

	// Try to get from registry
	ctx := context.Background()
	entry, err := registryStore.Get(ctx, registrystore.SystemOwnerID, "config.jwt_secret")
	if err == nil && entry != nil && entry.Value != "" {
		// Found existing JWT secret in registry
		cfg.JWTSecret = entry.Value
		return nil
	}

	// Generate and store new JWT secret
	generatedSecret, err := generateAndStoreJWTSecret(registryStore)
	if err != nil {
		return fmt.Errorf("failed to generate JWT secret: %w", err)
	}

	cfg.JWTSecret = generatedSecret
	return nil
}

// generateAndStoreJWTSecret creates a new secure JWT secret and stores it in the registry
func generateAndStoreJWTSecret(registryStore registrystore.Store) (string, error) {
	// Generate secure JWT secret
	secret, err := generateSecureJWTSecret()
	if err != nil {
		return "", fmt.Errorf("failed to generate secure JWT secret: %w", err)
	}

	// Store encrypted in registry (JWT secrets must always be encrypted)
	ctx := context.Background()
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.jwt_secret", secret, true)
	if err != nil {
		return "", fmt.Errorf("failed to store JWT secret in registry: %w", err)
	}

	return secret, nil
}

// generateSecureJWTSecret generates a cryptographically secure JWT secret
func generateSecureJWTSecret() (string, error) {
	// Generate 48 bytes (384 bits) of cryptographically secure random data
	// This provides excellent entropy for JWT signing
	bytes := make([]byte, 48)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Encode as base64 for safe storage and transmission
	return base64.StdEncoding.EncodeToString(bytes), nil
}
