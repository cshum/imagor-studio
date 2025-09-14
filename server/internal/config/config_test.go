package config

import (
	"context"
	"database/sql"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/migrations"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/zap"
)

func TestLoadBasic(t *testing.T) {
	// Test basic config loading without registry
	cfg, err := Load([]string{"--jwt-secret", "test-secret"}, nil)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Verify default values
	assert.Equal(t, 8080, cfg.Port)
	assert.Equal(t, "sqlite:./imagor-studio.db", cfg.DatabaseURL)
	assert.Equal(t, "file", cfg.StorageType)
	assert.Equal(t, "/app/data/storage", cfg.FileBaseDir)
	assert.Equal(t, "embedded", cfg.ImagorMode)
	assert.Equal(t, "", cfg.ImagorBaseURL)
	assert.Equal(t, 24*time.Hour, cfg.JWTExpiration)
	assert.Equal(t, ".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.psd,.heif", cfg.AppFileExtensions)
	assert.Equal(t, false, cfg.AppShowHidden)
}

func TestLoadWithArgs(t *testing.T) {
	// Test config loading with custom arguments
	args := []string{
		"--port", "9090",
		"--storage-type", "s3",
		"--s3-bucket", "test-bucket",
		"--imagor-mode", "disabled",
		"--jwt-secret", "test-secret",
	}

	cfg, err := Load(args, nil)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Verify custom values
	assert.Equal(t, 9090, cfg.Port)
	assert.Equal(t, "s3", cfg.StorageType)
	assert.Equal(t, "test-bucket", cfg.S3Bucket)
	assert.Equal(t, "disabled", cfg.ImagorMode)
}

func TestLoadWithEnvVars(t *testing.T) {
	// Set environment variables
	os.Setenv("PORT", "7070")
	os.Setenv("STORAGE_TYPE", "s3")
	os.Setenv("S3_BUCKET", "env-bucket")
	os.Setenv("IMAGOR_MODE", "embedded")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("STORAGE_TYPE")
		os.Unsetenv("S3_BUCKET")
		os.Unsetenv("IMAGOR_MODE")
	}()

	cfg, err := Load([]string{"--jwt-secret", "test-secret"}, nil)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Verify environment values
	assert.Equal(t, 7070, cfg.Port)
	assert.Equal(t, "s3", cfg.StorageType)
	assert.Equal(t, "env-bucket", cfg.S3Bucket)
	assert.Equal(t, "embedded", cfg.ImagorMode)
}

func TestLoadWithRegistry(t *testing.T) {
	// Create temporary database
	tmpDB := "/tmp/test_config_registry.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// Set registry values using new config. prefix format
	ctx := context.Background()
	_, err := registryStore.Set(ctx, registrystore.SystemOwnerID, "config.storage_type", "s3", false)
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.s3_bucket", "registry-bucket", false)
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", "disabled", false)
	require.NoError(t, err)

	// Load config with registry
	cfg, err := Load([]string{"--jwt-secret", "test-secret"}, registryStore)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Verify registry values were applied
	assert.Equal(t, "s3", cfg.StorageType)
	assert.Equal(t, "registry-bucket", cfg.S3Bucket)
	assert.Equal(t, "disabled", cfg.ImagorMode)
}

func TestConfigPriority(t *testing.T) {
	// Create temporary database
	tmpDB := "/tmp/test_config_priority.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// Set registry value
	ctx := context.Background()
	_, err := registryStore.Set(ctx, registrystore.SystemOwnerID, "config.storage_type", "s3", false)
	require.NoError(t, err)

	// Set environment variable (should override registry)
	os.Setenv("STORAGE_TYPE", "file")
	defer os.Unsetenv("STORAGE_TYPE")

	// Load config with registry
	cfg, err := Load([]string{"--jwt-secret", "test-secret"}, registryStore)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Verify environment takes priority over registry
	assert.Equal(t, "file", cfg.StorageType)
}

