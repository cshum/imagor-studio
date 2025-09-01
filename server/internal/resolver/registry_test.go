package resolver

import (
	"context"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

type MockRegistryStore struct {
	mock.Mock
}

func (m *MockRegistryStore) List(ctx context.Context, ownerID string, prefix *string) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, prefix)
	return args.Get(0).([]*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) Get(ctx context.Context, ownerID, key string) (*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) Set(ctx context.Context, ownerID, key, value string, isEncrypted bool) (*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, key, value, isEncrypted)
	return args.Get(0).(*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) Delete(ctx context.Context, ownerID, key string) error {
	args := m.Called(ctx, ownerID, key)
	return args.Error(0)
}

func TestSetUserRegistry_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "user:preference"
	value := "dark_mode"

	now := time.Now()
	resultRegistry := &registrystore.Registry{
		Key:       key,
		Value:     value,
		CreatedAt: now,
		UpdatedAt: now,
	}

	mockRegistryStore.On("Set", ctx, "test-user-id", key, value, false).Return(resultRegistry, nil)

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, entries, nil) // nil ownerID = self

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, value, result[0].Value)
	assert.Equal(t, "test-user-id", result[0].OwnerID)

	mockRegistryStore.AssertExpectations(t)
}

func TestSetUserRegistry_AdminForOtherUser(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createAdminContext("admin-user-id")
	targetOwnerID := "target-user-id"
	key := "admin:note"
	value := "VIP user"

	now := time.Now()
	resultRegistry := &registrystore.Registry{
		Key:       key,
		Value:     value,
		CreatedAt: now,
		UpdatedAt: now,
	}

	mockRegistryStore.On("Set", ctx, targetOwnerID, key, value, false).Return(resultRegistry, nil)

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, entries, &targetOwnerID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, value, result[0].Value)
	assert.Equal(t, targetOwnerID, result[0].OwnerID)

	mockRegistryStore.AssertExpectations(t)
}

func TestSetUserRegistry_RegularUserCannotAccessOthers(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("regular-user-id")
	targetOwnerID := "other-user-id"
	key := "test:key"
	value := "test value"

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, entries, &targetOwnerID)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "admin permission required")

	mockRegistryStore.AssertExpectations(t)
}

func TestSetUserRegistry_GuestCannotSet(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createGuestContext("guest-id")
	key := "test:key"
	value := "test value"

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, entries, nil)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "cannot update a guest user")

	mockRegistryStore.AssertExpectations(t)
}

func TestGetUserRegistry_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "user:preference"

	now := time.Now()
	mockRegistry := &registrystore.Registry{
		Key:       key,
		Value:     "dark_mode",
		CreatedAt: now,
		UpdatedAt: now,
	}

	mockRegistryStore.On("Get", ctx, "test-user-id", key).Return(mockRegistry, nil)

	result, err := resolver.Query().GetUserRegistry(ctx, key, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, key, result.Key)
	assert.Equal(t, "dark_mode", result.Value)
	assert.Equal(t, "test-user-id", result.OwnerID)

	mockRegistryStore.AssertExpectations(t)
}

func TestGetUserRegistry_NotFound(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "non-existent"

	mockRegistryStore.On("Get", ctx, "test-user-id", key).Return(nil, nil)

	result, err := resolver.Query().GetUserRegistry(ctx, key, nil)

	assert.NoError(t, err)
	assert.Nil(t, result)

	mockRegistryStore.AssertExpectations(t)
}

func TestListUserRegistry_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("test-user-id")
	prefix := "app:"

	now := time.Now()
	mockRegistry := []*registrystore.Registry{
		{Key: "app:setting1", Value: "value1", CreatedAt: now, UpdatedAt: now},
		{Key: "app:setting2", Value: "value2", CreatedAt: now, UpdatedAt: now},
	}

	mockRegistryStore.On("List", ctx, "test-user-id", &prefix).Return(mockRegistry, nil)

	result, err := resolver.Query().ListUserRegistry(ctx, &prefix, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "app:setting1", result[0].Key)
	assert.Equal(t, "value1", result[0].Value)
	assert.Equal(t, "test-user-id", result[0].OwnerID)

	mockRegistryStore.AssertExpectations(t)
}

func TestDeleteUserRegistry_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "user:setting-to-delete"

	mockRegistryStore.On("Delete", ctx, "test-user-id", key).Return(nil)

	result, err := resolver.Mutation().DeleteUserRegistry(ctx, key, nil)

	assert.NoError(t, err)
	assert.True(t, result)

	mockRegistryStore.AssertExpectations(t)
}

