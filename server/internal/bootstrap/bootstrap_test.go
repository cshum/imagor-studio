package bootstrap

import (
	"context"
	"os"
	"strings"
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
	_, err = registryStore.Set(ctx, "system", "jwt_secret", existingSecret)
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

func TestGetConfigValue_Priority(t *testing.T) {
	tmpDB := "/tmp/test_config_value.db"
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

	tests := []struct {
		name          string
		envKey        string
		envValue      string
		envVarValue   string
		registryValue string
		defaultValue  string
		expectedValue string
	}{
		{
			name:          "env value takes priority",
			envKey:        "TEST_KEY",
			envValue:      "env-value",
			envVarValue:   "direct-env-value",
			registryValue: "registry-value",
			defaultValue:  "default-value",
			expectedValue: "env-value",
		},
		{
			name:          "direct env var when env value empty",
			envKey:        "TEST_KEY2",
			envValue:      "",
			envVarValue:   "direct-env-value",
			registryValue: "registry-value",
			defaultValue:  "default-value",
			expectedValue: "direct-env-value",
		},
		{
			name:          "registry value when env empty",
			envKey:        "TEST_KEY3",
			envValue:      "",
			envVarValue:   "",
			registryValue: "registry-value",
			defaultValue:  "default-value",
			expectedValue: "registry-value",
		},
		{
			name:          "default value when all empty",
			envKey:        "TEST_KEY4",
			envValue:      "",
			envVarValue:   "",
			registryValue: "",
			defaultValue:  "default-value",
			expectedValue: "default-value",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variable if needed
			if tt.envVarValue != "" {
				os.Setenv(tt.envKey, tt.envVarValue)
				defer os.Unsetenv(tt.envKey)
			}

			// Set registry value if needed
			if tt.registryValue != "" {
				ctx := context.Background()
				registryKey := strings.ToLower(strings.ReplaceAll(tt.envKey, "_", "_"))
				_, err := registryStore.Set(ctx, "system", registryKey, tt.registryValue)
				require.NoError(t, err)
			}

			result := getConfigValue(tt.envKey, tt.envValue, registryStore, tt.defaultValue)
			assert.Equal(t, tt.expectedValue, result)
		})
	}
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
