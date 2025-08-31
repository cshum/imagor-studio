package config

import (
	"context"
	"database/sql"
	"os"
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
	cfg, err := Load(&LoadOptions{Args: []string{"--jwt-secret", "test-secret"}})
	require.NoError(t, err)
	require.NotNil(t, cfg)

	// Verify default values
	assert.Equal(t, 8080, cfg.Port)
	assert.Equal(t, "storage.db", cfg.DBPath)
	assert.Equal(t, "file", cfg.StorageType)
	assert.Equal(t, "./storage", cfg.FileBaseDir)
	assert.Equal(t, "external", cfg.ImagorMode)
	assert.Equal(t, "http://localhost:8000", cfg.ImagorURL)
	assert.Equal(t, 24*time.Hour, cfg.JWTExpiration)
	assert.NotNil(t, cfg.Logger)
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

	cfg, err := Load(&LoadOptions{Args: args})
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

	cfg, err := Load(&LoadOptions{Args: []string{"--jwt-secret", "test-secret"}})
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

	// Set registry values
	ctx := context.Background()
	_, err := registryStore.Set(ctx, "system", "storage_type", "s3")
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, "system", "s3_bucket", "registry-bucket")
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, "system", "imagor_mode", "disabled")
	require.NoError(t, err)

	// Load config with registry
	cfg, err := Load(&LoadOptions{
		RegistryStore: registryStore,
		Args:          []string{"--jwt-secret", "test-secret"},
	})
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
	_, err := registryStore.Set(ctx, "system", "storage_type", "s3")
	require.NoError(t, err)

	// Set environment variable (should override registry)
	os.Setenv("STORAGE_TYPE", "file")
	defer os.Unsetenv("STORAGE_TYPE")

	// Load config with registry
	cfg, err := Load(&LoadOptions{
		RegistryStore: registryStore,
		Args:          []string{"--jwt-secret", "test-secret"},
	})
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
	_, err := registryStore.Set(ctx, "system", "storage_type", "s3")
	require.NoError(t, err)

	// Set environment variable
	os.Setenv("STORAGE_TYPE", "file")
	defer os.Unsetenv("STORAGE_TYPE")

	// Use command line args (should have highest priority)
	args := []string{"--storage-type", "filesystem", "--jwt-secret", "test-secret"}

	cfg, err := Load(&LoadOptions{
		RegistryStore: registryStore,
		Args:          args,
	})
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

func TestRegistryParser(t *testing.T) {
	// Create temporary database
	tmpDB := "/tmp/test_registry_parser.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store
	db, registryStore := setupTestRegistry(t, tmpDB)
	defer db.Close()

	// Set registry values
	ctx := context.Background()
	_, err := registryStore.Set(ctx, "system", "storage_type", "s3")
	require.NoError(t, err)
	_, err = registryStore.Set(ctx, "system", "s3_bucket", "parser-bucket")
	require.NoError(t, err)

	// Create parser
	parser := NewRegistryParser(registryStore)
	require.NotNil(t, parser)

	// Test parsing
	values := make(map[string]string)
	setFunc := func(name, value string) error {
		values[name] = value
		return nil
	}

	err = parser.Parse(nil, setFunc) // reader is not used
	require.NoError(t, err)

	// Verify values were set
	assert.Equal(t, "s3", values["storage-type"])
	assert.Equal(t, "parser-bucket", values["s3-bucket"])
}

func TestGetRegistryKeyForFlag(t *testing.T) {
	tests := []struct {
		flagName    string
		expectedKey string
	}{
		{"storage-type", "storage_type"},
		{"s3-bucket", "s3_bucket"},
		{"imagor-mode", "imagor_mode"},
		{"file-base-dir", "file_base_dir"},
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

	cfg, err := Load(&LoadOptions{Args: args})
	require.NoError(t, err)
	require.NotNil(t, cfg)

	assert.Equal(t, "test-jwt-secret", cfg.JWTSecret)
}

func TestConfigWithImagorSecret(t *testing.T) {
	// Test that imagor secret is used as JWT secret when JWT secret is not provided
	args := []string{
		"--imagor-secret", "test-imagor-secret",
	}

	cfg, err := Load(&LoadOptions{Args: args})
	require.NoError(t, err)
	require.NotNil(t, cfg)

	assert.Equal(t, "test-imagor-secret", cfg.JWTSecret)
	assert.Equal(t, "test-imagor-secret", cfg.ImagorSecret)
}

func TestConfigRequiresJWTSecret(t *testing.T) {
	// Test that config loading fails when no JWT or Imagor secret is provided
	args := []string{
		"--port", "8080",
	}

	_, err := Load(&LoadOptions{Args: args})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "jwt-secret is required")
}

func TestConfigFilePermissions(t *testing.T) {
	// Test file permission parsing
	args := []string{
		"--file-mkdir-permissions", "0755",
		"--file-write-permissions", "0644",
		"--jwt-secret", "test-secret",
	}

	cfg, err := Load(&LoadOptions{Args: args})
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
			_, err := Load(&LoadOptions{Args: tt.args})
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.errorContains)
		})
	}
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
	encryptionService := encryption.NewServiceWithMasterKeyOnly(dbPath)
	registryStore := registrystore.New(db, zap.NewNop(), encryptionService)

	return db, registryStore
}
