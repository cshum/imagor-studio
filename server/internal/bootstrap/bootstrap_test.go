package bootstrap

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/migrator"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/pkg/encryption"
	"github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/cshum/imagor/imagorpath"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type stubSpaceConfigStore struct{}

type stubUsageRecorder struct{}

func (stubUsageRecorder) RecordProcessed(context.Context) {}
func (stubUsageRecorder) Flush(context.Context) error     { return nil }

type passthroughDecorator struct{}

func (passthroughDecorator) WrapProcessor(next imagor.Processor) imagor.Processor { return next }

func (stubSpaceConfigStore) Get(key string) (processing.SpaceConfig, bool) {
	return nil, false
}

func (stubSpaceConfigStore) GetByHostname(hostname string) (processing.SpaceConfig, bool) {
	return nil, false
}

func (stubSpaceConfigStore) Start(ctx context.Context) error {
	return nil
}

func (stubSpaceConfigStore) Ready() bool {
	return true
}

func stubProcessingRuntimeFactory() ProcessingRuntimeFactory {
	return func(runtimeCfg processing.RuntimeConfig, logger *zap.Logger) (processing.SpaceConfigReader, imagor.Loader, error) {
		_ = runtimeCfg
		_ = logger
		return stubSpaceConfigStore{}, nil, nil
	}
}

func TestInitialize(t *testing.T) {
	// Create a temporary database file
	tmpDB := "/tmp/test_bootstrap.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		Port:                        8080,
		DatabaseURL:                 "sqlite:" + tmpDB,
		JWTSecret:                   "test-jwt-secret",
		JWTExpiration:               168 * time.Hour,
		StorageType:                 "file",
		FileStorageBaseDir:          "/tmp/test-storage",
		FileStorageMkdirPermissions: 0755,
		FileStorageWritePermissions: 0644,
		ImagorSecret:                "",
	}

	logger := zap.NewNop()
	args := []string{"--jwt-secret", "test-jwt-secret", "--database-url", "sqlite:" + tmpDB}
	services, err := Initialize(cfg, logger, args, "selfhosted")

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

func TestInitializeEmbeddedMode(t *testing.T) {
	cfg := &config.Config{
		Port:               8080,
		EmbeddedMode:       true, // Enable embedded mode
		JWTSecret:          "test-jwt-secret",
		JWTExpiration:      168 * time.Hour,
		StorageType:        "file",
		FileStorageBaseDir: "/tmp/test-storage",
	}

	logger := zap.NewNop()
	args := []string{"--embedded-mode", "--jwt-secret", "test-jwt-secret"}
	services, err := Initialize(cfg, logger, args, "selfhosted")

	require.NoError(t, err)
	require.NotNil(t, services)

	// Verify embedded mode characteristics
	assert.Nil(t, services.DB, "Database should be nil in embedded mode")
	assert.Nil(t, services.Encryption, "Encryption service should be nil in embedded mode")

	// Verify essential services are still initialized
	assert.NotNil(t, services.TokenManager)
	assert.NotNil(t, services.Storage)
	assert.NotNil(t, services.StorageProvider)
	assert.NotNil(t, services.ImagorProvider)
	assert.NotNil(t, services.RegistryStore)
	assert.NotNil(t, services.UserStore)
	assert.NotNil(t, services.LicenseService)
	assert.NotNil(t, services.Logger)

	// Verify JWT secret was set
	assert.Equal(t, "test-jwt-secret", cfg.JWTSecret)

	// Test that no-op stores return appropriate errors
	ctx := context.Background()

	// Test registry store returns embedded mode error
	_, err = services.RegistryStore.Get(ctx, "test", "test-key")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "embedded mode")

	// Test user store returns embedded mode error
	_, err = services.UserStore.GetByID(ctx, "test-id")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "embedded mode")
}

func TestEmbeddedModeJWTSecretGeneration(t *testing.T) {
	cfg := &config.Config{
		Port:         8080,
		EmbeddedMode: true,
		// No JWT secret provided - should generate static one
		JWTExpiration:      168 * time.Hour,
		StorageType:        "file",
		FileStorageBaseDir: "/tmp/test-storage",
	}

	logger := zap.NewNop()
	args := []string{"--embedded-mode"}
	services, err := Initialize(cfg, logger, args, "selfhosted")

	require.NoError(t, err)
	require.NotNil(t, services)

	// Verify static JWT secret was generated
	assert.NotEmpty(t, cfg.JWTSecret)
	assert.Equal(t, "embedded-mode-static-secret-change-in-production", cfg.JWTSecret)

	// Verify TokenManager works with the generated secret
	assert.NotNil(t, services.TokenManager)
}

