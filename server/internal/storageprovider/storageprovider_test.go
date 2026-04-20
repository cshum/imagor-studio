package storageprovider

import (
	"context"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/pkg/storage/filestorage"
	"github.com/cshum/imagor-studio/server/pkg/storage/noopstorage"
	"github.com/cshum/imagor-studio/server/pkg/storage/s3storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockRegistryStore is a mock implementation of registrystore.Store for testing
type MockRegistryStore struct {
	mock.Mock
}

func (m *MockRegistryStore) Get(ctx context.Context, ownerID, key string) (*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) GetMulti(ctx context.Context, ownerID string, keys []string) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, keys)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) Set(ctx context.Context, ownerID, key, value string, encrypted bool) (*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, key, value, encrypted)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) SetMulti(ctx context.Context, ownerID string, entries []*registrystore.Registry) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, entries)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) List(ctx context.Context, ownerID string, keyPrefix *string) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, keyPrefix)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) Delete(ctx context.Context, ownerID, key string) error {
	args := m.Called(ctx, ownerID, key)
	return args.Error(0)
}

func (m *MockRegistryStore) DeleteMulti(ctx context.Context, ownerID string, keys []string) error {
	args := m.Called(ctx, ownerID, keys)
	return args.Error(0)
}

func (m *MockRegistryStore) DeleteByPrefix(ctx context.Context, ownerID, keyPrefix string) error {
	args := m.Called(ctx, ownerID, keyPrefix)
	return args.Error(0)
}

func (m *MockRegistryStore) GetEffectiveValue(ctx context.Context, ownerID, key string, fallbackConfig *config.Config) (string, bool) {
	args := m.Called(ctx, ownerID, key, fallbackConfig)
	return args.String(0), args.Bool(1)
}

func TestNew(t *testing.T) {
	logger := zap.NewNop()

	provider := New(logger, nil, nil) // nil registry store and config for basic test

	assert.NotNil(t, provider)
	assert.Equal(t, logger, provider.logger)
}

func TestProvider_NewFileStorage(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		FileStorageBaseDir:          "./test-storage",
		FileStorageMkdirPermissions: 0755,
		FileStorageWritePermissions: 0644,
	}

	storage, err := provider.NewFileStorage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewS3Storage(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		S3StorageBucket:    "test-bucket",
		AWSRegion:          "us-east-1",
		AWSAccessKeyID:     "test-key",
		AWSSecretAccessKey: "test-secret",
	}

	storage, err := provider.NewS3Storage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewS3Storage_WithForcePathStyle(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		S3StorageBucket:    "test-bucket",
		AWSRegion:          "us-east-1",
		AWSAccessKeyID:     "test-key",
		AWSSecretAccessKey: "test-secret",
		S3ForcePathStyle:   true,
	}

	storage, err := provider.NewS3Storage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)

	// Cast to S3Storage to verify the type
	_, ok := storage.(*s3storage.S3Storage)
	assert.True(t, ok, "storage should be of type *s3storage.S3Storage")
	// Note: We can't directly access the forcePathStyle field since it's private,
	// but we can verify the storage was created successfully with the config
}

func TestProvider_NewS3Storage_WithForcePathStyleFalse(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		S3StorageBucket:    "test-bucket",
		AWSRegion:          "us-east-1",
		AWSAccessKeyID:     "test-key",
		AWSSecretAccessKey: "test-secret",
		S3ForcePathStyle:   false,
	}

	storage, err := provider.NewS3Storage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)

	// Cast to S3Storage to verify the type
	_, ok := storage.(*s3storage.S3Storage)
	assert.True(t, ok, "storage should be of type *s3storage.S3Storage")
}

func TestProvider_NewS3Storage_MissingBucket(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		S3StorageBucket: "", // Missing bucket
	}

	storage, err := provider.NewS3Storage(cfg)

	assert.Error(t, err)
	assert.Nil(t, storage)
	assert.Contains(t, err.Error(), "s3-storage-bucket is required")
}

