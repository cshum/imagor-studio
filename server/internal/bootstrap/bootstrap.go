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
	"github.com/cshum/imagor-studio/server/internal/migrator"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/uptrace/bun"
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
	// Check if we're in embedded mode
	if cfg.EmbeddedMode {
		return initializeEmbedded(cfg, logger)
	}

	// Initialize database
	db, err := initializeDatabase(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

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

	// Initialize imagor provider with registry store, config, and storage provider
	imagorProvider := imagorprovider.New(logger, registryStore, enhancedCfg, storageProvider)

	// Initialize imagor with config (will use disabled if not configured)
	err = imagorProvider.InitializeWithConfig(enhancedCfg)
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

// initializeEmbedded sets up services for embedded mode (no database)
func initializeEmbedded(cfg *config.Config, logger *zap.Logger) (*Services, error) {
	// Validate JWT secret is provided for embedded mode
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("jwt-secret is required for embedded mode")
	}

	// Initialize token manager
	tokenManager := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTExpiration)

	// Initialize storage provider without registry store (nil)
	storageProvider := storageprovider.New(logger, nil, cfg)

	// Initialize storage with config
	err := storageProvider.InitializeWithConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize storage: %w", err)
	}

	// Get the current storage instance
	stor := storageProvider.GetStorage()

	// Initialize imagor provider without registry store (nil)
	imagorProvider := imagorprovider.New(logger, nil, cfg, storageProvider)

	// Initialize imagor with config
	err = imagorProvider.InitializeWithConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize imagor: %w", err)
	}

	// Log embedded configuration
	logger.Info("Embedded mode configuration loaded",
		zap.Int("port", cfg.Port),
		zap.Duration("jwtExpiration", cfg.JWTExpiration),
		zap.String("storageType", cfg.StorageType),
		zap.String("imagorMode", cfg.ImagorMode),
	)

	return &Services{
		DB:              nil, // No database in embedded mode
		TokenManager:    tokenManager,
		Storage:         stor,
		StorageProvider: storageProvider,
		ImagorProvider:  imagorProvider,
		RegistryStore:   nil, // No registry store in embedded mode
		UserStore:       nil, // No user store in embedded mode
		LicenseService:  nil, // No license service in embedded mode
		Encryption:      nil, // No encryption service in embedded mode
		Config:          cfg,
		Logger:          logger,
	}, nil
}
