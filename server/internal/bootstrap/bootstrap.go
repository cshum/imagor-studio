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

	// Enhance the existing config with registry values instead of reloading
	// This preserves all the original config values while adding registry enhancement
	if err := enhanceConfigWithRegistry(cfg, registryStore); err != nil {
		return nil, fmt.Errorf("failed to enhance config with registry: %w", err)
	}

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

// enhanceConfigWithRegistry enhances the existing config with registry values
func enhanceConfigWithRegistry(cfg *config.Config, registryStore registrystore.Store) error {
	ctx := context.Background()

	// Get all registry entries with "config." prefix
	prefix := "config."
	entries, err := registryStore.List(ctx, "system", &prefix)
	if err != nil {
		// Registry values are optional, so we can continue without them
		return nil
	}

	// Apply registry values to the config if they exist and aren't overridden by environment/args
	for _, entry := range entries {
		if entry.Value == "" {
			continue
		}

		// Convert registry key to config field and apply if not overridden
		switch entry.Key {
		case "config.storage_type":
			if cfg.StorageType == "file" { // default value, can be overridden
				cfg.StorageType = entry.Value
			}
		case "config.allow_guest_mode":
			if entry.Value == "true" {
				cfg.AllowGuestMode = true
			} else {
				cfg.AllowGuestMode = false
			}
		case "config.s3_bucket":
			if cfg.S3Bucket == "" {
				cfg.S3Bucket = entry.Value
			}
		case "config.s3_region":
			if cfg.S3Region == "" {
				cfg.S3Region = entry.Value
			}
		case "config.s3_endpoint":
			if cfg.S3Endpoint == "" {
				cfg.S3Endpoint = entry.Value
			}
		case "config.s3_access_key_id":
			if cfg.S3AccessKeyID == "" {
				cfg.S3AccessKeyID = entry.Value
			}
		case "config.s3_secret_access_key":
			if cfg.S3SecretAccessKey == "" {
				cfg.S3SecretAccessKey = entry.Value
			}
		case "config.s3_base_dir":
			if cfg.S3BaseDir == "" {
				cfg.S3BaseDir = entry.Value
			}
		case "config.imagor_mode":
			if cfg.ImagorMode == "external" { // default value
				cfg.ImagorMode = entry.Value
			}
		case "config.imagor_url":
			if cfg.ImagorURL == "http://localhost:8000" { // default value
				cfg.ImagorURL = entry.Value
			}
		case "config.imagor_secret":
			if cfg.ImagorSecret == "" {
				cfg.ImagorSecret = entry.Value
			}
		case "config.imagor_unsafe":
			if entry.Value == "true" {
				cfg.ImagorUnsafe = true
			} else {
				cfg.ImagorUnsafe = false
			}
		case "config.imagor_result_storage":
			if cfg.ImagorResultStorage == "same" { // default value
				cfg.ImagorResultStorage = entry.Value
			}
		}
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
