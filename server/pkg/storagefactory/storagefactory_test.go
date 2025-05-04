package storagefactory

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"testing"

	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock storage for testing
type mockStorage struct{}

func (m *mockStorage) List(ctx context.Context, key string, options storage.ListOptions) (storage.ListResult, error) {
	return storage.ListResult{}, nil
}

func (m *mockStorage) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	return nil, nil
}

func (m *mockStorage) Put(ctx context.Context, key string, content io.Reader) error {
	return nil
}

func (m *mockStorage) Delete(ctx context.Context, key string) error {
	return nil
}

func (m *mockStorage) CreateFolder(ctx context.Context, folder string) error {
	return nil
}

func (m *mockStorage) Stat(ctx context.Context, key string) (storage.FileInfo, error) {
	return storage.FileInfo{}, nil
}

func TestNewStorageFactory(t *testing.T) {
	factory := NewStorageFactory()
	assert.NotNil(t, factory)

	// Verify that default storage types are registered
	// We'll test this by trying to create them
	fileConfig := FileStorageConfig{
		BaseDir:          "/tmp/test",
		MkdirPermissions: 0755,
		WritePermissions: 0644,
	}
	fileConfigJSON, err := json.Marshal(fileConfig)
	require.NoError(t, err)

	_, err = factory.CreateStorage("file", fileConfigJSON)
	assert.NoError(t, err)

	s3Config := S3StorageConfig{
		Bucket: "test-bucket",
		Region: "us-east-1",
	}
	s3ConfigJSON, err := json.Marshal(s3Config)
	require.NoError(t, err)

	_, err = factory.CreateStorage("s3", s3ConfigJSON)
	assert.NoError(t, err)
}

func TestRegisterStorageType(t *testing.T) {
	factory := NewStorageFactory()

	// Register a custom storage type
	mockCreator := func(config json.RawMessage) (storage.Storage, error) {
		return &mockStorage{}, nil
	}

	factory.RegisterStorageType("mock", mockCreator)

	// Test that we can create an instance of the custom storage
	stor, err := factory.CreateStorage("mock", json.RawMessage("{}"))
	require.NoError(t, err)
	assert.NotNil(t, stor)
	assert.IsType(t, &mockStorage{}, stor)
}

func TestCreateStorage_FileStorage(t *testing.T) {
	factory := NewStorageFactory()

	tests := []struct {
		name      string
		config    FileStorageConfig
		wantError bool
	}{
		{
			name: "valid file storage config",
			config: FileStorageConfig{
				BaseDir:          "/tmp/test",
				MkdirPermissions: 0755,
				WritePermissions: 0644,
			},
			wantError: false,
		},
		{
			name: "file storage with empty base dir",
			config: FileStorageConfig{
				BaseDir:          "",
				MkdirPermissions: 0755,
				WritePermissions: 0644,
			},
			wantError: false, // This might still be valid depending on filestorage implementation
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configJSON, err := json.Marshal(tt.config)
			require.NoError(t, err)

			storage, err := factory.CreateStorage("file", configJSON)
			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, storage)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, storage)
			}
		})
	}
}

func TestCreateStorage_S3Storage(t *testing.T) {
	factory := NewStorageFactory()

	tests := []struct {
		name      string
		config    S3StorageConfig
		wantError bool
	}{
		{
			name: "valid S3 storage config",
			config: S3StorageConfig{
				Bucket: "test-bucket",
				Region: "us-east-1",
			},
			wantError: false,
		},
		{
			name: "S3 storage with all fields",
			config: S3StorageConfig{
				Bucket:          "test-bucket",
				Region:          "us-east-1",
				Endpoint:        "http://localhost:9000",
				AccessKeyID:     "test-key",
				SecretAccessKey: "test-secret",
				SessionToken:    "test-token",
				BaseDir:         "/test",
			},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configJSON, err := json.Marshal(tt.config)
			require.NoError(t, err)

			storage, err := factory.CreateStorage("s3", configJSON)
			if tt.wantError {
				assert.Error(t, err)
				assert.Nil(t, storage)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, storage)
			}
		})
	}
}