func TestSetSystemRegistry_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name: "Admin can set system registry",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
		{
			name: "Regular user cannot set system registry",
			context: func() context.Context {
				return createReadWriteContext("user-id")
			},
			expectError: true,
			errorMsg:    "admin permission required",
		},
		{
			name: "Guest cannot set system registry",
			context: func() context.Context {
				return createGuestContext("guest-id")
			},
			expectError: true,
			errorMsg:    "admin permission required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRegistryStore.ExpectedCalls = nil
			ctx := tt.context()

			if !tt.expectError {
				now := time.Now()
				resultRegistry := &registrystore.Registry{
					Key:       "app_version",
					Value:     "1.0.0",
					CreatedAt: now,
					UpdatedAt: now,
				}
				mockRegistryStore.On("Set", ctx, "system", "app_version", "1.0.0", false).Return(resultRegistry, nil)
			}

			entries := []*gql.RegistryEntryInput{{Key: "app_version", Value: "1.0.0"}}
			result, err := resolver.Mutation().SetSystemRegistry(ctx, entries)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Len(t, result, 1)
				assert.Equal(t, "app_version", result[0].Key)
				assert.Equal(t, "1.0.0", result[0].Value)
				assert.Equal(t, "system", result[0].OwnerID)
			}

			mockRegistryStore.AssertExpectations(t)
		})
	}
}

func TestGetSystemRegistry_OpenRead(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name    string
		context func() context.Context
	}{
		{
			name: "Admin can read system registry",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
		},
		{
			name: "Regular user can read system registry",
			context: func() context.Context {
				return createReadWriteContext("user-id")
			},
		},
		{
			name: "Guest can read system registry",
			context: func() context.Context {
				return createGuestContext("guest-id")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRegistryStore.ExpectedCalls = nil
			ctx := tt.context()

			now := time.Now()
			mockRegistry := &registrystore.Registry{
				Key:       "app_version",
				Value:     "1.0.0",
				CreatedAt: now,
				UpdatedAt: now,
			}

			mockRegistryStore.On("Get", ctx, "system", "app_version").Return(mockRegistry, nil)

			result, err := resolver.Query().GetSystemRegistry(ctx, "app_version")

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, "app_version", result.Key)
			assert.Equal(t, "1.0.0", result.Value)
			assert.Equal(t, "system", result.OwnerID)

			mockRegistryStore.AssertExpectations(t)
		})
	}
}

func TestListSystemRegistry_OpenRead(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("user-id")
	prefix := "config:"

	now := time.Now()
	mockRegistry := []*registrystore.Registry{
		{Key: "config:setting1", Value: "value1", CreatedAt: now, UpdatedAt: now},
		{Key: "config:setting2", Value: "value2", CreatedAt: now, UpdatedAt: now},
	}

	mockRegistryStore.On("List", ctx, "system", &prefix).Return(mockRegistry, nil)

	result, err := resolver.Query().ListSystemRegistry(ctx, &prefix)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "config:setting1", result[0].Key)
	assert.Equal(t, "value1", result[0].Value)
	assert.Equal(t, "system", result[0].OwnerID)

	mockRegistryStore.AssertExpectations(t)
}

func TestDeleteSystemRegistry_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name: "Admin can delete system registry",
			context: func() context.Context {
				return createAdminContext("admin-user-id")
			},
			expectError: false,
		},
		{
			name: "Regular user cannot delete system registry",
			context: func() context.Context {
				return createReadWriteContext("user-id")
			},
			expectError: true,
			errorMsg:    "admin permission required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRegistryStore.ExpectedCalls = nil
			ctx := tt.context()

			if !tt.expectError {
				mockRegistryStore.On("Delete", ctx, "system", "old_config").Return(nil)
			}

			result, err := resolver.Mutation().DeleteSystemRegistry(ctx, "old_config")

			if tt.expectError {
				assert.Error(t, err)
				assert.False(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.True(t, result)
			}

			mockRegistryStore.AssertExpectations(t)
		})
	}
}