func TestProvider_NewStorageFromConfig_File(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		StorageType:                 "file",
		FileStorageBaseDir:          "./test-storage",
		FileStorageMkdirPermissions: 0755,
		FileStorageWritePermissions: 0644,
	}

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewStorageFromConfig_S3(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		StorageType:        "s3",
		S3StorageBucket:    "test-bucket",
		AWSRegion:          "us-east-1",
		AWSAccessKeyID:     "test-key",
		AWSSecretAccessKey: "test-secret",
	}

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewStorageFromConfig_UnsupportedType(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		StorageType: "unsupported",
	}

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.Error(t, err)
	assert.Nil(t, storage)
	assert.Contains(t, err.Error(), "unsupported storage type")
}

// Test InitializeWithConfig with valid environment file storage configuration
func TestProvider_InitializeWithConfig_ValidFileEnvConfig(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := &MockRegistryStore{}

	cfg := &config.Config{
		StorageType:                 "file",
		FileStorageBaseDir:          "./test-storage",
		FileStorageMkdirPermissions: 0755,
		FileStorageWritePermissions: 0644,
	}

	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.True(t, provider.configured)
	assert.NotNil(t, provider.currentStorage)

	// Verify it's file storage
	_, ok := provider.currentStorage.(*filestorage.FileStorage)
	assert.True(t, ok, "storage should be of type *filestorage.FileStorage")

	// Mock should not be called since env config worked
	mockRegistry.AssertNotCalled(t, "Get")
}

// Test InitializeWithConfig with valid environment S3 storage configuration
func TestProvider_InitializeWithConfig_ValidS3EnvConfig(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := &MockRegistryStore{}

	cfg := &config.Config{
		StorageType:        "s3",
		S3StorageBucket:    "test-bucket",
		AWSRegion:          "us-east-1",
		AWSAccessKeyID:     "test-key",
		AWSSecretAccessKey: "test-secret",
	}

	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.True(t, provider.configured)
	assert.NotNil(t, provider.currentStorage)

	// Verify it's S3 storage
	_, ok := provider.currentStorage.(*s3storage.S3Storage)
	assert.True(t, ok, "storage should be of type *s3storage.S3Storage")

	// Mock should not be called since env config worked
	mockRegistry.AssertNotCalled(t, "Get")
}

// Test InitializeWithConfig with invalid env config but registry has config (lazy loading)
func TestProvider_InitializeWithConfig_InvalidEnvValidRegistry(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := &MockRegistryStore{}

	// Invalid S3 config (missing bucket)
	cfg := &config.Config{
		StorageType:     "s3",
		S3StorageBucket: "", // Missing required bucket
	}

	// Mock registry to indicate storage is configured
	mockRegistry.On("GetMulti", mock.Anything, registrystore.SystemOwnerID, []string{"config.storage_configured"}).
		Return([]*registrystore.Registry{{Key: "config.storage_configured", Value: "true"}}, nil)

	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.False(t, provider.configured)
	assert.NotNil(t, provider.currentStorage)

	// Verify it's NoOp storage (for lazy loading)
	_, ok := provider.currentStorage.(*noopstorage.NoOpStorage)
	assert.True(t, ok, "storage should be of type *noopstorage.NoOpStorage")

	// Verify registry was checked
	mockRegistry.AssertExpectations(t)
}

// Test InitializeWithConfig with invalid env config and no registry config
func TestProvider_InitializeWithConfig_NoConfigAnywhere(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := &MockRegistryStore{}

	// Invalid config
	cfg := &config.Config{
		StorageType:     "s3",
		S3StorageBucket: "", // Missing required bucket
	}

	// Mock registry to indicate no storage configured
	mockRegistry.On("GetMulti", mock.Anything, registrystore.SystemOwnerID, []string{"config.storage_configured"}).
		Return([]*registrystore.Registry{}, nil) // No entries found

	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.False(t, provider.configured)
	assert.NotNil(t, provider.currentStorage)

	// Verify it's NoOp storage
	_, ok := provider.currentStorage.(*noopstorage.NoOpStorage)
	assert.True(t, ok, "storage should be of type *noopstorage.NoOpStorage")

	// Verify registry was checked
	mockRegistry.AssertExpectations(t)
}

