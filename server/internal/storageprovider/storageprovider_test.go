package storageprovider

import (
	"context"
	"os"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockRegistryStore is a mock implementation of registrystore.Store
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

func (m *MockRegistryStore) Set(ctx context.Context, ownerID, key, value string) (*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, key, value)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) Delete(ctx context.Context, ownerID, key string) error {
	args := m.Called(ctx, ownerID, key)
	return args.Error(0)
}

func (m *MockRegistryStore) List(ctx context.Context, ownerID string, prefix *string) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, prefix)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*registrystore.Registry), args.Error(1)
}

func TestNew(t *testing.T) {
	logger := zap.NewNop()
	mockStore := &MockRegistryStore{}

	provider := New(logger, mockStore)

	assert.NotNil(t, provider)
	assert.Equal(t, logger, provider.logger)
	assert.Equal(t, mockStore, provider.registryStore)
}

func TestProvider_NewFileStorage(t *testing.T) {
	logger := zap.NewNop()
	mockStore := &MockRegistryStore{}
	provider := New(logger, mockStore)

	cfg := &config.Config{
		FileBaseDir:          "./test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
	}

	// Mock registry store to return empty (use config default)
	mockStore.On("Get", mock.Anything, "system", "file_base_dir").Return(nil, nil)

	storage, err := provider.NewFileStorage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
	mockStore.AssertExpectations(t)
}

func TestProvider_NewS3Storage(t *testing.T) {
	logger := zap.NewNop()
	mockStore := &MockRegistryStore{}
	provider := New(logger, mockStore)

	cfg := &config.Config{
		S3Bucket:          "test-bucket",
		S3Region:          "us-east-1",
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
	}

	// Mock registry store calls
	mockStore.On("Get", mock.Anything, "system", "s3_bucket").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_region").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_endpoint").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_access_key_id").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_secret_access_key").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_session_token").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_base_dir").Return(nil, nil)

	storage, err := provider.NewS3Storage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
	mockStore.AssertExpectations(t)
}

func TestProvider_NewS3Storage_MissingBucket(t *testing.T) {
	logger := zap.NewNop()
	mockStore := &MockRegistryStore{}
	provider := New(logger, mockStore)

	cfg := &config.Config{
		S3Bucket: "", // Missing bucket
	}

	// Mock registry store to return empty for bucket (which will cause the error)
	// Even though we expect an error, NewS3Storage still calls getConfigValue for all S3 configs
	mockStore.On("Get", mock.Anything, "system", "s3_bucket").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_region").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_endpoint").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_access_key_id").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_secret_access_key").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_session_token").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_base_dir").Return(nil, nil)

	storage, err := provider.NewS3Storage(cfg)

	assert.Error(t, err)
	assert.Nil(t, storage)
	assert.Contains(t, err.Error(), "s3-bucket is required")
	mockStore.AssertExpectations(t)
}

func TestProvider_NewStorageFromConfig_File(t *testing.T) {
	logger := zap.NewNop()
	mockStore := &MockRegistryStore{}
	provider := New(logger, mockStore)

	cfg := &config.Config{
		StorageType:          "file",
		FileBaseDir:          "./test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
	}

	// Mock registry store calls
	mockStore.On("Get", mock.Anything, "system", "storage_type").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "file_base_dir").Return(nil, nil)

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
	mockStore.AssertExpectations(t)
}

func TestProvider_NewStorageFromConfig_S3(t *testing.T) {
	logger := zap.NewNop()
	mockStore := &MockRegistryStore{}
	provider := New(logger, mockStore)

	cfg := &config.Config{
		StorageType:       "s3",
		S3Bucket:          "test-bucket",
		S3Region:          "us-east-1",
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
	}

	// Mock registry store calls
	mockStore.On("Get", mock.Anything, "system", "storage_type").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_bucket").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_region").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_endpoint").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_access_key_id").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_secret_access_key").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_session_token").Return(nil, nil)
	mockStore.On("Get", mock.Anything, "system", "s3_base_dir").Return(nil, nil)

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
	mockStore.AssertExpectations(t)
}

func TestProvider_NewStorageFromConfig_UnsupportedType(t *testing.T) {
	logger := zap.NewNop()
	mockStore := &MockRegistryStore{}
	provider := New(logger, mockStore)

	cfg := &config.Config{
		StorageType: "unsupported",
	}

	// Mock registry store call
	mockStore.On("Get", mock.Anything, "system", "storage_type").Return(nil, nil)

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.Error(t, err)
	assert.Nil(t, storage)
	assert.Contains(t, err.Error(), "unsupported storage type")
	mockStore.AssertExpectations(t)
}

func TestProvider_getConfigValue_Priority(t *testing.T) {
	logger := zap.NewNop()
	mockStore := &MockRegistryStore{}
	provider := New(logger, mockStore)

	tests := []struct {
		name          string
		envKey        string
		envValue      string
		envVarValue   string
		registryValue *registrystore.Registry
		defaultValue  string
		expectedValue string
	}{
		{
			name:          "env value takes priority",
			envKey:        "TEST_KEY",
			envValue:      "env-value",
			envVarValue:   "direct-env-value",
			registryValue: &registrystore.Registry{Value: "registry-value"},
			defaultValue:  "default-value",
			expectedValue: "env-value",
		},
		{
			name:          "direct env var when env value empty",
			envKey:        "TEST_KEY",
			envValue:      "",
			envVarValue:   "direct-env-value",
			registryValue: &registrystore.Registry{Value: "registry-value"},
			defaultValue:  "default-value",
			expectedValue: "direct-env-value",
		},
		{
			name:          "registry value when env empty",
			envKey:        "TEST_KEY",
			envValue:      "",
			envVarValue:   "",
			registryValue: &registrystore.Registry{Value: "registry-value"},
			defaultValue:  "default-value",
			expectedValue: "registry-value",
		},
		{
			name:          "default value when all empty",
			envKey:        "TEST_KEY",
			envValue:      "",
			envVarValue:   "",
			registryValue: nil,
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

			// Mock registry store
			mockStore.ExpectedCalls = nil // Reset mock
			mockStore.On("Get", mock.Anything, "system", "test_key").Return(tt.registryValue, nil)

			result := provider.getConfigValue(tt.envKey, tt.envValue, tt.defaultValue)

			assert.Equal(t, tt.expectedValue, result)
			mockStore.AssertExpectations(t)
		})
	}
}