func TestInitializeDatabase(t *testing.T) {
	tmpDB := "/tmp/test_init_db.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DatabaseURL: "sqlite:" + tmpDB,
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
	cfg, err := config.Load([]string{"--database-url", "sqlite:" + tmpDB}, nil)
	require.NoError(t, err)

	// Verify JWT secret from environment was used
	assert.Equal(t, envSecret, cfg.JWTSecret)
}

func TestJWTSecretFromRegistry(t *testing.T) {
	tmpDB := "/tmp/test_jwt_registry.db"
	defer os.Remove(tmpDB)

	// Initialize database and registry store first
	cfg := &config.Config{
		DatabaseURL: "sqlite:" + tmpDB,
	}

	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	logger := zap.NewNop()
	service := migrator.NewService(db, logger)
	cfg.MigrateCommand = "up"
	err = service.Execute(cfg)
	require.NoError(t, err)

	encryptionService := encryption.NewService(cfg.DatabaseURL)
	// Set a JWT key for encryption to work
	encryptionService.SetJWTKey("test-jwt-key")
	registryStore := registrystore.New(db, logger, encryptionService)

	// Pre-store a secret in registry (JWT secrets must be encrypted)
	existingSecret := "existing-registry-secret"
	ctx := context.Background()
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.jwt_secret", existingSecret, true)
	require.NoError(t, err)

	// Test config loading with registry enhancement
	enhancedCfg, err := config.Load([]string{"--database-url", "sqlite:" + tmpDB}, registryStore)
	require.NoError(t, err)

	// Verify JWT secret from registry was used
	assert.Equal(t, existingSecret, enhancedCfg.JWTSecret)
}

func TestConfigEnhancement(t *testing.T) {
	tmpDB := "/tmp/test_config_enhancement.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DatabaseURL: "sqlite:" + tmpDB,
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	logger := zap.NewNop()
	service := migrator.NewService(db, logger)
	cfg.MigrateCommand = "up"
	err = service.Execute(cfg)
	require.NoError(t, err)

	encryptionService := encryption.NewService(cfg.DatabaseURL)
	registryStore := registrystore.New(db, logger, encryptionService)

	// Test that config enhancement works with registry values
	ctx := context.Background()

	// Set some registry values
	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.storage_type", "s3", false)
	require.NoError(t, err)

	_, err = registryStore.Set(ctx, registrystore.SystemOwnerID, "config.s3_storage_bucket", "test-bucket", false)
	require.NoError(t, err)

	// Load config with registry enhancement
	enhancedCfg, err := config.Load([]string{"--jwt-secret", "test-secret"}, registryStore)
	require.NoError(t, err)

	// Verify that registry values were applied
	assert.Equal(t, "s3", enhancedCfg.StorageType)
	assert.Equal(t, "test-bucket", enhancedCfg.S3StorageBucket)
}

func TestConfigEnhancementWithEnvPriority(t *testing.T) {
	tmpDB := "/tmp/test_config_env_priority.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DatabaseURL: "sqlite:" + tmpDB,
	}

	// Initialize minimal services for test
	db, err := initializeDatabase(cfg)
	require.NoError(t, err)
	defer db.Close()

	logger := zap.NewNop()
	service := migrator.NewService(db, logger)
	cfg.MigrateCommand = "up"
	err = service.Execute(cfg)
	require.NoError(t, err)

	encryptionService := encryption.NewService(cfg.DatabaseURL)
	registryStore := registrystore.New(db, logger, encryptionService)

	// Set environment variables (s3 requires bucket)
	os.Setenv("STORAGE_TYPE", "s3")
	os.Setenv("S3_STORAGE_BUCKET", "env-test-bucket")
	defer func() {
		os.Unsetenv("STORAGE_TYPE")
		os.Unsetenv("S3_STORAGE_BUCKET")
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
	assert.Equal(t, "env-test-bucket", enhancedCfg.S3StorageBucket)
}

// ── Processing-mode tests ─────────────────────────────────────────────────────

func TestInitializeProcessingMode_MissingJWT(t *testing.T) {
	logger := zap.NewNop()
	cfg := &config.Config{
		// JWTSecret intentionally empty — must cause an error.
	}
	nodeCfg := processing.NodeConfig{Runtime: processing.RuntimeConfig{SpacesEndpoint: "http://management.example.test"}}
	_, err := InitializeProcessingWithFactory(cfg, nodeCfg, logger, stubProcessingRuntimeFactory())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "IMAGOR_JWT_SECRET")
}

