package bootstrap

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/database"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/cshum/imagor-studio/server/internal/migrations"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/zap"
)

// Services contains all initialized application services
type Services struct {
	DB              *bun.DB
	TokenManager    *auth.TokenManager
	Storage         storage.Storage
	StorageProvider *storageprovider.Provider
	ImagorProvider  *imagorprovider.Provider
	RegistryStore   registrystore.Store
	UserStore       userstore.Store
	LicenseService  *license.Service
	Encryption      *encryption.Service
	Config          *config.Config
	Logger          *zap.Logger
}

// Initialize sets up the database, runs migrations, and initializes all services
func Initialize(cfg *config.Config, logger *zap.Logger, args []string) (*Services, error) {

	// Initialize database
	db, err := initializeDatabase(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	// Run migrations
	if err := runMigrations(db, logger); err != nil {
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

	// Load enhanced config with registry values using the original args
	enhancedCfg, err := config.Load(args, registryStore)
	if err != nil {
		return nil, fmt.Errorf("failed to apply registry values to config: %w", err)
	}

	// Ensure JWT secret is set in enhanced config
	if enhancedCfg.JWTSecret == "" {
		enhancedCfg.JWTSecret = cfg.JWTSecret
	}

	// Update encryption service with final JWT secret
	encryptionService.SetJWTKey(enhancedCfg.JWTSecret)

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

	// Initialize imagor provider with registry store, config, and storage provider
	imagorProvider := imagorprovider.New(logger, registryStore, enhancedCfg, storageProvider)

	// Initialize imagor with config (will use disabled if not configured)
	err = imagorProvider.InitializeWithConfig(enhancedCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize imagor: %w", err)
	}

	// Initialize license service
	licenseService := license.NewService(registryStore)

	// Log configuration loaded
	logger.Info("Configuration loaded",
		zap.Int("port", enhancedCfg.Port),
		zap.String("databaseURL", enhancedCfg.DatabaseURL),
		zap.Duration("jwtExpiration", enhancedCfg.JWTExpiration),
		zap.String("storageType", enhancedCfg.StorageType),
	)

	return &Services{
		DB:              db,
		TokenManager:    tokenManager,
		Storage:         stor,
		StorageProvider: storageProvider,
		ImagorProvider:  imagorProvider,
		RegistryStore:   registryStore,
		UserStore:       userStore,
		LicenseService:  licenseService,
		Encryption:      encryptionService,
		Config:          enhancedCfg,
		Logger:          logger,
	}, nil
}

// initializeDatabase opens and configures the database connection
func initializeDatabase(cfg *config.Config) (*bun.DB, error) {
	return database.Connect(cfg.DatabaseURL)
}

// runMigrations executes database migrations
func runMigrations(db *bun.DB, logger *zap.Logger) error {
	migrator := migrate.NewMigrator(db, migrations.Migrations)

	err := migrator.Init(context.Background())
	if err != nil {
		return fmt.Errorf("failed to init migrator: %w", err)
	}

	group, err := migrator.Migrate(context.Background())
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	if group.IsZero() {
		logger.Info("No migrations to run")
	} else {
		logger.Info("Migrations applied", zap.String("group", group.String()))
	}

	return nil
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