func TestUserRegistry_PermissionEdgeCases(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	tests := []struct {
		name        string
		context     func() context.Context
		ownerID     *string
		expectError bool
		errorMsg    string
	}{
		{
			name: "User can access own registry explicitly",
			context: func() context.Context {
				return createReadWriteContext("user-123")
			},
			ownerID:     stringPtr("user-123"),
			expectError: false,
		},
		{
			name: "User cannot access other user's registry",
			context: func() context.Context {
				return createReadWriteContext("user-123")
			},
			ownerID:     stringPtr("user-456"),
			expectError: true,
			errorMsg:    "admin permission required",
		},
		{
			name: "Admin can access any user's registry",
			context: func() context.Context {
				return createAdminContext("admin-123")
			},
			ownerID:     stringPtr("user-456"),
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRegistryStore.ExpectedCalls = nil
			ctx := tt.context()

			if !tt.expectError {
				expectedOwnerID := *tt.ownerID
				mockRegistryStore.On("List", ctx, expectedOwnerID, (*string)(nil)).Return([]*registrystore.Registry{}, nil)
			}

			result, err := resolver.Query().ListUserRegistry(ctx, nil, tt.ownerID)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
			}

			mockRegistryStore.AssertExpectations(t)
		})
	}
}

// Helper function to create guest context
func createGuestContext(guestID string) context.Context {
	return createUserContext(guestID, "guest", []string{"read"})
}

func TestSetUserRegistry_EncryptedValueHidden(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "api_secret"
	value := "super-secret-value"

	now := time.Now()
	resultRegistry := &registrystore.Registry{
		Key:         key,
		Value:       value,
		IsEncrypted: true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	mockRegistryStore.On("Set", ctx, "test-user-id", key, value, true).Return(resultRegistry, nil)

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value, IsEncrypted: true}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, entries, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, "", result[0].Value) // Value should be empty for encrypted entries
	assert.Equal(t, true, result[0].IsEncrypted)
	assert.Equal(t, "test-user-id", result[0].OwnerID)

	mockRegistryStore.AssertExpectations(t)
}

func TestGetUserRegistry_EncryptedValueHidden(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "api_secret"

	now := time.Now()
	mockRegistry := &registrystore.Registry{
		Key:         key,
		Value:       "super-secret-value",
		IsEncrypted: true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	mockRegistryStore.On("Get", ctx, "test-user-id", key).Return(mockRegistry, nil)

	result, err := resolver.Query().GetUserRegistry(ctx, key, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, key, result.Key)
	assert.Equal(t, "", result.Value) // Value should be empty for encrypted entries
	assert.Equal(t, true, result.IsEncrypted)
	assert.Equal(t, "test-user-id", result.OwnerID)

	mockRegistryStore.AssertExpectations(t)
}

func TestListUserRegistry_EncryptedValueHidden(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createReadWriteContext("test-user-id")

	now := time.Now()
	mockRegistry := []*registrystore.Registry{
		{Key: "normal_setting", Value: "visible_value", IsEncrypted: false, CreatedAt: now, UpdatedAt: now},
		{Key: "api_secret", Value: "super-secret-value", IsEncrypted: true, CreatedAt: now, UpdatedAt: now},
	}

	mockRegistryStore.On("List", ctx, "test-user-id", (*string)(nil)).Return(mockRegistry, nil)

	result, err := resolver.Query().ListUserRegistry(ctx, nil, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)

	// First entry (not encrypted)
	assert.Equal(t, "normal_setting", result[0].Key)
	assert.Equal(t, "visible_value", result[0].Value)
	assert.Equal(t, false, result[0].IsEncrypted)

	// Second entry (encrypted)
	assert.Equal(t, "api_secret", result[1].Key)
	assert.Equal(t, "", result[1].Value) // Value should be empty for encrypted entries
	assert.Equal(t, true, result[1].IsEncrypted)

	mockRegistryStore.AssertExpectations(t)
}

func TestSetSystemRegistry_EncryptedValueHidden(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, cfg, logger)

	ctx := createAdminContext("admin-user-id")
	key := "jwt_secret"
	value := "super-secret-jwt-key"

	now := time.Now()
	resultRegistry := &registrystore.Registry{
		Key:         key,
		Value:       value,
		IsEncrypted: true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	mockRegistryStore.On("Set", ctx, "system", key, value, true).Return(resultRegistry, nil)

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value, IsEncrypted: true}}
	result, err := resolver.Mutation().SetSystemRegistry(ctx, entries)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, "", result[0].Value) // Value should be empty for encrypted entries
	assert.Equal(t, true, result[0].IsEncrypted)
	assert.Equal(t, "system", result[0].OwnerID)

	mockRegistryStore.AssertExpectations(t)
}
