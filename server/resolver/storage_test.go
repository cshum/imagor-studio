package resolver

import (
	"context"
	"encoding/json"
	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/storageconfigstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
	"io"
	"testing"
	"time"
)

type MockStorage struct {
	mock.Mock
}

func (m *MockStorage) List(ctx context.Context, path string, options storage.ListOptions) (storage.ListResult, error) {
	args := m.Called(ctx, path, options)
	return args.Get(0).(storage.ListResult), args.Error(1)
}

func (m *MockStorage) Get(ctx context.Context, path string) (io.ReadCloser, error) {
	args := m.Called(ctx, path)
	return args.Get(0).(io.ReadCloser), args.Error(1)
}

func (m *MockStorage) Put(ctx context.Context, path string, content io.Reader) error {
	args := m.Called(ctx, path, content)
	return args.Error(0)
}

func (m *MockStorage) Delete(ctx context.Context, path string) error {
	args := m.Called(ctx, path)
	return args.Error(0)
}

func (m *MockStorage) CreateFolder(ctx context.Context, path string) error {
	args := m.Called(ctx, path)
	return args.Error(0)
}

func (m *MockStorage) Stat(ctx context.Context, path string) (storage.FileInfo, error) {
	args := m.Called(ctx, path)
	return args.Get(0).(storage.FileInfo), args.Error(1)
}

type MockStore struct {
	mock.Mock
}

func (m *MockStore) List(ctx context.Context, ownerID string) ([]*storageconfigstore.Config, error) {
	args := m.Called(ctx, ownerID)
	return args.Get(0).([]*storageconfigstore.Config), args.Error(1)
}

func (m *MockStore) Get(ctx context.Context, ownerID string, key string) (*storageconfigstore.Config, error) {
	args := m.Called(ctx, ownerID, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*storageconfigstore.Config), args.Error(1)
}

func (m *MockStore) Create(ctx context.Context, ownerID string, config *storageconfigstore.Config) error {
	args := m.Called(ctx, ownerID, config)
	return args.Error(0)
}

func (m *MockStore) Update(ctx context.Context, ownerID string, key string, config *storageconfigstore.Config) error {
	args := m.Called(ctx, ownerID, key, config)
	return args.Error(0)
}

func (m *MockStore) Delete(ctx context.Context, ownerID string, key string) error {
	args := m.Called(ctx, ownerID, key)
	return args.Error(0)
}

func (m *MockStore) DefaultStorage(ownerID string) (storage.Storage, error) {
	args := m.Called(ownerID)
	return args.Get(0).(storage.Storage), args.Error(1)
}

func (m *MockStore) Storage(ownerID string, key string) (storage.Storage, error) {
	args := m.Called(ownerID, key)
	return args.Get(0).(storage.Storage), args.Error(1)
}

func TestListFiles(t *testing.T) {
	mockStorage := new(MockStorage)
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	// Create context with owner ID
	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	path := "/test"
	offset := 0
	limit := 10
	onlyFiles := new(bool)
	*onlyFiles = true
	sortBy := gql.SortOptionName
	sortOrder := gql.SortOrderAsc

	mockStore.On("DefaultStorage", "test-owner-id").Return(mockStorage, nil)

	mockStorage.On("List", ctx, path, mock.AnythingOfType("storage.ListOptions")).Return(storage.ListResult{
		Items: []storage.FileInfo{
			{Name: "file1.txt", Path: "/test/file1.txt", Size: 100, IsDir: false},
			{Name: "file2.txt", Path: "/test/file2.txt", Size: 200, IsDir: false},
		},
		TotalCount: 2,
	}, nil)

	result, err := resolver.Query().ListFiles(ctx, nil, path, offset, limit, onlyFiles, nil, &sortBy, &sortOrder)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.TotalCount)
	assert.Len(t, result.Items, 2)
	assert.Equal(t, "file1.txt", result.Items[0].Name)
	assert.Equal(t, "/test/file1.txt", result.Items[0].Path)
	assert.Equal(t, 100, result.Items[0].Size)
	assert.False(t, result.Items[0].IsDirectory)

	mockStorage.AssertExpectations(t)
	mockStore.AssertExpectations(t)
}

func TestListFilesWithoutOwnerID(t *testing.T) {
	mockStorage := new(MockStorage)
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	// Create context without owner ID (should use default)
	ctx := context.Background()
	path := "/test"
	offset := 0
	limit := 10

	// Default owner ID should be used
	defaultOwnerID := "00000000-0000-0000-0000-000000000001"
	mockStore.On("DefaultStorage", defaultOwnerID).Return(mockStorage, nil)

	mockStorage.On("List", ctx, path, mock.AnythingOfType("storage.ListOptions")).Return(storage.ListResult{
		Items: []storage.FileInfo{
			{Name: "file1.txt", Path: "/test/file1.txt", Size: 100, IsDir: false},
		},
		TotalCount: 1,
	}, nil)

	result, err := resolver.Query().ListFiles(ctx, nil, path, offset, limit, nil, nil, nil, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, result.TotalCount)

	mockStorage.AssertExpectations(t)
	mockStore.AssertExpectations(t)
}