func TestConfigPriorityWithArgs(t *testing.T) {
	// Create temporary database
	tmpDB := "/tmp/test_config_priority_args.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// Set registry value
	ctx := context.Background()
	_, err := registryStore.Set(ctx, registrystore.SystemOwnerID, "config.storage_type", "s3", false)
	require.NoError(t, err)

	// Set environment variable
	os.Setenv("STORAGE_TYPE", "file")
	defer os.Unsetenv("STORAGE_TYPE")

	// Use command line args (should have highest priority)
	args := []string{"--storage-type", "filesystem", "--jwt-secret", "test-secret"}

	cfg, err := Load(args, registryStore)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Verify args take priority over env and registry
	assert.Equal(t, "filesystem", cfg.StorageType)
}

func TestValidateStorageConfig(t *testing.T) {
	tests := []struct {
		name        string
		storageType string
		s3Bucket    string
		expectError bool
	}{
		{
			name:        "valid file storage",
			storageType: "file",
			s3Bucket:    "",
			expectError: false,
		},
		{
			name:        "valid filesystem storage",
			storageType: "filesystem",
			s3Bucket:    "",
			expectError: false,
		},
		{
			name:        "valid s3 storage",
			storageType: "s3",
			s3Bucket:    "test-bucket",
			expectError: false,
		},
		{
			name:        "invalid s3 storage - missing bucket",
			storageType: "s3",
			s3Bucket:    "",
			expectError: true,
		},
		{
			name:        "invalid storage type",
			storageType: "invalid",
			s3Bucket:    "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &Config{
				StorageType: tt.storageType,
				S3Bucket:    tt.s3Bucket,
			}

			err := cfg.validateStorageConfig()
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestAutoParsingWithConfigPrefix(t *testing.T) {
	// Create temporary database
	tmpDB := "/tmp/test_auto_parsing.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// Set registry values using new config. prefix format
	ctx := context.Background()
	_, err := registryStore.Set(ctx, registrystore.SystemOwnerID, "config.jwt_secret", "registry-jwt-secret", true)
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.storage_type", "s3", false)
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.s3_bucket", "auto-parsed-bucket", false)
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.allow_guest_mode", "true", false)
	require.NoError(t, err)

	// Load config with registry
	cfg, err := Load([]string{}, registryStore) // No args, should use registry values
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Verify auto-parsed registry values were applied
	assert.Equal(t, "registry-jwt-secret", cfg.JWTSecret)
	assert.Equal(t, "s3", cfg.StorageType)
	assert.Equal(t, "auto-parsed-bucket", cfg.S3Bucket)
	assert.Equal(t, true, cfg.AllowGuestMode)
}

func TestGuestModeConfig(t *testing.T) {
	// Test guest mode configuration with registry
	tmpDB := "/tmp/test_guest_mode_config.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// Set registry values including JWT secret and guest mode
	ctx := context.Background()
	_, err := registryStore.Set(ctx, registrystore.SystemOwnerID, "config.jwt_secret", "test-secret", true)
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.allow_guest_mode", "true", false)
	require.NoError(t, err)

	// Load config with registry
	cfg, err := Load([]string{}, registryStore) // No args, should use registry values
	require.NoError(t, err)
	require.NotNil(t, cfg)

	assert.Equal(t, true, cfg.AllowGuestMode)
	assert.Equal(t, "test-secret", cfg.JWTSecret)
}

func TestGetRegistryKeyForFlag(t *testing.T) {
	tests := []struct {
		flagName    string
		expectedKey string
	}{
		{"storage-type", "config.storage_type"},
		{"s3-bucket", "config.s3_bucket"},
		{"imagor-mode", "config.imagor_mode"},
		{"file-base-dir", "config.file_base_dir"},
		{"allow-guest-mode", "config.allow_guest_mode"},
	}

	for _, tt := range tests {
		t.Run(tt.flagName, func(t *testing.T) {
			result := GetRegistryKeyForFlag(tt.flagName)
			assert.Equal(t, tt.expectedKey, result)
		})
	}
}

func TestGetFlagNameForRegistryKey(t *testing.T) {
	tests := []struct {
		registryKey  string
		expectedFlag string
	}{
		{"storage_type", "storage-type"},
		{"s3_bucket", "s3-bucket"},
		{"imagor_mode", "imagor-mode"},
		{"file_base_dir", "file-base-dir"},
		{"config.storage_type", "storage-type"},
		{"config.s3_bucket", "s3-bucket"},
		{"config.allow_guest_mode", "allow-guest-mode"},
	}

	for _, tt := range tests {
		t.Run(tt.registryKey, func(t *testing.T) {
			result := GetFlagNameForRegistryKey(tt.registryKey)
			assert.Equal(t, tt.expectedFlag, result)
		})
	}
}

func TestConfigWithJWTSecret(t *testing.T) {
	// Test JWT secret validation
	args := []string{
		"--jwt-secret", "test-jwt-secret",
	}

	cfg, err := Load(args, nil)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	assert.Equal(t, "test-jwt-secret", cfg.JWTSecret)
}

func TestConfigAllowsEmptyJWTSecret(t *testing.T) {
	// Test that config loading succeeds when no JWT secret is provided
	// JWT secret resolution is now handled in bootstrap
	args := []string{
		"--port", "8080",
	}

	cfg, err := Load(args, nil)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// JWT secret should be empty - bootstrap will handle it
	assert.Equal(t, "", cfg.JWTSecret)
	assert.Equal(t, 8080, cfg.Port)
}

func TestConfigWithImagorSecret(t *testing.T) {
	// Test that imagor secret is independent of JWT secret
	args := []string{
		"--jwt-secret", "test-jwt-secret",
		"--imagor-secret", "test-imagor-secret",
	}

	cfg, err := Load(args, nil)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	assert.Equal(t, "test-jwt-secret", cfg.JWTSecret)
	assert.Equal(t, "test-imagor-secret", cfg.ImagorSecret)
}

func TestJWTSecretFromRegistry(t *testing.T) {
	// Test that JWT secret can be loaded from registry when provided
	tmpDB := "/tmp/test_jwt_from_registry.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// Pre-store a JWT secret in registry
	ctx := context.Background()
	_, err := registryStore.Set(ctx, registrystore.SystemOwnerID, "config.jwt_secret", "registry-jwt-secret", true)
	require.NoError(t, err)

	// Load config - should get JWT secret from registry
	cfg, err := Load([]string{"--port", "8080"}, registryStore)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Verify JWT secret was loaded from registry
	assert.Equal(t, "registry-jwt-secret", cfg.JWTSecret)
}

func TestJWTSecretEmptyWhenNotProvided(t *testing.T) {
	// Test that JWT secret is empty when not provided and no registry available
	// Bootstrap will handle generation
	tmpDB := "/tmp/test_jwt_empty.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// Load config without JWT secret - should be empty, bootstrap will handle it
	cfg, err := Load([]string{"--port", "8080"}, registryStore)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// JWT secret should be empty since none was provided and none in registry
	assert.Equal(t, "", cfg.JWTSecret)
}

func TestJWTSecretOverridesPersisted(t *testing.T) {
	// Test that CLI/env JWT secret overrides persisted auto-generated secret
	tmpDB := "/tmp/test_jwt_override.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// First load - auto-generate JWT secret
	cfg1, err := Load([]string{"--port", "8080"}, registryStore)
	require.NoError(t, err)
	require.NotNil(t, cfg1)
	autoGeneratedSecret := cfg1.JWTSecret

	// Second load with explicit JWT secret - should override
	cfg2, err := Load([]string{"--jwt-secret", "explicit-secret"}, registryStore)
	require.NoError(t, err)
	require.NotNil(t, cfg2)

	assert.Equal(t, "explicit-secret", cfg2.JWTSecret)
	assert.NotEqual(t, autoGeneratedSecret, cfg2.JWTSecret)

	// Third load without explicit secret - should go back to auto-generated
	cfg3, err := Load([]string{"--port", "8080"}, registryStore)
	require.NoError(t, err)
	require.NotNil(t, cfg3)

	assert.Equal(t, autoGeneratedSecret, cfg3.JWTSecret)
}

func TestConfigFilePermissions(t *testing.T) {
	// Test file permission parsing
	args := []string{
		"--file-mkdir-permissions", "0755",
		"--file-write-permissions", "0644",
		"--jwt-secret", "test-secret",
	}

	cfg, err := Load(args, nil)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	assert.Equal(t, os.FileMode(0755), cfg.FileMkdirPermissions)
	assert.Equal(t, os.FileMode(0644), cfg.FileWritePermissions)
}

func TestConfigInvalidValues(t *testing.T) {
	tests := []struct {
		name          string
		args          []string
		errorContains string
	}{
		{
			name:          "invalid port",
			args:          []string{"--port", "invalid", "--jwt-secret", "test"},
			errorContains: "invalid port",
		},
		{
			name:          "invalid jwt expiration",
			args:          []string{"--jwt-expiration", "invalid", "--jwt-secret", "test"},
			errorContains: "invalid jwt-expiration",
		},
		{
			name:          "invalid mkdir permissions",
			args:          []string{"--file-mkdir-permissions", "invalid", "--jwt-secret", "test"},
			errorContains: "invalid file-mkdir-permissions",
		},
		{
			name:          "invalid write permissions",
			args:          []string{"--file-write-permissions", "invalid", "--jwt-secret", "test"},
			errorContains: "invalid file-write-permissions",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Load(tt.args, nil)
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.errorContains)
		})
	}
}

