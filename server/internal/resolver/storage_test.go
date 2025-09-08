package resolver

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

func TestUploadFile_RequiresWriteScope(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name: "User with write scope can upload",
			context: func() context.Context {
				return createReadWriteContext("test-user-id")
			},
			expectError: false,
		},
		{
			name: "User without write scope cannot upload",
			context: func() context.Context {
				return createReadOnlyContext("test-user-id")
			},
			expectError: true,
			errorMsg:    "insufficient permission: write access required",
		},
		{
			name: "Admin can upload",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage.ExpectedCalls = nil
			ctx := tt.context()

			if !tt.expectError {
				mockStorage.On("Put", ctx, "test.txt", mock.Anything).Return(nil)
			}

			upload := graphql.Upload{
				File:     strings.NewReader("test content"),
				Filename: "test.txt",
			}

			result, err := resolver.Mutation().UploadFile(ctx, "test.txt", upload)

			if tt.expectError {
				assert.Error(t, err)
				assert.False(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.True(t, result)
			}

			mockStorage.AssertExpectations(t)
		})
	}
}

func TestDeleteFile_RequiresWriteScope(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name: "User with write scope can delete",
			context: func() context.Context {
				return createReadWriteContext("test-user-id")
			},
			expectError: false,
		},
		{
			name: "User without write scope cannot delete",
			context: func() context.Context {
				return createReadOnlyContext("test-user-id")
			},
			expectError: true,
			errorMsg:    "insufficient permission: write access required",
		},
		{
			name: "Admin can delete",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage.ExpectedCalls = nil
			ctx := tt.context()

			if !tt.expectError {
				mockStorage.On("Delete", ctx, "test.txt").Return(nil)
			}

			result, err := resolver.Mutation().DeleteFile(ctx, "test.txt")

			if tt.expectError {
				assert.Error(t, err)
				assert.False(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.True(t, result)
			}

			mockStorage.AssertExpectations(t)
		})
	}
}

func TestCreateFolder_RequiresWriteScope(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name: "User with write scope can create folder",
			context: func() context.Context {
				return createReadWriteContext("test-user-id")
			},
			expectError: false,
		},
		{
			name: "User without write scope cannot create folder",
			context: func() context.Context {
				return createReadOnlyContext("test-user-id")
			},
			expectError: true,
			errorMsg:    "insufficient permission: write access required",
		},
		{
			name: "Admin can create folder",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage.ExpectedCalls = nil
			ctx := tt.context()

			if !tt.expectError {
				mockStorage.On("CreateFolder", ctx, "newfolder").Return(nil)
			}

			result, err := resolver.Mutation().CreateFolder(ctx, "newfolder")

			if tt.expectError {
				assert.Error(t, err)
				assert.False(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.True(t, result)
			}

			mockStorage.AssertExpectations(t)
		})
	}
}

// Test that read operations don't require write scope
func TestListFiles_OnlyRequiresReadScope(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name    string
		context func() context.Context
	}{
		{
			name: "Read-only user can list files",
			context: func() context.Context {
				return createReadOnlyContext("test-user-id")
			},
		},
		{
			name: "Read-write user can list files",
			context: func() context.Context {
				return createReadWriteContext("test-user-id")
			},
		},
		{
			name: "Admin can list files",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := tt.context()
			path := "/test"
			offset := 0
			limit := 10
			onlyFiles := new(bool)
			*onlyFiles = true
			sortBy := gql.SortOptionName
			sortOrder := gql.SortOrderAsc

			mockStorage.On("List", ctx, path, mock.AnythingOfType("storage.ListOptions")).Return(storage.ListResult{
				Items: []storage.FileInfo{
					{Name: "file1.txt", Path: "/test/file1.txt", Size: 100, IsDir: false},
					{Name: "file2.txt", Path: "/test/file2.txt", Size: 200, IsDir: false},
				},
				TotalCount: 2,
			}, nil)

			result, err := resolver.Query().ListFiles(ctx, path, &offset, &limit, onlyFiles, nil, &sortBy, &sortOrder)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, 2, result.TotalCount)
			assert.Len(t, result.Items, 2)

			mockStorage.AssertExpectations(t)
		})
	}
}

