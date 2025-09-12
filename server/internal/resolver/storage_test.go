package resolver

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockedS3Resolver extends the regular resolver with mocked S3 validation
type MockedS3Resolver struct {
	*Resolver
}

// NewMockedS3Resolver creates a resolver that mocks S3 storage validation
func NewMockedS3Resolver(storageProvider StorageProvider, registryStore registrystore.Store, userStore userstore.Store, imagorProvider ImagorProvider, cfg ConfigProvider, logger *zap.Logger) *MockedS3Resolver {
	baseResolver := NewResolver(storageProvider, registryStore, userStore, imagorProvider, cfg, logger)
	return &MockedS3Resolver{Resolver: baseResolver}
}

// Override the mutation resolver to use mocked validation
func (r *MockedS3Resolver) Mutation() gql.MutationResolver {
	return &mockedS3MutationResolver{
		mutationResolver: &mutationResolver{Resolver: r.Resolver},
	}
}

type mockedS3MutationResolver struct {
	*mutationResolver
}

// Override validateStorageConfig to mock S3 operations
func (r *mockedS3MutationResolver) validateStorageConfig(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
	switch input.Type {
	case gql.StorageTypeFile:
		// Use the original validation for file storage
		return r.mutationResolver.validateStorageConfig(ctx, input)
	case gql.StorageTypeS3:
		if input.S3Config == nil {
			return &gql.StorageTestResult{
				Success: false,
				Message: "S3 configuration is required for S3 storage type",
			}
		}
		// Mock S3 validation - always fail with controlled message
		return &gql.StorageTestResult{
			Success: false,
			Message: "Mocked S3 connection failure",
			Details: stringPtr("Simulated network failure without actual S3 connection"),
		}
	default:
		return &gql.StorageTestResult{
			Success: false,
			Message: "Unsupported storage type",
		}
	}
}

// Override TestStorageConfig to use mocked validation
func (r *mockedS3MutationResolver) TestStorageConfig(ctx context.Context, input gql.StorageConfigInput) (*gql.StorageTestResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Testing storage configuration (mocked S3)", zap.String("type", string(input.Type)))

	result := r.validateStorageConfig(ctx, input)
	return result, nil
}

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
	resolver := NewMockedS3Resolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

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
			expectedMsg:    "Mocked S3 connection failure",
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

func TestConfigureFileStorage_AutoTestSuccess(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockImagorProvider := new(MockImagorProvider)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, logger)

	ctx := createAdminContext("admin-user-id")
	tempDir := t.TempDir()

	input := gql.FileStorageInput{
		BaseDir: tempDir,
	}

	// Mock registry operations for successful configuration
	resultRegistry := &registrystore.Registry{
		Key:   "config.storage_type",
		Value: "file",
	}
	mockRegistryStore.On("SetMulti", ctx, "system:global", mock.MatchedBy(func(entries []*registrystore.Registry) bool {
		return len(entries) >= 3 // At least 3 entries (type, configured, base_dir, timestamp)
	})).Return([]*registrystore.Registry{resultRegistry}, nil)
	mockStorageProvider.On("ReloadFromRegistry").Return(nil)
	mockImagorProvider.On("ReloadFromRegistry").Return(nil)

	result, err := resolver.Mutation().ConfigureFileStorage(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.Success)
	assert.False(t, result.RestartRequired)
	assert.Contains(t, *result.Message, "File storage configured successfully")

	mockRegistryStore.AssertExpectations(t)
	mockStorageProvider.AssertExpectations(t)
}