// Test InitializeWithConfig with unsupported storage type in env config
func TestProvider_InitializeWithConfig_UnsupportedEnvType(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := &MockRegistryStore{}

	cfg := &config.Config{
		StorageType: "unsupported",
	}

	// Mock registry to indicate no storage configured
	mockRegistry.On("GetMulti", mock.Anything, registrystore.SystemOwnerID, []string{"config.storage_configured"}).
		Return([]*registrystore.Registry{}, nil) // No entries found

	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.False(t, provider.configured)
	assert.NotNil(t, provider.currentStorage)

	// Verify it's NoOp storage
	_, ok := provider.currentStorage.(*noopstorage.NoOpStorage)
	assert.True(t, ok, "storage should be of type *noopstorage.NoOpStorage")

	mockRegistry.AssertExpectations(t)
}

// Test InitializeWithConfig with registry configured but env config takes precedence
func TestProvider_InitializeWithConfig_EnvOverridesRegistry(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := &MockRegistryStore{}

	// Valid env config
	cfg := &config.Config{
		StorageType:                 "file",
		FileStorageBaseDir:          "./test-storage",
		FileStorageMkdirPermissions: 0755,
		FileStorageWritePermissions: 0644,
	}

	// Even though registry has config, env should take precedence
	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.True(t, provider.configured)
	assert.NotNil(t, provider.currentStorage)

	// Verify it's file storage from env config
	_, ok := provider.currentStorage.(*filestorage.FileStorage)
	assert.True(t, ok, "storage should be of type *filestorage.FileStorage")

	// Registry should not be called since env config worked
	mockRegistry.AssertNotCalled(t, "Get")
}

// ── storageConfigKey helper ───────────────────────────────────────────────────

func TestStorageConfigKey_File(t *testing.T) {
	cfg := &config.Config{
		StorageType:                 "file",
		FileStorageBaseDir:          "/srv/gallery",
		FileStorageMkdirPermissions: 0755,
		FileStorageWritePermissions: 0644,
	}
	key := storageConfigKey(cfg)
	assert.Len(t, key, 16, "fingerprint must be 16 hex chars")

	// Changing baseDir must produce a different key.
	cfg2 := *cfg
	cfg2.FileStorageBaseDir = "/other"
	assert.NotEqual(t, key, storageConfigKey(&cfg2), "baseDir change must change key")

	// Changing mkdir permissions must produce a different key.
	cfg3 := *cfg
	cfg3.FileStorageMkdirPermissions = 0700
	assert.NotEqual(t, key, storageConfigKey(&cfg3), "mkdir permission change must change key")

	// Changing write permissions must produce a different key.
	cfg4 := *cfg
	cfg4.FileStorageWritePermissions = 0600
	assert.NotEqual(t, key, storageConfigKey(&cfg4), "write permission change must change key")
}

func TestStorageConfigKey_S3(t *testing.T) {
	cfg := &config.Config{
		StorageType:        "s3",
		S3StorageBucket:    "my-bucket",
		AWSRegion:          "us-east-1",
		AWSAccessKeyID:     "AKID",
		AWSSecretAccessKey: "secret",
		S3ForcePathStyle:   false,
	}
	key := storageConfigKey(cfg)
	assert.Len(t, key, 16, "fingerprint must be 16 hex chars")

	// Rotating the access key ID must change the key.
	cfg2 := *cfg
	cfg2.AWSAccessKeyID = "NEW_AKID"
	assert.NotEqual(t, key, storageConfigKey(&cfg2), "access key ID rotation must change key")

	// Rotating only the secret must change the key.
	cfg3 := *cfg
	cfg3.AWSSecretAccessKey = "new-secret"
	assert.NotEqual(t, key, storageConfigKey(&cfg3), "secret rotation must change key")

	// Enabling force-path-style must change the key.
	cfg4 := *cfg
	cfg4.S3ForcePathStyle = true
	assert.NotEqual(t, key, storageConfigKey(&cfg4), "pathStyle change must change key")

	// Changing the session token must change the key.
	cfg5 := *cfg
	cfg5.AWSSessionToken = "new-token"
	assert.NotEqual(t, key, storageConfigKey(&cfg5), "session token change must change key")
}