func TestStatFile_OnlyRequiresReadScope(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadOnlyContext("test-user-id")
	path := "/test/file1.txt"

	mockStorage.On("Stat", ctx, path).Return(storage.FileInfo{
		Name:         "file1.txt",
		Path:         "/test/file1.txt",
		Size:         100,
		IsDir:        false,
		ModifiedTime: time.Now(),
		ETag:         "abc123",
	}, nil)

	result, err := resolver.Query().StatFile(ctx, path)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "file1.txt", result.Name)

	mockStorage.AssertExpectations(t)
}

func TestTestStorageConfig_RequiresAdminPermission(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name: "Admin can test storage config",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
		{
			name: "User with write scope cannot test storage config",
			context: func() context.Context {
				return createReadWriteContext("test-user-id")
			},
			expectError: true,
			errorMsg:    "insufficient permission: admin access required",
		},
		{
			name: "User with read scope cannot test storage config",
			context: func() context.Context {
				return createReadOnlyContext("test-user-id")
			},
			expectError: true,
			errorMsg:    "insufficient permission: admin access required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := tt.context()

			input := gql.StorageConfigInput{
				Type: gql.StorageTypeFile,
				FileConfig: &gql.FileStorageInput{
					BaseDir: "/tmp/test-storage",
				},
			}

			result, err := resolver.Mutation().TestStorageConfig(ctx, input)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				// For admin context, we expect it to fail because the directory doesn't exist
				// but it should not fail due to permission issues
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.False(t, result.Success)
				assert.Contains(t, result.Message, "Failed to access storage directory")
			}
		})
	}
}

func TestTestStorageConfig_FileStorage(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createAdminContext("admin-user-id")

	tests := []struct {
		name           string
		input          gql.StorageConfigInput
		expectSuccess  bool
		expectedMsg    string
		expectedDetail string
	}{
		{
			name: "Missing file config",
			input: gql.StorageConfigInput{
				Type: gql.StorageTypeFile,
			},
			expectSuccess:  false,
			expectedMsg:    "File configuration is required for file storage type",
			expectedDetail: "",
		},
		{
			name: "Non-existent directory",
			input: gql.StorageConfigInput{
				Type: gql.StorageTypeFile,
				FileConfig: &gql.FileStorageInput{
					BaseDir: "/non/existent/directory",
				},
			},
			expectSuccess:  false,
			expectedMsg:    "Failed to access storage directory",
			expectedDetail: "no such file or directory",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := resolver.Mutation().TestStorageConfig(ctx, tt.input)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expectSuccess, result.Success)
			assert.Contains(t, result.Message, tt.expectedMsg)
			if tt.expectedDetail != "" && result.Details != nil {
				assert.Contains(t, *result.Details, tt.expectedDetail)
			}
		})
	}
}

func TestTestStorageConfig_S3Storage(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createAdminContext("admin-user-id")

	tests := []struct {
		name           string
		input          gql.StorageConfigInput
		expectSuccess  bool
		expectedMsg    string
		expectedDetail string
	}{
		{
			name: "Missing S3 config",
			input: gql.StorageConfigInput{
				Type: gql.StorageTypeS3,
			},
			expectSuccess:  false,
			expectedMsg:    "S3 configuration is required for S3 storage type",
			expectedDetail: "",
		},
		{
			name: "Invalid S3 credentials",
			input: gql.StorageConfigInput{
				Type: gql.StorageTypeS3,
				S3Config: &gql.S3StorageInput{
					Bucket:          "test-bucket",
					Region:          stringPtr("us-east-1"),
					AccessKeyID:     stringPtr("invalid-key"),
					SecretAccessKey: stringPtr("invalid-secret"),
				},
			},
			expectSuccess:  false,
			expectedMsg:    "Failed to access storage directory",
			expectedDetail: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := resolver.Mutation().TestStorageConfig(ctx, tt.input)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expectSuccess, result.Success)
			assert.Contains(t, result.Message, tt.expectedMsg)
			if tt.expectedDetail != "" && result.Details != nil {
				assert.Contains(t, *result.Details, tt.expectedDetail)
			}
		})
	}
}

func TestTestStorageConfig_ListOperationFirst(t *testing.T) {
	// This test verifies that List operation is called first and fails appropriately
	// when the directory doesn't exist, without creating directories
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createAdminContext("admin-user-id")

	// Create a temporary directory for testing
	tempDir := t.TempDir()

	t.Run("Valid directory - List operation succeeds", func(t *testing.T) {
		input := gql.StorageConfigInput{
			Type: gql.StorageTypeFile,
			FileConfig: &gql.FileStorageInput{
				BaseDir: tempDir,
			},
		}

		result, err := resolver.Mutation().TestStorageConfig(ctx, input)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.Success)
		assert.Equal(t, "Storage configuration test successful", result.Message)
	})
}