func TestGetByRegistryKey_ConfigDetection(t *testing.T) {
	tests := []struct {
		name           string
		registryValues map[string]string
		envVars        map[string]string
		args           []string
		testKey        string
		expectedValue  string
		expectedExists bool
		description    string
	}{
		{
			name: "Registry value only - not overridden",
			registryValues: map[string]string{
				"config.storage_type": "file",
			},
			testKey:        "config.storage_type",
			expectedValue:  "",
			expectedExists: false,
			description:    "Registry values alone should not be considered overridden by external config",
		},
		{
			name: "Registry value overridden by environment",
			registryValues: map[string]string{
				"config.storage_type": "s3",
			},
			envVars: map[string]string{
				"STORAGE_TYPE": "file",
			},
			testKey:        "config.storage_type",
			expectedValue:  "file",
			expectedExists: true,
			description:    "When registry value is overridden by env var, should return env value",
		},
		{
			name: "Registry value overridden by args",
			registryValues: map[string]string{
				"config.storage_type": "s3",
			},
			args:           []string{"--storage-type", "filesystem"},
			testKey:        "config.storage_type",
			expectedValue:  "filesystem",
			expectedExists: true,
			description:    "When registry value is overridden by command line args, should return args value",
		},
		{
			name: "No registry value, env only",
			envVars: map[string]string{
				"STORAGE_TYPE": "file",
			},
			testKey:        "config.storage_type",
			expectedValue:  "file",
			expectedExists: true,
			description:    "When there's no registry value but env var exists, should return env value",
		},
		{
			name: "Non-config registry key - not tracked",
			registryValues: map[string]string{
				"app.version": "1.0.0",
			},
			testKey:        "app.version",
			expectedValue:  "",
			expectedExists: false,
			description:    "Non-config registry keys should not be tracked",
		},
		{
			name: "Guest mode registry value only - not overridden",
			registryValues: map[string]string{
				"config.allow_guest_mode": "true",
			},
			testKey:        "config.allow_guest_mode",
			expectedValue:  "",
			expectedExists: false,
			description:    "Guest mode from registry alone should not be considered overridden",
		},
		{
			name: "Guest mode overridden by environment",
			registryValues: map[string]string{
				"config.allow_guest_mode": "true",
			},
			envVars: map[string]string{
				"ALLOW_GUEST_MODE": "false",
			},
			testKey:        "config.allow_guest_mode",
			expectedValue:  "false",
			expectedExists: true,
			description:    "Guest mode overridden by env should return env value",
		},
		{
			name:           "Default value only - not overridden",
			testKey:        "config.storage_type",
			expectedValue:  "",
			expectedExists: false,
			description:    "Default values should not be considered overridden by external config",
		},
		{
			name: "Config file override",
			envVars: map[string]string{
				"CONFIG": "/path/to/config.env",
			},
			args:           []string{"--config", "/test/config.env"},
			testKey:        "config.storage_type",
			expectedValue:  "",
			expectedExists: false,
			description:    "Config file args should be detected (though file doesn't exist in test)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary database
			tmpDB := "/tmp/test_config_detection_" + strings.ReplaceAll(tt.name, " ", "_") + ".db"
			defer os.Remove(tmpDB)

			// Initialize database and registry store
			db, registryStore := setupTestRegistry(t, tmpDB)
			defer db.Close()

			// Set registry values
			ctx := context.Background()
			for key, value := range tt.registryValues {
				_, err := registryStore.Set(ctx, registrystore.SystemOwnerID, key, value, false)
				require.NoError(t, err)
			}

			// Set environment variables
			for envKey, envValue := range tt.envVars {
				os.Setenv(envKey, envValue)
				defer os.Unsetenv(envKey)
			}

			// Prepare args with JWT secret
			args := append([]string{"--jwt-secret", "test-secret"}, tt.args...)

			// Load config with registry
			cfg, err := Load(args, registryStore)
			require.NoError(t, err, tt.description)
			require.NotNil(t, cfg)

			// Test GetByRegistryKey - now properly tracks overridden flags
			effectiveValue, exists := cfg.GetByRegistryKey(tt.testKey)

			// Check if the result matches expectations
			assert.Equal(t, tt.expectedExists, exists, "GetByRegistryKey exists should match expected: %s", tt.description)
			assert.Equal(t, tt.expectedValue, effectiveValue, "GetByRegistryKey value should match expected: %s", tt.description)
		})
	}
}

