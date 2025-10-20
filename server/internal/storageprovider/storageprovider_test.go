package storageprovider

import (
	"context"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/noopstorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
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
		FileBaseDir:          "./test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
	}

	storage, err := provider.NewFileStorage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewS3Storage(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		S3Bucket:          "test-bucket",
		S3Region:          "us-east-1",
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
	}

	storage, err := provider.NewS3Storage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewS3Storage_WithForcePathStyle(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		S3Bucket:          "test-bucket",
		S3Region:          "us-east-1",
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
		S3ForcePathStyle:  true,
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
		S3Bucket:          "test-bucket",
		S3Region:          "us-east-1",
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
		S3ForcePathStyle:  false,
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
		S3Bucket: "", // Missing bucket
	}

	storage, err := provider.NewS3Storage(cfg)

	assert.Error(t, err)
	assert.Nil(t, storage)
	assert.Contains(t, err.Error(), "s3-bucket is required")
}

func TestProvider_NewStorageFromConfig_File(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		StorageType:          "file",
		FileBaseDir:          "./test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
	}

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewStorageFromConfig_S3(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger, nil, nil)

	cfg := &config.Config{
		StorageType:       "s3",
		S3Bucket:          "test-bucket",
		S3Region:          "us-east-1",
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
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
		StorageType:          "file",
		FileBaseDir:          "./test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
	}

	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.Equal(t, StorageStateConfigured, provider.storageState)
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
		StorageType:       "s3",
		S3Bucket:          "test-bucket",
		S3Region:          "us-east-1",
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
	}

	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.Equal(t, StorageStateConfigured, provider.storageState)
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
		StorageType: "s3",
		S3Bucket:    "", // Missing required bucket
	}

	// Mock registry to indicate storage is configured
	mockRegistry.On("GetMulti", mock.Anything, registrystore.SystemOwnerID, []string{"config.storage_configured"}).
		Return([]*registrystore.Registry{{Key: "config.storage_configured", Value: "true"}}, nil)

	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.Equal(t, StorageStateNoop, provider.storageState)
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
		StorageType: "s3",
		S3Bucket:    "", // Missing required bucket
	}

	// Mock registry to indicate no storage configured
	mockRegistry.On("GetMulti", mock.Anything, registrystore.SystemOwnerID, []string{"config.storage_configured"}).
		Return([]*registrystore.Registry{}, nil) // No entries found

	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.Equal(t, StorageStateNoop, provider.storageState)
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
	assert.Equal(t, StorageStateNoop, provider.storageState)
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
		StorageType:          "file",
		FileBaseDir:          "./test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
	}

	// Even though registry has config, env should take precedence
	provider := New(logger, mockRegistry, cfg)

	err := provider.InitializeWithConfig(cfg)

	assert.NoError(t, err)
	assert.Equal(t, StorageStateConfigured, provider.storageState)
	assert.NotNil(t, provider.currentStorage)

	// Verify it's file storage from env config
	_, ok := provider.currentStorage.(*filestorage.FileStorage)
	assert.True(t, ok, "storage should be of type *filestorage.FileStorage")

	// Registry should not be called since env config worked
	mockRegistry.AssertNotCalled(t, "Get")
}

// Test that GetStorage still works with the new InitializeWithConfig logic
func TestProvider_GetStorage_AfterEnvInitialization(t *testing.T) {
	logger := zap.NewNop()
	mockRegistry := &MockRegistryStore{}

	cfg := &config.Config{
		StorageType:          "file",
		FileBaseDir:          "./test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
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