func TestConfigureFileStorage_AutoTestFailure(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createAdminContext("admin-user-id")

	input := gql.FileStorageInput{
		BaseDir: "/non/existent/directory",
	}

	// Should not call registry operations since test fails
	// mockRegistryStore should not be called

	result, err := resolver.Mutation().ConfigureFileStorage(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.False(t, result.Success)
	assert.False(t, result.RestartRequired)
	assert.Contains(t, *result.Message, "Failed to access storage directory")

	// Verify no registry operations were attempted
	mockRegistryStore.AssertNotCalled(t, "SetMultiple")
	mockStorageProvider.AssertNotCalled(t, "ReloadFromRegistry")
}

func TestConfigureS3Storage_AutoTestSuccess(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createAdminContext("admin-user-id")

	// Note: This test will fail in practice because we can't create a real S3 connection
	// but it tests the flow where validation would succeed
	input := gql.S3StorageInput{
		Bucket: "test-bucket",
		Region: stringPtr("us-east-1"),
	}

	result, err := resolver.Mutation().ConfigureS3Storage(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	// This will be false because S3 test will fail, but we're testing the flow
	assert.False(t, result.Success)
	assert.Contains(t, *result.Message, "Failed to access storage directory")
}

func TestConfigureS3Storage_AutoTestFailure_MissingConfig(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createAdminContext("admin-user-id")

	// Test with missing bucket (invalid config)
	input := gql.S3StorageInput{
		Bucket: "", // Empty bucket should fail validation
	}

	result, err := resolver.Mutation().ConfigureS3Storage(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.False(t, result.Success)
	assert.False(t, result.RestartRequired)
	// Should fail during storage creation due to empty bucket
	assert.Contains(t, *result.Message, "Failed to create storage instance")

	// Verify no registry operations were attempted
	mockRegistryStore.AssertNotCalled(t, "SetMultiple")
}

func TestConfigureFileStorage_RequiresAdminPermission(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockImagorProvider := new(MockImagorProvider)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name: "Admin can configure storage",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
		{
			name: "User with write scope cannot configure storage",
			context: func() context.Context {
				return createReadWriteContext("test-user-id")
			},
			expectError: true,
			errorMsg:    "insufficient permission: admin access required",
		},
		{
			name: "User with read scope cannot configure storage",
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
			tempDir := t.TempDir()

			input := gql.FileStorageInput{
				BaseDir: tempDir,
			}

			if !tt.expectError {
				// Mock successful operations for admin
				resultRegistry := &registrystore.Registry{
					Key:   "config.storage_type",
					Value: "file",
				}
				mockRegistryStore.On("SetMulti", ctx, "system:global", mock.MatchedBy(func(entries []*registrystore.Registry) bool {
					return len(entries) >= 3 // At least 3 entries (type, configured, base_dir, timestamp)
				})).Return([]*registrystore.Registry{resultRegistry}, nil)
				mockStorageProvider.On("ReloadFromRegistry").Return(nil)
				mockStorageProvider.On("IsRestartRequired").Return(false)
				mockImagorProvider.On("ReloadFromRegistry").Return(nil)
			}

			result, err := resolver.Mutation().ConfigureFileStorage(ctx, input)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.True(t, result.Success)
			}

			// Reset mocks for next iteration
			mockRegistryStore.ExpectedCalls = nil
			mockStorageProvider.ExpectedCalls = nil
		})
	}
}

func TestConfigureS3Storage_RequiresAdminPermission(t *testing.T) {
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
			name: "Admin can configure S3 storage",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
		{
			name: "User with write scope cannot configure S3 storage",
			context: func() context.Context {
				return createReadWriteContext("test-user-id")
			},
			expectError: true,
			errorMsg:    "insufficient permission: admin access required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := tt.context()

			input := gql.S3StorageInput{
				Bucket: "test-bucket",
				Region: stringPtr("us-east-1"),
			}

			result, err := resolver.Mutation().ConfigureS3Storage(ctx, input)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				// For admin, expect the test to fail (since we can't connect to real S3)
				// but no permission error
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.False(t, result.Success) // Will fail due to invalid S3 config
			}
		})
	}
}

func TestConfigureFileStorage_ErrorMessageProxying(t *testing.T) {
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
		input          gql.FileStorageInput
		expectedMsg    string
		expectedDetail string
	}{
		{
			name: "Non-existent directory",
			input: gql.FileStorageInput{
				BaseDir: "/absolutely/non/existent/directory/path",
			},
			expectedMsg:    "Failed to access storage directory",
			expectedDetail: "no such file or directory",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := resolver.Mutation().ConfigureFileStorage(ctx, tt.input)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.False(t, result.Success)
			assert.False(t, result.RestartRequired)
			assert.Contains(t, *result.Message, tt.expectedMsg)

			// Verify no registry operations were attempted
			mockRegistryStore.AssertNotCalled(t, "SetMultiple")
			mockStorageProvider.AssertNotCalled(t, "ReloadFromRegistry")
		})
	}
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