// Test write operations with different scope combinations
func TestWriteOperations_ScopeValidation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name        string
		scopes      []string
		expectError bool
	}{
		{
			name:        "Only read scope - cannot write",
			scopes:      []string{"read"},
			expectError: true,
		},
		{
			name:        "Only write scope - can write",
			scopes:      []string{"write"},
			expectError: false,
		},
		{
			name:        "Read and write scopes - can write",
			scopes:      []string{"read", "write"},
			expectError: false,
		},
		{
			name:        "Admin scope includes write - can write",
			scopes:      []string{"read", "write", "admin"},
			expectError: false,
		},
		{
			name:        "No scopes - cannot write",
			scopes:      []string{},
			expectError: true,
		},
		{
			name:        "Other scopes only - cannot write",
			scopes:      []string{"admin"}, // Admin without write
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name+" - UploadFile", func(t *testing.T) {
			mockStorage.ExpectedCalls = nil
			ctx := createUserContext("test-user-id", "user", tt.scopes)

			if !tt.expectError {
				mockStorage.On("Put", ctx, "test.txt", mock.Anything).Return(nil)
			}

			upload := graphql.Upload{
				File:     strings.NewReader("test content"),
				Filename: "test.txt",
			}

			result, err := resolver.Mutation().UploadFile(ctx, "test.txt", upload)

			if tt.expectError {
				assert.Error(t, err)
				assert.False(t, result)
				assert.Contains(t, err.Error(), "insufficient permission: write access required")
			} else {
				assert.NoError(t, err)
				assert.True(t, result)
			}

			mockStorage.AssertExpectations(t)
		})

		t.Run(tt.name+" - DeleteFile", func(t *testing.T) {
			mockStorage.ExpectedCalls = nil
			ctx := createUserContext("test-user-id", "user", tt.scopes)

			if !tt.expectError {
				mockStorage.On("Delete", ctx, "test.txt").Return(nil)
			}

			result, err := resolver.Mutation().DeleteFile(ctx, "test.txt")

			if tt.expectError {
				assert.Error(t, err)
				assert.False(t, result)
				assert.Contains(t, err.Error(), "insufficient permission: write access required")
			} else {
				assert.NoError(t, err)
				assert.True(t, result)
			}

			mockStorage.AssertExpectations(t)
		})

		t.Run(tt.name+" - CreateFolder", func(t *testing.T) {
			mockStorage.ExpectedCalls = nil
			ctx := createUserContext("test-user-id", "user", tt.scopes)

			if !tt.expectError {
				mockStorage.On("CreateFolder", ctx, "newfolder").Return(nil)
			}

			result, err := resolver.Mutation().CreateFolder(ctx, "newfolder")

			if tt.expectError {
				assert.Error(t, err)
				assert.False(t, result)
				assert.Contains(t, err.Error(), "insufficient permission: write access required")
			} else {
				assert.NoError(t, err)
				assert.True(t, result)
			}

			mockStorage.AssertExpectations(t)
		})
	}
}

func TestStorageOperations_StorageErrors(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("test-user-id")

	tests := []struct {
		name      string
		operation string
		setupMock func()
		execute   func() (bool, error)
		errorMsg  string
	}{
		{
			name:      "UploadFile - storage error",
			operation: "uploadFile",
			setupMock: func() {
				mockStorage.On("Put", ctx, "test.txt", mock.Anything).Return(assert.AnError)
			},
			execute: func() (bool, error) {
				upload := graphql.Upload{
					File:     strings.NewReader("test content"),
					Filename: "test.txt",
				}
				return resolver.Mutation().UploadFile(ctx, "test.txt", upload)
			},
			errorMsg: "failed to upload file",
		},
		{
			name:      "DeleteFile - storage error",
			operation: "deleteFile",
			setupMock: func() {
				mockStorage.On("Delete", ctx, "test.txt").Return(assert.AnError)
			},
			execute: func() (bool, error) {
				return resolver.Mutation().DeleteFile(ctx, "test.txt")
			},
			errorMsg: "failed to delete file",
		},
		{
			name:      "CreateFolder - storage error",
			operation: "createFolder",
			setupMock: func() {
				mockStorage.On("CreateFolder", ctx, "newfolder").Return(assert.AnError)
			},
			execute: func() (bool, error) {
				return resolver.Mutation().CreateFolder(ctx, "newfolder")
			},
			errorMsg: "failed to create folder",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage.ExpectedCalls = nil
			tt.setupMock()

			result, err := tt.execute()

			assert.Error(t, err)
			assert.False(t, result)
			assert.Contains(t, err.Error(), tt.errorMsg)

			mockStorage.AssertExpectations(t)
		})
	}
}

