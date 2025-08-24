package resolver

import (
	"context"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/pkg/metadatastore"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

type MockMetadataStore struct {
	mock.Mock
}

func (m *MockMetadataStore) List(ctx context.Context, ownerID string, prefix *string) ([]*metadatastore.Metadata, error) {
	args := m.Called(ctx, ownerID, prefix)
	return args.Get(0).([]*metadatastore.Metadata), args.Error(1)
}

func (m *MockMetadataStore) Get(ctx context.Context, ownerID, key string) (*metadatastore.Metadata, error) {
	args := m.Called(ctx, ownerID, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*metadatastore.Metadata), args.Error(1)
}

func (m *MockMetadataStore) Set(ctx context.Context, ownerID, key, value string) (*metadatastore.Metadata, error) {
	args := m.Called(ctx, ownerID, key, value)
	return args.Get(0).(*metadatastore.Metadata), args.Error(1)
}

func (m *MockMetadataStore) Delete(ctx context.Context, ownerID, key string) error {
	args := m.Called(ctx, ownerID, key)
	return args.Error(0)
}

func TestSetUserMetadata_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "user:preference"
	value := "dark_mode"

	now := time.Now()
	resultMetadata := &metadatastore.Metadata{
		Key:       key,
		Value:     value,
		CreatedAt: now,
		UpdatedAt: now,
	}

	mockMetadataStore.On("Set", ctx, "test-user-id", key, value).Return(resultMetadata, nil)

	result, err := resolver.Mutation().SetUserMetadata(ctx, key, value, nil) // nil ownerID = self

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, key, result.Key)
	assert.Equal(t, value, result.Value)
	assert.Equal(t, "test-user-id", result.OwnerID)

	mockMetadataStore.AssertExpectations(t)
}

func TestSetUserMetadata_AdminForOtherUser(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := createAdminContext("admin-user-id")
	targetOwnerID := "target-user-id"
	key := "admin:note"
	value := "VIP user"

	now := time.Now()
	resultMetadata := &metadatastore.Metadata{
		Key:       key,
		Value:     value,
		CreatedAt: now,
		UpdatedAt: now,
	}

	mockMetadataStore.On("Set", ctx, targetOwnerID, key, value).Return(resultMetadata, nil)

	result, err := resolver.Mutation().SetUserMetadata(ctx, key, value, &targetOwnerID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, key, result.Key)
	assert.Equal(t, value, result.Value)
	assert.Equal(t, targetOwnerID, result.OwnerID)

	mockMetadataStore.AssertExpectations(t)
}

func TestSetUserMetadata_RegularUserCannotAccessOthers(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := createReadWriteContext("regular-user-id")
	targetOwnerID := "other-user-id"
	key := "test:key"
	value := "test value"

	result, err := resolver.Mutation().SetUserMetadata(ctx, key, value, &targetOwnerID)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "admin permission required")

	mockMetadataStore.AssertExpectations(t)
}

func TestSetUserMetadata_GuestCannotSet(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := createGuestContext("guest-id")
	key := "test:key"
	value := "test value"

	result, err := resolver.Mutation().SetUserMetadata(ctx, key, value, nil)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "guests cannot manage user metadata")

	mockMetadataStore.AssertExpectations(t)
}

func TestGetUserMetadata_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "user:preference"

	now := time.Now()
	mockMetadata := &metadatastore.Metadata{
		Key:       key,
		Value:     "dark_mode",
		CreatedAt: now,
		UpdatedAt: now,
	}

	mockMetadataStore.On("Get", ctx, "test-user-id", key).Return(mockMetadata, nil)

	result, err := resolver.Query().GetUserMetadata(ctx, key, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, key, result.Key)
	assert.Equal(t, "dark_mode", result.Value)
	assert.Equal(t, "test-user-id", result.OwnerID)

	mockMetadataStore.AssertExpectations(t)
}

func TestGetUserMetadata_NotFound(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "non-existent"

	mockMetadataStore.On("Get", ctx, "test-user-id", key).Return(nil, nil)

	result, err := resolver.Query().GetUserMetadata(ctx, key, nil)

	assert.NoError(t, err)
	assert.Nil(t, result)

	mockMetadataStore.AssertExpectations(t)
}

func TestListUserMetadata_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := createReadWriteContext("test-user-id")
	prefix := "app:"

	now := time.Now()
	mockMetadata := []*metadatastore.Metadata{
		{Key: "app:setting1", Value: "value1", CreatedAt: now, UpdatedAt: now},
		{Key: "app:setting2", Value: "value2", CreatedAt: now, UpdatedAt: now},
	}

	mockMetadataStore.On("List", ctx, "test-user-id", &prefix).Return(mockMetadata, nil)

	result, err := resolver.Query().ListUserMetadata(ctx, &prefix, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "app:setting1", result[0].Key)
	assert.Equal(t, "value1", result[0].Value)
	assert.Equal(t, "test-user-id", result[0].OwnerID)

	mockMetadataStore.AssertExpectations(t)
}

func TestDeleteUserMetadata_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "user:setting-to-delete"

	mockMetadataStore.On("Delete", ctx, "test-user-id", key).Return(nil)

	result, err := resolver.Mutation().DeleteUserMetadata(ctx, key, nil)

	assert.NoError(t, err)
	assert.True(t, result)

	mockMetadataStore.AssertExpectations(t)
}

