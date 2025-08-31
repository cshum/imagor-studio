package bootstrap

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"os"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/imageservice"
	"github.com/cshum/imagor-studio/server/internal/migrations"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/zap"
)

// Services contains all initialized application services
type Services struct {
	DB            *bun.DB
	TokenManager  *auth.TokenManager
	Storage       storage.Storage
	RegistryStore registrystore.Store
	UserStore     userstore.Store
	ImageService  imageservice.Service
	Encryption    *encryption.Service
}

// Initialize sets up the database, runs migrations, and initializes all services
func Initialize(cfg *config.Config) (*Services, error) {
	// Initialize database
	db, err := initializeDatabase(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	// Run migrations
	if err := runMigrations(db, cfg.Logger); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	// Initialize encryption service
	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)

	// Initialize registry store
	registryStore := registrystore.New(db, cfg.Logger, encryptionService)

	// Bootstrap JWT secret
	jwtSecret, err := bootstrapJWTSecret(cfg, registryStore, encryptionService)
	if err != nil {
		return nil, fmt.Errorf("failed to bootstrap JWT secret: %w", err)
	}

	// Update encryption service with JWT secret
	encryptionService.SetJWTKey(jwtSecret)

	// Update config with final JWT secret
	cfg.JWTSecret = jwtSecret

	// Initialize token manager
	tokenManager := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTExpiration)

	// Reload config with registry enhancement
	enhancedCfg, err := config.Load(&config.LoadOptions{
		RegistryStore: registryStore,
		Args:          []string{"--jwt-secret", cfg.JWTSecret}, // Use the current JWT secret
	})
	if err != nil {
		return nil, fmt.Errorf("failed to reload config with registry: %w", err)
	}

	// Update the original config with enhanced values but keep the same logger and JWT secret
	enhancedCfg.Logger = cfg.Logger
	enhancedCfg.JWTSecret = cfg.JWTSecret
	cfg = enhancedCfg

	// Initialize storage provider and create storage
	storageProvider := storageprovider.New(cfg.Logger)
	stor, err := storageProvider.NewStorageFromConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage: %w", err)
	}

	// Initialize user store
	userStore := userstore.New(db, cfg.Logger)

	// Initialize image service
	imageService := initializeImageService(cfg, registryStore)

	return &Services{
		DB:            db,
		TokenManager:  tokenManager,
		Storage:       stor,
		RegistryStore: registryStore,
		UserStore:     userStore,
		ImageService:  imageService,
		Encryption:    encryptionService,
	}, nil
}

// initializeDatabase opens and configures the database connection
func initializeDatabase(cfg *config.Config) (*bun.DB, error) {
	sqldb, err := sql.Open(sqliteshim.ShimName, cfg.DBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := bun.NewDB(sqldb, sqlitedialect.New())
	return db, nil
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

// bootstrapJWTSecret loads or generates JWT secret from registry or environment
func bootstrapJWTSecret(cfg *config.Config, registryStore registrystore.Store, encryptionService *encryption.Service) (string, error) {
	const SystemOwnerID = "system"

	// 1. Check environment variable first (highest priority)
	if envSecret := os.Getenv("JWT_SECRET"); envSecret != "" {
		return envSecret, nil
	}

	// 2. Check system registry
	ctx := context.Background()
	registryEntry, err := registryStore.Get(ctx, SystemOwnerID, "jwt_secret")
	if err != nil {
		return "", fmt.Errorf("failed to get JWT secret from registry: %w", err)
	}

	if registryEntry != nil && registryEntry.Value != "" {
		return registryEntry.Value, nil
	}

	// 3. Auto-generate and store in registry
	newSecret := generateSecureSecret(32)
	_, err = registryStore.Set(ctx, SystemOwnerID, "jwt_secret", newSecret, true)
	if err != nil {
		return "", fmt.Errorf("failed to store generated JWT secret: %w", err)
	}

	cfg.Logger.Info("Generated new JWT secret and stored in registry")
	return newSecret, nil
}

// generateSecureSecret generates a cryptographically secure random string
func generateSecureSecret(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	randomBytes := make([]byte, length)

	_, err := rand.Read(randomBytes)
	if err != nil {
		// Fallback to a simple implementation if crypto/rand fails
		for i := range b {
			b[i] = charset[i%len(charset)]
		}
		return string(b)
	}

	for i := range b {
		b[i] = charset[randomBytes[i]%byte(len(charset))]
	}
	return string(b)
}

// initializeImageService creates and configures the image service
func initializeImageService(cfg *config.Config, registryStore registrystore.Store) imageservice.Service {
	imageServiceConfig := imageservice.Config{
		Mode:          cfg.ImagorMode,
		URL:           cfg.ImagorURL,
		Secret:        cfg.ImagorSecret,
		Unsafe:        cfg.ImagorUnsafe,
		ResultStorage: cfg.ImagorResultStorage,
	}
	return imageservice.NewService(imageServiceConfig)
}