func TestValueSourceTracking(t *testing.T) {
	// Create temporary database
	tmpDB := "/tmp/test_value_source_tracking.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// Set registry values
	ctx := context.Background()
	_, err := registryStore.Set(ctx, registrystore.SystemOwnerID, "config.storage_type", "s3", false)
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.allow_guest_mode", "true", false)
	require.NoError(t, err)

	// Set environment variable (should override registry)
	os.Setenv("STORAGE_TYPE", "file")
	defer os.Unsetenv("STORAGE_TYPE")

	// Load config
	cfg, err := Load([]string{"--jwt-secret", "test-secret", "--imagor-mode", "disabled"}, registryStore)
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Note: We no longer track overridden flags in the config struct
	// This functionality has been moved to the loading process only

	// Verify actual config values
	assert.Equal(t, "file", cfg.StorageType, "StorageType should be overridden by env")
	assert.Equal(t, true, cfg.AllowGuestMode, "AllowGuestMode should come from registry")
	assert.Equal(t, "disabled", cfg.ImagorMode, "ImagorMode should come from args")
}

// Helper function to set up test registry
func setupTestRegistry(t *testing.T, dbPath string) (*bun.DB, registrystore.Store) {
	// Initialize database
	sqldb, err := sql.Open(sqliteshim.ShimName, dbPath)
	require.NoError(t, err)

	db := bun.NewDB(sqldb, sqlitedialect.New())

	// Run migrations
	migrator := migrate.NewMigrator(db, migrations.Migrations)
	err = migrator.Init(context.Background())
	require.NoError(t, err)

	_, err = migrator.Migrate(context.Background())
	require.NoError(t, err)

	// Initialize encryption and registry store
	encryptionService := encryption.NewService(dbPath)
	registryStore := registrystore.New(db, zap.NewNop(), encryptionService)

	return db, registryStore
}
