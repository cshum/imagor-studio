package bootstrap

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestInitialize(t *testing.T) {
	// Create a temporary database file
	tmpDB := "/tmp/test_bootstrap.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		Port:                 8080,
		DBPath:               tmpDB,
		JWTSecret:            "",
		JWTExpiration:        24 * time.Hour,
		StorageType:          "file",
		FileBaseDir:          "/tmp/test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
		ImagorMode:           "external",
		ImagorURL:            "http://localhost:8000",
		ImagorSecret:         "",
		ImagorUnsafe:         false,
		ImagorResultStorage:  "same",
		Logger:               zap.NewNop(),
	}

	services, err := Initialize(cfg)

	require.NoError(t, err)
	require.NotNil(t, services)

	// Verify all services are initialized
	assert.NotNil(t, services.DB)
	assert.NotNil(t, services.TokenManager)
	assert.NotNil(t, services.Storage)
	assert.NotNil(t, services.RegistryStore)
	assert.NotNil(t, services.UserStore)
	assert.NotNil(t, services.ImageService)
	assert.NotNil(t, services.Encryption)

	// Verify JWT secret was generated
	assert.NotEmpty(t, cfg.JWTSecret)

	// Clean up
	services.DB.Close()
}

func TestInitializeDatabase(t *testing.T) {
	tmpDB := "/tmp/test_init_db.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DBPath: tmpDB,
		Logger: zap.NewNop(),
	}

	db, err := initializeDatabase(cfg)

	require.NoError(t, err)
	require.NotNil(t, db)

	// Test that we can ping the database
	err = db.Ping()
	assert.NoError(t, err)

	// Clean up
	db.Close()
}

func TestBootstrapJWTSecret_FromEnv(t *testing.T) {
	// Set environment variable
	envSecret := "test-env-secret"
	os.Setenv("JWT_SECRET", envSecret)
	defer os.Unsetenv("JWT_SECRET")

	tmpDB := "/tmp/test_jwt_env.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DBPath: tmpDB,
		Logger: zap.NewNop(),
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	err = runMigrations(db, cfg.Logger)
	require.NoError(t, err)

	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)
	registryStore := registrystore.New(db, cfg.Logger, encryptionService)

	secret, err := bootstrapJWTSecret(cfg, registryStore, encryptionService)

	require.NoError(t, err)
	assert.Equal(t, envSecret, secret)
}

func TestBootstrapJWTSecret_Generated(t *testing.T) {
	tmpDB := "/tmp/test_jwt_gen.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DBPath: tmpDB,
		Logger: zap.NewNop(),
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	err = runMigrations(db, cfg.Logger)
	require.NoError(t, err)

	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)
	registryStore := registrystore.New(db, cfg.Logger, encryptionService)

	secret, err := bootstrapJWTSecret(cfg, registryStore, encryptionService)

	require.NoError(t, err)
	assert.NotEmpty(t, secret)
	assert.Len(t, secret, 32) // Should be 32 characters

	// Verify it was stored in registry
	ctx := context.Background()
	entry, err := registryStore.Get(ctx, "system", "jwt_secret")
	require.NoError(t, err)
	require.NotNil(t, entry)
	assert.Equal(t, secret, entry.Value)
}

func TestBootstrapJWTSecret_FromRegistry(t *testing.T) {
	tmpDB := "/tmp/test_jwt_registry.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DBPath: tmpDB,
		Logger: zap.NewNop(),
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	err = runMigrations(db, cfg.Logger)
	require.NoError(t, err)

	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)
	registryStore := registrystore.New(db, cfg.Logger, encryptionService)

	// Pre-store a secret in registry
	existingSecret := "existing-registry-secret"
	ctx := context.Background()
	_, err = registryStore.Set(ctx, "system", "jwt_secret", existingSecret, true)
	require.NoError(t, err)

	secret, err := bootstrapJWTSecret(cfg, registryStore, encryptionService)

	require.NoError(t, err)
	assert.Equal(t, existingSecret, secret)
}

func TestGenerateSecureSecret(t *testing.T) {
	secret := generateSecureSecret(32)

	assert.Len(t, secret, 32)
	assert.NotEmpty(t, secret)

	// Generate another one to ensure they're different
	secret2 := generateSecureSecret(32)
	assert.NotEqual(t, secret, secret2)
}

func TestConfigEnhancement(t *testing.T) {
	tmpDB := "/tmp/test_config_enhancement.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DBPath: tmpDB,
		Logger: zap.NewNop(),
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	err = runMigrations(db, cfg.Logger)
	require.NoError(t, err)

	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)
	registryStore := registrystore.New(db, cfg.Logger, encryptionService)

	// Test that config enhancement works with registry values
	ctx := context.Background()

	// Set some registry values
	_, err = registryStore.Set(ctx, "system", "storage_type", "s3", false)
	require.NoError(t, err)

	_, err = registryStore.Set(ctx, "system", "s3_bucket", "test-bucket", false)
	require.NoError(t, err)

	// Load config with registry enhancement
	enhancedCfg, err := config.Load(&config.LoadOptions{
		RegistryStore: registryStore,
		Args:          []string{"--jwt-secret", "test-secret"},
	})
	require.NoError(t, err)

	// Verify that registry values were applied
	assert.Equal(t, "s3", enhancedCfg.StorageType)
	assert.Equal(t, "test-bucket", enhancedCfg.S3Bucket)
}

func TestConfigEnhancementWithEnvPriority(t *testing.T) {
	tmpDB := "/tmp/test_config_env_priority.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DBPath: tmpDB,
		Logger: zap.NewNop(),
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	err = runMigrations(db, cfg.Logger)
	require.NoError(t, err)

	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)
	registryStore := registrystore.New(db, cfg.Logger, encryptionService)

	// Set environment variables (s3 requires bucket)
	os.Setenv("STORAGE_TYPE", "s3")
	os.Setenv("S3_BUCKET", "env-test-bucket")
	defer func() {
		os.Unsetenv("STORAGE_TYPE")
		os.Unsetenv("S3_BUCKET")
	}()

	// Set registry value (should be overridden by env)
	ctx := context.Background()
	_, err = registryStore.Set(ctx, "system", "storage_type", "file", false)
	require.NoError(t, err)

	// Load config with registry enhancement (env should take priority)
	enhancedCfg, err := config.Load(&config.LoadOptions{
		RegistryStore: registryStore,
		Args:          []string{"--jwt-secret", "test-secret"},
	})
	require.NoError(t, err)

	// Verify that env value takes priority over registry
	assert.Equal(t, "s3", enhancedCfg.StorageType)
	assert.Equal(t, "env-test-bucket", enhancedCfg.S3Bucket)
}

func TestInitializeImageService(t *testing.T) {
	tmpDB := "/tmp/test_image_service.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DBPath:              tmpDB,
		ImagorMode:          "external",
		ImagorURL:           "http://localhost:8000",
		ImagorSecret:        "test-secret",
		ImagorUnsafe:        false,
		ImagorResultStorage: "same",
		Logger:              zap.NewNop(),
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	err = runMigrations(db, cfg.Logger)
	require.NoError(t, err)

	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)
	registryStore := registrystore.New(db, cfg.Logger, encryptionService)

	imageService := initializeImageService(cfg, registryStore)

	require.NotNil(t, imageService)
	assert.Equal(t, "external", imageService.GetMode())
}