func TestStatFile(t *testing.T) {
	mockStorage := new(MockStorage)
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	path := "/test/file1.txt"

	mockStore.On("DefaultStorage", "test-owner-id").Return(mockStorage, nil)

	mockStorage.On("Stat", ctx, path).Return(storage.FileInfo{
		Name:         "file1.txt",
		Path:         "/test/file1.txt",
		Size:         100,
		IsDir:        false,
		ModifiedTime: time.Now(),
		ETag:         "abc123",
	}, nil)

	result, err := resolver.Query().StatFile(ctx, nil, path)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "file1.txt", result.Name)
	assert.Equal(t, "/test/file1.txt", result.Path)
	assert.Equal(t, 100, result.Size)
	assert.False(t, result.IsDirectory)
	assert.NotEmpty(t, result.ModifiedTime)
	assert.Equal(t, "abc123", *result.Etag)

	mockStorage.AssertExpectations(t)
	mockStore.AssertExpectations(t)
}

func TestCreateFolder(t *testing.T) {
	mockStorage := new(MockStorage)
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	path := "/test/new-folder"

	mockStore.On("DefaultStorage", "test-owner-id").Return(mockStorage, nil)
	mockStorage.On("CreateFolder", ctx, path).Return(nil)

	result, err := resolver.Mutation().CreateFolder(ctx, nil, path)

	assert.NoError(t, err)
	assert.True(t, result)

	mockStorage.AssertExpectations(t)
	mockStore.AssertExpectations(t)
}

func TestDeleteFile(t *testing.T) {
	mockStorage := new(MockStorage)
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	path := "/test/file-to-delete.txt"

	mockStore.On("DefaultStorage", "test-owner-id").Return(mockStorage, nil)
	mockStorage.On("Delete", ctx, path).Return(nil)

	result, err := resolver.Mutation().DeleteFile(ctx, nil, path)

	assert.NoError(t, err)
	assert.True(t, result)

	mockStorage.AssertExpectations(t)
	mockStore.AssertExpectations(t)
}

func TestListStorageConfigs(t *testing.T) {
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")

	mockConfigs := []*storageconfigstore.Config{
		{Name: "Local", Key: "local", Type: "file", Config: json.RawMessage(`{"baseDir":"/tmp/storage"}`)},
		{Name: "S3", Key: "s3", Type: "s3", Config: json.RawMessage(`{"bucket":"my-bucket"}`)},
	}

	mockStore.On("List", ctx, "test-owner-id").Return(mockConfigs, nil)

	result, err := resolver.Query().ListStorageConfigs(ctx)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "Local", result[0].Name)
	assert.Equal(t, "local", result[0].Key)
	assert.Equal(t, "file", result[0].Type)
	assert.JSONEq(t, `{"baseDir":"/tmp/storage"}`, result[0].Config)

	mockStore.AssertExpectations(t)
}

func TestAddStorageConfig(t *testing.T) {
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	input := gql.StorageConfigInput{
		Name:   "New S3",
		Key:    "new-s3",
		Type:   "s3",
		Config: `{"bucket":"new-bucket"}`,
	}

	expectedConfig := &storageconfigstore.Config{
		Name:   input.Name,
		Key:    input.Key,
		Type:   input.Type,
		Config: json.RawMessage(input.Config),
	}

	mockStore.On("Create", ctx, "test-owner-id", expectedConfig).Return(nil)

	result, err := resolver.Mutation().AddStorageConfig(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, input.Name, result.Name)
	assert.Equal(t, input.Key, result.Key)
	assert.Equal(t, input.Type, result.Type)
	assert.Equal(t, input.Config, result.Config)

	mockStore.AssertExpectations(t)
}

func TestUpdateStorageConfig(t *testing.T) {
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	key := "existing-s3"
	input := gql.StorageConfigInput{
		Name:   "Updated S3",
		Key:    "existing-s3",
		Type:   "s3",
		Config: `{"bucket":"updated-bucket"}`,
	}

	expectedConfig := &storageconfigstore.Config{
		Name:   input.Name,
		Key:    input.Key,
		Type:   input.Type,
		Config: json.RawMessage(input.Config),
	}

	mockStore.On("Update", ctx, "test-owner-id", key, expectedConfig).Return(nil)

	result, err := resolver.Mutation().UpdateStorageConfig(ctx, key, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, input.Name, result.Name)
	assert.Equal(t, input.Key, result.Key)
	assert.Equal(t, input.Type, result.Type)
	assert.Equal(t, input.Config, result.Config)

	mockStore.AssertExpectations(t)
}

func TestDeleteStorageConfig(t *testing.T) {
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	key := "config-to-delete"

	mockStore.On("Delete", ctx, "test-owner-id", key).Return(nil)

	result, err := resolver.Mutation().DeleteStorageConfig(ctx, key)

	assert.NoError(t, err)
	assert.True(t, result)

	mockStore.AssertExpectations(t)
}

func TestGetStorageWithSpecificKey(t *testing.T) {
	mockStorage := new(MockStorage)
	mockStore := new(MockStore)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStore, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	storageKey := "specific-storage"
	path := "/test"

	mockStore.On("Storage", "test-owner-id", storageKey).Return(mockStorage, nil)

	mockStorage.On("List", ctx, path, mock.AnythingOfType("storage.ListOptions")).Return(storage.ListResult{
		Items: []storage.FileInfo{
			{Name: "file1.txt", Path: "/test/file1.txt", Size: 100, IsDir: false},
		},
		TotalCount: 1,
	}, nil)

	result, err := resolver.Query().ListFiles(ctx, &storageKey, path, 0, 10, nil, nil, nil, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, result.TotalCount)

	mockStorage.AssertExpectations(t)
	mockStore.AssertExpectations(t)
}