func TestCreateStorage_InvalidType(t *testing.T) {
	factory := NewStorageFactory()

	// Try to create a storage with an unregistered type
	_, err := factory.CreateStorage("unknown", json.RawMessage("{}"))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported storage type: unknown")
}

func TestCreateStorage_InvalidJSON(t *testing.T) {
	factory := NewStorageFactory()

	tests := []struct {
		name          string
		storageType   string
		config        string
		errorContains string
	}{
		{
			name:          "invalid JSON for file storage",
			storageType:   "file",
			config:        "{invalid json}",
			errorContains: "error unmarshaling file storage config",
		},
		{
			name:          "invalid JSON for S3 storage",
			storageType:   "s3",
			config:        "{invalid json}",
			errorContains: "error unmarshaling S3 storage config",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := factory.CreateStorage(tt.storageType, json.RawMessage(tt.config))
			assert.Error(t, err)
			assert.Contains(t, err.Error(), tt.errorContains)
		})
	}
}

func TestCreateStorage_EmptyConfig(t *testing.T) {
	factory := NewStorageFactory()

	// Test with empty config - this results in zero values for all fields
	_, err := factory.CreateStorage("file", json.RawMessage("{}"))
	assert.NoError(t, err) // Empty config is valid, resulting in zero values

	// Test with null - in Go, unmarshaling null into a struct doesn't error
	// It simply results in a struct with all zero values
	_, err = factory.CreateStorage("file", json.RawMessage("null"))
	assert.NoError(t, err) // This is expected behavior in Go

	// Test with invalid JSON that will cause unmarshal error
	_, err = factory.CreateStorage("file", json.RawMessage("invalid json"))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid character")
}

func TestStorageFactory_ThreadSafety(t *testing.T) {
	factory := NewStorageFactory()

	// Run multiple goroutines to test thread safety
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()

			// Register a custom type
			typeName := fmt.Sprintf("custom-%d", id)
			factory.RegisterStorageType(typeName, func(config json.RawMessage) (storage.Storage, error) {
				return &mockStorage{}, nil
			})

			// Create an instance
			storage, err := factory.CreateStorage(typeName, json.RawMessage("{}"))
			assert.NoError(t, err)
			assert.NotNil(t, storage)
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}
}

// TestFileStorageConfig tests the FileStorageConfig marshaling/unmarshaling
func TestFileStorageConfig(t *testing.T) {
	config := FileStorageConfig{
		BaseDir:          "/test/path",
		MkdirPermissions: 0755,
		WritePermissions: 0644,
	}

	// Test marshaling
	data, err := json.Marshal(config)
	require.NoError(t, err)

	// Test unmarshaling
	var unmarshaled FileStorageConfig
	err = json.Unmarshal(data, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, config.BaseDir, unmarshaled.BaseDir)
	assert.Equal(t, config.MkdirPermissions, unmarshaled.MkdirPermissions)
	assert.Equal(t, config.WritePermissions, unmarshaled.WritePermissions)
}

// TestS3StorageConfig tests the S3StorageConfig marshaling/unmarshaling
func TestS3StorageConfig(t *testing.T) {
	config := S3StorageConfig{
		Bucket:          "test-bucket",
		Region:          "us-east-1",
		Endpoint:        "http://localhost:9000",
		AccessKeyID:     "test-key",
		SecretAccessKey: "test-secret",
		SessionToken:    "test-token",
		BaseDir:         "/test",
	}

	// Test marshaling
	data, err := json.Marshal(config)
	require.NoError(t, err)

	// Test unmarshaling
	var unmarshaled S3StorageConfig
	err = json.Unmarshal(data, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, config.Bucket, unmarshaled.Bucket)
	assert.Equal(t, config.Region, unmarshaled.Region)
	assert.Equal(t, config.Endpoint, unmarshaled.Endpoint)
	assert.Equal(t, config.AccessKeyID, unmarshaled.AccessKeyID)
	assert.Equal(t, config.SecretAccessKey, unmarshaled.SecretAccessKey)
	assert.Equal(t, config.SessionToken, unmarshaled.SessionToken)
	assert.Equal(t, config.BaseDir, unmarshaled.BaseDir)
}