// Test that existing read operations work as before (no breaking changes)
func TestReadOperations_StillWork(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	// Test with read-only context
	ctx := createReadOnlyContext("test-user-id")

	t.Run("ListFiles works with read-only", func(t *testing.T) {
		path := "/test"
		offset := 0
		limit := 10
		sortBy := gql.SortOptionName
		sortOrder := gql.SortOrderAsc

		mockStorage.On("List", ctx, path, mock.AnythingOfType("storage.ListOptions")).Return(storage.ListResult{
			Items: []storage.FileInfo{
				{Name: "file1.txt", Path: "/test/file1.txt", Size: 100, IsDir: false},
			},
			TotalCount: 1,
		}, nil)

		result, err := resolver.Query().ListFiles(ctx, path, &offset, &limit, nil, nil, &sortBy, &sortOrder)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 1, result.TotalCount)

		mockStorage.AssertExpectations(t)
	})

	t.Run("StatFile works with read-only", func(t *testing.T) {
		mockStorage.ExpectedCalls = nil
		path := "/test/file1.txt"

		mockStorage.On("Stat", ctx, path).Return(storage.FileInfo{
			Name:         "file1.txt",
			Path:         "/test/file1.txt",
			Size:         100,
			IsDir:        false,
			ModifiedTime: time.Now(),
			ETag:         "abc123",
		}, nil)

		result, err := resolver.Query().StatFile(ctx, path)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "file1.txt", result.Name)

		mockStorage.AssertExpectations(t)
	})
}

func TestListFiles(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	// Create context with owner ID
	ctx := context.WithValue(context.Background(), UserIDContextKey, "test-owner-id")
	path := "/test"
	offset := 0
	limit := 10
	onlyFiles := new(bool)
	*onlyFiles = true
	sortBy := gql.SortOptionName
	sortOrder := gql.SortOrderAsc

	mockStorage.On("List", ctx, path, mock.AnythingOfType("storage.ListOptions")).Return(storage.ListResult{
		Items: []storage.FileInfo{
			{Name: "file1.txt", Path: "/test/file1.txt", Size: 100, IsDir: false},
			{Name: "file2.txt", Path: "/test/file2.txt", Size: 200, IsDir: false},
		},
		TotalCount: 2,
	}, nil)

	result, err := resolver.Query().ListFiles(ctx, path, &offset, &limit, onlyFiles, nil, &sortBy, &sortOrder)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.TotalCount)
	assert.Len(t, result.Items, 2)
	assert.Equal(t, "file1.txt", result.Items[0].Name)
	assert.Equal(t, "/test/file1.txt", result.Items[0].Path)
	assert.Equal(t, 100, result.Items[0].Size)
	assert.False(t, result.Items[0].IsDirectory)

	mockStorage.AssertExpectations(t)
}

func TestStatFile(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := context.WithValue(context.Background(), UserIDContextKey, "test-owner-id")
	path := "/test/file1.txt"

	mockStorage.On("Stat", ctx, path).Return(storage.FileInfo{
		Name:         "file1.txt",
		Path:         "/test/file1.txt",
		Size:         100,
		IsDir:        false,
		ModifiedTime: time.Now(),
		ETag:         "abc123",
	}, nil)

	result, err := resolver.Query().StatFile(ctx, path)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "file1.txt", result.Name)
	assert.Equal(t, "/test/file1.txt", result.Path)
	assert.Equal(t, 100, result.Size)
	assert.False(t, result.IsDirectory)
	assert.NotEmpty(t, result.ModifiedTime)
	assert.Equal(t, "abc123", *result.Etag)

	mockStorage.AssertExpectations(t)
}