func TestInitializeProcessingMode_Success(t *testing.T) {
	logger := zap.NewNop()
	cfg := &config.Config{
		JWTSecret:     "test-jwt-secret",
		JWTExpiration: 24 * time.Hour,
	}
	nodeCfg := processing.NodeConfig{
		Runtime: processing.RuntimeConfig{
			SpacesEndpoint:    "http://management.example.test",
			InternalAPISecret: "test-internal-secret",
			SpaceBaseDomain:   "imagor.test",
		},
	}
	svc, err := InitializeProcessingWithFactory(cfg, nodeCfg, logger, stubProcessingRuntimeFactory())
	require.NoError(t, err)

	// Processing nodes have no database.
	assert.Nil(t, svc.DB, "processing mode should have no DB")
	assert.Nil(t, svc.Storage, "processing mode has no management storage")
	assert.Nil(t, svc.Encryption, "processing mode has no encryption service")

	// SpaceConfigStore must be initialised (not started yet — Start() is called by the server).
	assert.NotNil(t, svc.SpaceConfigStore)

	// ImagorProvider must be ready to handle requests.
	assert.NotNil(t, svc.ImagorProvider)
	assert.NotNil(t, svc.TokenManager)
	assert.NotNil(t, svc.LicenseService)

	// All management stores are non-nil no-ops.
	assert.NotNil(t, svc.OrgStore, "noop OrgStore should be set")
	assert.NotNil(t, svc.SpaceStore, "noop SpaceStore should be set")
	assert.NotNil(t, svc.RegistryStore, "noop RegistryStore should be set")
	assert.NotNil(t, svc.UserStore, "noop UserStore should be set")
}

func TestInitializeProcessingMode_LogsInfo(t *testing.T) {
	// Smoke-test: ensure the function runs to completion without panicking even when
	// logger is provided (not Nop) and all optional fields are empty strings.
	logger, _ := zap.NewDevelopment()
	defer logger.Sync() //nolint:errcheck
	cfg := &config.Config{
		JWTSecret:     "must-not-be-empty",
		JWTExpiration: time.Hour,
	}
	nodeCfg := processing.NodeConfig{Runtime: processing.RuntimeConfig{SpacesEndpoint: "http://management.example.test"}}
	svc, err := InitializeProcessingWithFactory(cfg, nodeCfg, logger, stubProcessingRuntimeFactory())
	require.NoError(t, err)
	assert.NotNil(t, svc)
}

func TestInitializeProcessingMode_WithHooks(t *testing.T) {
	logger := zap.NewNop()
	cfg := &config.Config{JWTSecret: "test-jwt-secret", JWTExpiration: time.Hour}
	nodeCfg := processing.NodeConfig{Runtime: processing.RuntimeConfig{SpacesEndpoint: "http://management.example.test"}}
	hooks := processing.NodeHooks{ProcessorDecorator: passthroughDecorator{}, UsageRecorder: stubUsageRecorder{}}
	svc, err := InitializeProcessingWithFactoryAndHooks(cfg, nodeCfg, logger, stubProcessingRuntimeFactory(), hooks)
	require.NoError(t, err)
	assert.NotNil(t, svc)
	assert.NotNil(t, svc.ProcessingUsageRecorder)
}

func TestImagorProviderIntegration(t *testing.T) {
	tmpDB := "/tmp/test_imagor_provider.db"
	defer os.Remove(tmpDB)

	cfg := &config.Config{
		DatabaseURL:  "sqlite:" + tmpDB,
		JWTSecret:    "test-jwt-secret",
		ImagorSecret: "test-secret",
	}

	logger := zap.NewNop()
	args := []string{
		"--jwt-secret", "test-jwt-secret",
		"--database-url", "sqlite:" + tmpDB,
		"--imagor-secret", "test-secret",
	}
	services, err := Initialize(cfg, logger, args, "selfhosted")

	require.NoError(t, err)
	require.NotNil(t, services)
	require.NotNil(t, services.ImagorProvider)

	// Test that imagor provider has correct config
	imagorConfig := services.ImagorProvider.Config()
	require.NotNil(t, imagorConfig)
	assert.Equal(t, "test-secret", imagorConfig.Secret)

	// Test that imagor provider can generate signed URLs directly
	url, err := services.ImagorProvider.GenerateURL("test/image.jpg", imagorpath.Params{
		Width:  300,
		Height: 200,
	})
	require.NoError(t, err)
	assert.NotEmpty(t, url)
	// URL should be a signed URL containing the image path
	assert.Contains(t, url, "/test/image.jpg")
	assert.NotContains(t, url, "/unsafe/")

	// Clean up
	services.DB.Close()
}
