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

	// Reload config with registry values - this implements the simplified approach
	// where we call Load twice: once without registry (already done), then with registry
	// Only do this if the config has OriginalArgs (i.e., was loaded via config.Load)
	if cfg.OriginalArgs != nil {
		enhancedCfg, err := config.Load(&config.LoadOptions{
			RegistryStore: registryStore,
			Args:          cfg.OriginalArgs,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to load config with registry values: %w", err)
		}
		// Use the enhanced config from here on
		cfg = enhancedCfg
	}
	// If OriginalArgs is nil (e.g., manually created config in tests),
	// we skip registry enhancement and continue with the existing config

	// Update encryption service with final JWT secret
	encryptionService.SetJWTKey(cfg.JWTSecret)

	// Initialize token manager
	tokenManager := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTExpiration)

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
		Config:        cfg, // Return the enhanced config
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