func TestStorageConfigKey_Deterministic(t *testing.T) {
	cfg := &config.Config{
		StorageType:        "file",
		FileStorageBaseDir: "/deterministic",
	}
	assert.Equal(t, storageConfigKey(cfg), storageConfigKey(cfg), "key must be deterministic")
}

// ── ReloadFromRegistry no-op optimisation ────────────────────────────────────

// buildFileRegistryMock returns a MockRegistryStore that serves a valid file
// storage configuration (storage_configured=true, storage_type=file,
// file_storage_base_dir=/tmp/test-reload).
func buildFileRegistryMock() *MockRegistryStore {
	mockRegistry := &MockRegistryStore{}

	// isStorageConfiguredInRegistry — uses GetMulti with just ["config.storage_configured"]
	mockRegistry.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
		[]string{"config.storage_configured"}).
		Return([]*registrystore.Registry{{Key: "config.storage_configured", Value: "true"}}, nil)

	// buildConfigFromRegistry — uses GetMulti with the full key list
	mockRegistry.On("GetMulti", mock.Anything, registrystore.SystemOwnerID, mock.MatchedBy(func(keys []string) bool {
		for _, k := range keys {
			if k == "config.storage_type" {
				return true
			}
		}
		return false
	})).Return([]*registrystore.Registry{
		{Key: "config.storage_configured", Value: "true"},
		{Key: "config.storage_type", Value: "file"},
		{Key: "config.file_storage_base_dir", Value: "/tmp/test-reload"},
	}, nil)

	return mockRegistry
}

func TestReloadFromRegistry_NoOpWhenUnchanged(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := buildFileRegistryMock()

	cfg := &config.Config{}
	provider := New(logger, mockRegistry, cfg)

	// First reload: loads from registry, sets configKey, creates storage.
	err := provider.ReloadFromRegistry()
	assert.NoError(t, err)
	assert.True(t, provider.configured)
	assert.NotEmpty(t, provider.configKey, "configKey must be set after first reload")

	firstStorage := provider.currentStorage

	// Second reload: configKey already matches → storage must NOT be replaced.
	err = provider.ReloadFromRegistry()
	assert.NoError(t, err)
	assert.Same(t, firstStorage, provider.currentStorage,
		"storage instance must not be replaced when config is unchanged")
}

func TestReloadFromRegistry_ReloadsWhenChanged(t *testing.T) {
	logger := zap.NewNop()

	// First registry answers: /tmp/old-dir
	mockRegistry1 := &MockRegistryStore{}
	mockRegistry1.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
		[]string{"config.storage_configured"}).
		Return([]*registrystore.Registry{{Key: "config.storage_configured", Value: "true"}}, nil)
	mockRegistry1.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
		mock.MatchedBy(func(keys []string) bool {
			for _, k := range keys {
				if k == "config.storage_type" {
					return true
				}
			}
			return false
		})).Return([]*registrystore.Registry{
		{Key: "config.storage_type", Value: "file"},
		{Key: "config.file_storage_base_dir", Value: "/tmp/old-dir"},
	}, nil)

	cfg := &config.Config{}
	provider := New(logger, mockRegistry1, cfg)

	err := provider.ReloadFromRegistry()
	assert.NoError(t, err)
	assert.NotEmpty(t, provider.configKey)
	firstKey := provider.configKey
	firstStorage := provider.currentStorage

	// Switch to a registry that returns a different base dir.
	mockRegistry2 := &MockRegistryStore{}
	mockRegistry2.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
		[]string{"config.storage_configured"}).
		Return([]*registrystore.Registry{{Key: "config.storage_configured", Value: "true"}}, nil)
	mockRegistry2.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
		mock.MatchedBy(func(keys []string) bool {
			for _, k := range keys {
				if k == "config.storage_type" {
					return true
				}
			}
			return false
		})).Return([]*registrystore.Registry{
		{Key: "config.storage_type", Value: "file"},
		{Key: "config.file_storage_base_dir", Value: "/tmp/new-dir"},
	}, nil)

	provider.registryStore = mockRegistry2

	err = provider.ReloadFromRegistry()
	assert.NoError(t, err)
	assert.NotEmpty(t, provider.configKey)
	assert.NotEqual(t, firstKey, provider.configKey, "fingerprint must change when config changes")
	assert.NotSame(t, firstStorage, provider.currentStorage,
		"storage instance must be replaced when config changes")
}