func TestSetSystemMetadata_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name: "Admin can set system metadata",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
		{
			name: "Regular user cannot set system metadata",
			context: func() context.Context {
				return createReadWriteContext("user-id")
			},
			expectError: true,
			errorMsg:    "admin permission required",
		},
		{
			name: "Guest cannot set system metadata",
			context: func() context.Context {
				return createGuestContext("guest-id")
			},
			expectError: true,
			errorMsg:    "admin permission required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockMetadataStore.ExpectedCalls = nil
			ctx := tt.context()

			if !tt.expectError {
				now := time.Now()
				resultMetadata := &metadatastore.Metadata{
					Key:       "app_version",
					Value:     "1.0.0",
					CreatedAt: now,
					UpdatedAt: now,
				}
				mockMetadataStore.On("Set", ctx, "system", "app_version", "1.0.0").Return(resultMetadata, nil)
			}

			result, err := resolver.Mutation().SetSystemMetadata(ctx, "app_version", "1.0.0")

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, "app_version", result.Key)
				assert.Equal(t, "1.0.0", result.Value)
				assert.Equal(t, "system", result.OwnerID)
			}

			mockMetadataStore.AssertExpectations(t)
		})
	}
}

func TestGetSystemMetadata_OpenRead(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	tests := []struct {
		name    string
		context func() context.Context
	}{
		{
			name: "Admin can read system metadata",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
		},
		{
			name: "Regular user can read system metadata",
			context: func() context.Context {
				return createReadWriteContext("user-id")
			},
		},
		{
			name: "Guest can read system metadata",
			context: func() context.Context {
				return createGuestContext("guest-id")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockMetadataStore.ExpectedCalls = nil
			ctx := tt.context()

			now := time.Now()
			mockMetadata := &metadatastore.Metadata{
				Key:       "app_version",
				Value:     "1.0.0",
				CreatedAt: now,
				UpdatedAt: now,
			}

			mockMetadataStore.On("Get", ctx, "system", "app_version").Return(mockMetadata, nil)

			result, err := resolver.Query().GetSystemMetadata(ctx, "app_version")

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, "app_version", result.Key)
			assert.Equal(t, "1.0.0", result.Value)
			assert.Equal(t, "system", result.OwnerID)

			mockMetadataStore.AssertExpectations(t)
		})
	}
}

func TestListSystemMetadata_OpenRead(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := createReadWriteContext("user-id")
	prefix := "config:"

	now := time.Now()
	mockMetadata := []*metadatastore.Metadata{
		{Key: "config:setting1", Value: "value1", CreatedAt: now, UpdatedAt: now},
		{Key: "config:setting2", Value: "value2", CreatedAt: now, UpdatedAt: now},
	}

	mockMetadataStore.On("List", ctx, "system", &prefix).Return(mockMetadata, nil)

	result, err := resolver.Query().ListSystemMetadata(ctx, &prefix)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "config:setting1", result[0].Key)
	assert.Equal(t, "value1", result[0].Value)
	assert.Equal(t, "system", result[0].OwnerID)

	mockMetadataStore.AssertExpectations(t)
}

func TestDeleteSystemMetadata_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name: "Admin can delete system metadata",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
		{
			name: "Regular user cannot delete system metadata",
			context: func() context.Context {
				return createReadWriteContext("user-id")
			},
			expectError: true,
			errorMsg:    "admin permission required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockMetadataStore.ExpectedCalls = nil
			ctx := tt.context()

			if !tt.expectError {
				mockMetadataStore.On("Delete", ctx, "system", "old_config").Return(nil)
			}

			result, err := resolver.Mutation().DeleteSystemMetadata(ctx, "old_config")

			if tt.expectError {
				assert.Error(t, err)
				assert.False(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.True(t, result)
			}

			mockMetadataStore.AssertExpectations(t)
		})
	}
}

func TestUserMetadata_PermissionEdgeCases(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		ownerID     *string
		expectError bool
		errorMsg    string
	}{
		{
			name: "User can access own metadata explicitly",
			context: func() context.Context {
				return createReadWriteContext("user-123")
			},
			ownerID:     stringPtr("user-123"),
			expectError: false,
		},
		{
			name: "User cannot access other user's metadata",
			context: func() context.Context {
				return createReadWriteContext("user-123")
			},
			ownerID:     stringPtr("user-456"),
			expectError: true,
			errorMsg:    "admin permission required",
		},
		{
			name: "Admin can access any user's metadata",
			context: func() context.Context {
				return createAdminContext("admin-123")
			},
			ownerID:     stringPtr("user-456"),
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockMetadataStore.ExpectedCalls = nil
			ctx := tt.context()

			if !tt.expectError {
				expectedOwnerID := *tt.ownerID
				mockMetadataStore.On("List", ctx, expectedOwnerID, (*string)(nil)).Return([]*metadatastore.Metadata{}, nil)
			}

			result, err := resolver.Query().ListUserMetadata(ctx, nil, tt.ownerID)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
			}

			mockMetadataStore.AssertExpectations(t)
		})
	}
}

// Helper function to create guest context
func createGuestContext(guestID string) context.Context {
	return createUserContext(guestID, "guest", []string{"read"})
}
