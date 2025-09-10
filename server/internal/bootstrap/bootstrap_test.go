package bootstrap

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor/imagorpath"
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
		JWTSecret:            "test-jwt-secret",
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
	}

	logger := zap.NewNop()
	args := []string{"--jwt-secret", "test-jwt-secret", "--db-path", tmpDB}
	services, err := Initialize(cfg, logger, args)

	require.NoError(t, err)
	require.NotNil(t, services)

	// Verify all services are initialized
	assert.NotNil(t, services.DB)
	assert.NotNil(t, services.TokenManager)
	assert.NotNil(t, services.Storage)
	assert.NotNil(t, services.StorageProvider)
	assert.NotNil(t, services.ImagorProvider)
	assert.NotNil(t, services.RegistryStore)
	assert.NotNil(t, services.UserStore)
	assert.NotNil(t, services.Encryption)
	assert.NotNil(t, services.Logger)

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

func TestJWTSecretFromEnv(t *testing.T) {
	// Set environment variable
	envSecret := "test-env-secret"
	os.Setenv("JWT_SECRET", envSecret)
	defer os.Unsetenv("JWT_SECRET")

	tmpDB := "/tmp/test_jwt_env.db"
	defer os.Remove(tmpDB)

	// Test the config loading directly to verify environment variable priority
	cfg, err := config.Load([]string{"--db-path", tmpDB}, nil)
	require.NoError(t, err)

	// Verify JWT secret from environment was used
	assert.Equal(t, envSecret, cfg.JWTSecret)
}

func TestJWTSecretFromRegistry(t *testing.T) {
	tmpDB := "/tmp/test_jwt_registry.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store first
	cfg := &config.Config{
		DBPath: tmpDB,
	}

	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	logger := zap.NewNop()
	err = runMigrations(db, logger)
	require.NoError(t, err)

	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)
	// Set a JWT key for encryption to work
	encryptionService.SetJWTKey("test-jwt-key")
	registryStore := registrystore.New(db, logger, encryptionService)

	// Pre-store a secret in registry (JWT secrets must be encrypted)
	existingSecret := "existing-registry-secret"
	ctx := context.Background()
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.jwt_secret", existingSecret, true)
	require.NoError(t, err)

	// Test config loading with registry enhancement
	enhancedCfg, err := config.Load([]string{"--db-path", tmpDB}, registryStore)
	require.NoError(t, err)

	// Verify JWT secret from registry was used
	assert.Equal(t, existingSecret, enhancedCfg.JWTSecret)
}

func TestConfigEnhancement(t *testing.T) {
	tmpDB := "/tmp/test_config_enhancement.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DBPath: tmpDB,
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	logger := zap.NewNop()
	err = runMigrations(db, logger)
	require.NoError(t, err)

	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)
	registryStore := registrystore.New(db, logger, encryptionService)

	// Test that config enhancement works with registry values
	ctx := context.Background()

	// Set some registry values
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.storage_type", "s3", false)
	require.NoError(t, err)

	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.s3_bucket", "test-bucket", false)
	require.NoError(t, err)

	// Load config with registry enhancement
	enhancedCfg, err := config.Load([]string{"--jwt-secret", "test-secret"}, registryStore)
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
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	logger := zap.NewNop()
	err = runMigrations(db, logger)
	require.NoError(t, err)

	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)
	registryStore := registrystore.New(db, logger, encryptionService)

	// Set environment variables (s3 requires bucket)
	os.Setenv("STORAGE_TYPE", "s3")
	os.Setenv("S3_BUCKET", "env-test-bucket")
	defer func() {
		os.Unsetenv("STORAGE_TYPE")
		os.Unsetenv("S3_BUCKET")
	}()

	// Set registry value (should be overridden by env)
	ctx := context.Background()
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.storage_type", "file", false)
	require.NoError(t, err)

	// Load config with registry enhancement (env should take priority)
	enhancedCfg, err := config.Load([]string{"--jwt-secret", "test-secret"}, registryStore)
	require.NoError(t, err)

	// Verify that env value takes priority over registry
	assert.Equal(t, "s3", enhancedCfg.StorageType)
	assert.Equal(t, "env-test-bucket", enhancedCfg.S3Bucket)
}

func TestImagorProviderIntegration(t *testing.T) {
	tmpDB := "/tmp/test_imagor_provider.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DBPath:              tmpDB,
		JWTSecret:           "test-jwt-secret",
		ImagorMode:          "external",
		ImagorURL:           "http://localhost:8000",
		ImagorSecret:        "test-secret",
		ImagorUnsafe:        true, // Use unsafe mode for testing
		ImagorResultStorage: "same",
	}

	logger := zap.NewNop()
	args := []string{
		"--jwt-secret", "test-jwt-secret",
		"--db-path", tmpDB,
		"--imagor-secret", "test-secret",
		"--imagor-unsafe", "true",
	}
	services, err := Initialize(cfg, logger, args)

	require.NoError(t, err)
	require.NotNil(t, services)
	require.NotNil(t, services.ImagorProvider)

	// Test that imagor provider has correct config
	imagorConfig := services.ImagorProvider.GetConfig()
	require.NotNil(t, imagorConfig)
	assert.Equal(t, "external", imagorConfig.Mode)
	assert.Equal(t, "http://localhost:8000", imagorConfig.BaseURL)
	assert.Equal(t, "test-secret", imagorConfig.Secret)
	assert.True(t, imagorConfig.Unsafe)

	// Test that imagor provider can generate URLs directly
	url, err := services.ImagorProvider.GenerateURL("test/image.jpg", imagorpath.Params{
		Width:  300,
		Height: 200,
	})
	require.NoError(t, err)
	assert.NotEmpty(t, url)

	// Clean up
	services.DB.Close()
}