func TestReloadFromRegistry_NoOpNoLog_WhenNotConfigured(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := &MockRegistryStore{}
	mockRegistry.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
		[]string{"config.storage_configured"}).
		Return([]*registrystore.Registry{}, nil) // not configured

	provider := New(logger, mockRegistry, &config.Config{})

	// Should return nil without touching storage.
	err := provider.ReloadFromRegistry()
	assert.NoError(t, err)
	assert.False(t, provider.configured)
	assert.Empty(t, provider.configKey)
}

// ── Existing test (unchanged) ─────────────────────────────────────────────────

// Test that GetStorage still works with the new InitializeWithConfig logic
func TestProvider_GetStorage_AfterEnvInitialization(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := &MockRegistryStore{}

	cfg := &config.Config{
		StorageType:                 "file",
		FileStorageBaseDir:          "./test-storage",
		FileStorageMkdirPermissions: 0755,
		FileStorageWritePermissions: 0644,
	}

	provider := New(logger, mockRegistry, cfg)

	// Initialize with env config
	err := provider.InitializeWithConfig(cfg)
	assert.NoError(t, err)

	// GetStorage should return the configured storage immediately
	storage := provider.GetStorage()
	assert.NotNil(t, storage)

	// Verify it's file storage
	_, ok := storage.(*filestorage.FileStorage)
	assert.True(t, ok, "storage should be of type *filestorage.FileStorage")

	// Should be the same instance
	assert.Equal(t, provider.currentStorage, storage)
}

// ─── TestNewStorageFromSpaceConfig ────────────────────────────────────────────

// TestNewStorageFromSpaceConfig_EmptyBucket: bucket is required — empty string
// must return a descriptive error and nil storage.
func TestNewStorageFromSpaceConfig_EmptyBucket(t *testing.T) {
	logger := zap.NewNop()
	p := New(logger, nil, nil)

	stor, err := p.NewStorageFromSpaceConfig(
		"s3", "", "prefix", "us-east-1", "", "key", "secret", false,
	)
	assert.Error(t, err)
	assert.Nil(t, stor)
	assert.Contains(t, err.Error(), "bucket is required")
}

// TestNewStorageFromSpaceConfig_Valid: a non-empty bucket with any credentials
// builds an S3 storage client without making network calls.
func TestNewStorageFromSpaceConfig_Valid(t *testing.T) {
	logger := zap.NewNop()
	p := New(logger, nil, nil)

	stor, err := p.NewStorageFromSpaceConfig(
		"s3", "my-bucket", "assets/",
		"us-east-1", "https://s3.example.com",
		"AKIATEST", "supersecret",
		false,
	)
	assert.NoError(t, err)
	assert.NotNil(t, stor)

	// Verify the returned type is an S3 storage instance (not file or noop).
	_, isS3 := stor.(*s3storage.S3Storage)
	assert.True(t, isS3, "expected *s3storage.S3Storage")
}

// TestNewStorageFromSpaceConfig_R2Type: "r2" and "managed" storage types are
// also S3-protocol-compatible and should produce a valid S3 storage.
func TestNewStorageFromSpaceConfig_R2Type(t *testing.T) {
	logger := zap.NewNop()
	p := New(logger, nil, nil)

	stor, err := p.NewStorageFromSpaceConfig(
		"r2", "cf-bucket", "",
		"auto", "https://xxxx.r2.cloudflarestorage.com",
		"token-id", "token-secret",
		true,
	)
	assert.NoError(t, err)
	assert.NotNil(t, stor)

	_, isS3 := stor.(*s3storage.S3Storage)
	assert.True(t, isS3, "expected *s3storage.S3Storage for r2 type")
}
