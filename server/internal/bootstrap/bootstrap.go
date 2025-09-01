package bootstrap

import (
	"context"
	"database/sql"
	"fmt"

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
	Config        *config.Config
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

	// Create a new config with registry values properly applied
	enhancedCfg, err := config.Load(cfg.OriginalArgs, registryStore)
	if err != nil {
		return nil, fmt.Errorf("failed to create enhanced config with registry values: %w", err)
	}

	// Update encryption service with final JWT secret
	encryptionService.SetJWTKey(enhancedCfg.JWTSecret)

	// Initialize token manager
	tokenManager := auth.NewTokenManager(enhancedCfg.JWTSecret, enhancedCfg.JWTExpiration)

	// Initialize storage provider and create storage
	storageProvider := storageprovider.New(enhancedCfg.Logger)
	stor, err := storageProvider.NewStorageFromConfig(enhancedCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage: %w", err)
	}

	// Initialize user store
	userStore := userstore.New(db, enhancedCfg.Logger)

	// Initialize image service
	imageService := initializeImageService(enhancedCfg, registryStore)

	return &Services{
		DB:            db,
		TokenManager:  tokenManager,
		Storage:       stor,
		RegistryStore: registryStore,
		UserStore:     userStore,
		ImageService:  imageService,
		Encryption:    encryptionService,
		Config:        enhancedCfg, // Return the enhanced config
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
