package resolver

import (
	"context"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/license"
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

func (m *MockRegistryStore) GetMulti(ctx context.Context, ownerID string, keys []string) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, keys)
	return args.Get(0).([]*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) Set(ctx context.Context, ownerID, key, value string, isEncrypted bool) (*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, key, value, isEncrypted)
	return args.Get(0).(*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) SetMulti(ctx context.Context, ownerID string, entries []*registrystore.Registry) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, entries)
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

func TestSetUserRegistry_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "user:preference"
	value := "dark_mode"

	resultRegistry := &registrystore.Registry{
		Key:   key,
		Value: value,
	}

	expectedEntries := []*registrystore.Registry{{Key: key, Value: value, IsEncrypted: false}}
	mockRegistryStore.On("SetMulti", ctx, "user:test-user-id", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, nil, entries, nil) // nil ownerID = self

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, value, result[0].Value)

	mockRegistryStore.AssertExpectations(t)
}

func TestSetUserRegistry_AdminForOtherUser(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createAdminContext("admin-user-id")
	targetOwnerID := "target-user-id"
	key := "admin:note"
	value := "VIP user"

	resultRegistry := &registrystore.Registry{
		Key:   key,
		Value: value,
	}

	expectedEntries := []*registrystore.Registry{{Key: key, Value: value, IsEncrypted: false}}
	mockRegistryStore.On("SetMulti", ctx, "user:"+targetOwnerID, expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, nil, entries, &targetOwnerID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, value, result[0].Value)

	mockRegistryStore.AssertExpectations(t)
}

func TestSetUserRegistry_RegularUserCannotAccessOthers(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("regular-user-id")
	targetOwnerID := "other-user-id"
	key := "test:key"
	value := "test value"

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, nil, entries, &targetOwnerID)

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
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createGuestContext("guest-id")
	key := "test:key"
	value := "test value"

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, nil, entries, nil)

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
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "user:preference"

	mockRegistry := &registrystore.Registry{
		Key:   key,
		Value: "dark_mode",
	}

	mockRegistryStore.On("Get", ctx, "user:test-user-id", key).Return(mockRegistry, nil)

	result, err := resolver.Query().GetUserRegistry(ctx, &key, nil, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, "dark_mode", result[0].Value)

	mockRegistryStore.AssertExpectations(t)
}

func TestGetUserRegistry_NotFound(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "non-existent"

	mockRegistryStore.On("Get", ctx, "user:test-user-id", key).Return(nil, nil)

	result, err := resolver.Query().GetUserRegistry(ctx, &key, nil, nil)

	assert.NoError(t, err)
	assert.Len(t, result, 0)

	mockRegistryStore.AssertExpectations(t)
}

func TestListUserRegistry_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")
	prefix := "app:"

	mockRegistry := []*registrystore.Registry{
		{Key: "app:setting1", Value: "value1"},
		{Key: "app:setting2", Value: "value2"},
	}

	mockRegistryStore.On("List", ctx, "user:test-user-id", &prefix).Return(mockRegistry, nil)

	result, err := resolver.Query().ListUserRegistry(ctx, &prefix, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "app:setting1", result[0].Key)
	assert.Equal(t, "value1", result[0].Value)

	mockRegistryStore.AssertExpectations(t)
}

func TestDeleteUserRegistry_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "user:setting-to-delete"

	mockRegistryStore.On("Delete", ctx, "user:test-user-id", key).Return(nil)

	result, err := resolver.Mutation().DeleteUserRegistry(ctx, &key, nil, nil)

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
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

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

				resultRegistry := &registrystore.Registry{
					Key:   "app_version",
					Value: "1.0.0",
				}
				expectedEntries := []*registrystore.Registry{{Key: "app_version", Value: "1.0.0", IsEncrypted: false}}
				mockRegistryStore.On("SetMulti", ctx, "system:global", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)
			}

			entries := []*gql.RegistryEntryInput{{Key: "app_version", Value: "1.0.0"}}
			result, err := resolver.Mutation().SetSystemRegistry(ctx, nil, entries)

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
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

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

			mockRegistry := &registrystore.Registry{
				Key:   "app_version",
				Value: "1.0.0",
			}

			mockRegistryStore.On("Get", ctx, "system:global", "app_version").Return(mockRegistry, nil)

			key := "app_version"
			result, err := resolver.Query().GetSystemRegistry(ctx, &key, nil)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Len(t, result, 1)
			assert.Equal(t, "app_version", result[0].Key)
			assert.Equal(t, "1.0.0", result[0].Value)

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
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("user-id")
	prefix := "config:"

	mockRegistry := []*registrystore.Registry{
		{Key: "config:setting1", Value: "value1"},
		{Key: "config:setting2", Value: "value2"},
	}

	mockRegistryStore.On("List", ctx, "system:global", &prefix).Return(mockRegistry, nil)

	result, err := resolver.Query().ListSystemRegistry(ctx, &prefix)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "config:setting1", result[0].Key)
	assert.Equal(t, "value1", result[0].Value)

	mockRegistryStore.AssertExpectations(t)
}

func TestDeleteSystemRegistry_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

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
				mockRegistryStore.On("Delete", ctx, "system:global", "old_config").Return(nil)
			}

			key := "old_config"
			result, err := resolver.Mutation().DeleteSystemRegistry(ctx, &key, nil)

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
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

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
				mockRegistryStore.On("List", ctx, "user:"+expectedOwnerID, (*string)(nil)).Return([]*registrystore.Registry{}, nil)
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
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "api_secret"
	value := "super-secret-value"

	resultRegistry := &registrystore.Registry{
		Key:         key,
		Value:       value,
		IsEncrypted: true,
	}

	expectedEntries := []*registrystore.Registry{{Key: key, Value: value, IsEncrypted: true}}
	mockRegistryStore.On("SetMulti", ctx, "user:test-user-id", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value, IsEncrypted: true}}
	result, err := resolver.Mutation().SetUserRegistry(ctx, nil, entries, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, "", result[0].Value) // Value should be empty for encrypted entries
	assert.Equal(t, true, result[0].IsEncrypted)

	mockRegistryStore.AssertExpectations(t)
}

func TestGetUserRegistry_EncryptedValueHidden(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")
	key := "api_secret"

	mockRegistry := &registrystore.Registry{
		Key:         key,
		Value:       "super-secret-value",
		IsEncrypted: true,
	}

	mockRegistryStore.On("Get", ctx, "user:test-user-id", key).Return(mockRegistry, nil)

	result, err := resolver.Query().GetUserRegistry(ctx, &key, nil, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, "", result[0].Value) // Value should be empty for encrypted entries
	assert.Equal(t, true, result[0].IsEncrypted)

	mockRegistryStore.AssertExpectations(t)
}

func TestListUserRegistry_EncryptedValueHidden(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	mockRegistry := []*registrystore.Registry{
		{Key: "normal_setting", Value: "visible_value", IsEncrypted: false},
		{Key: "api_secret", Value: "super-secret-value", IsEncrypted: true},
	}

	mockRegistryStore.On("List", ctx, "user:test-user-id", (*string)(nil)).Return(mockRegistry, nil)

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
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createAdminContext("admin-user-id")
	key := "config.jwt_secret"
	value := "super-secret-jwt-key"

	resultRegistry := &registrystore.Registry{
		Key:         key,
		Value:       value,
		IsEncrypted: true,
	}

	expectedEntries := []*registrystore.Registry{{Key: key, Value: value, IsEncrypted: true}}
	mockRegistryStore.On("SetMulti", ctx, "system:global", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value, IsEncrypted: true}}
	result, err := resolver.Mutation().SetSystemRegistry(ctx, nil, entries)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	assert.Equal(t, key, result[0].Key)
	assert.Equal(t, "", result[0].Value) // Value should be empty for encrypted entries
	assert.Equal(t, true, result[0].IsEncrypted)

	mockRegistryStore.AssertExpectations(t)
}

func TestSetSystemRegistry_OverridePrevention(t *testing.T) {
	tests := []struct {
		name          string
		registryKey   string
		configExists  bool
		configValue   string
		expectError   bool
		errorContains string
		description   string
	}{
		{
			name:         "Allow setting non-config registry key",
			registryKey:  "app.version",
			configExists: false,
			expectError:  false,
			description:  "Non-config keys should be allowed",
		},
		{
			name:         "Allow setting config key when no external config exists",
			registryKey:  "config.storage_type",
			configExists: false,
			expectError:  false,
			description:  "Config keys should be allowed when no external config exists",
		},
		{
			name:          "Prevent setting config key when external config exists",
			registryKey:   "config.allow_guest_mode",
			configExists:  true,
			configValue:   "true",
			expectError:   true,
			errorContains: "this configuration is managed by external config",
			description:   "Should prevent setting when external config exists",
		},
		{
			name:          "Prevent setting config.storage_type when external config exists",
			registryKey:   "config.storage_type",
			configExists:  true,
			configValue:   "s3",
			expectError:   true,
			errorContains: "this configuration is managed by external config",
			description:   "Should prevent setting storage type when external config exists",
		},
		{
			name:          "Prevent setting config.jwt_secret when external config exists",
			registryKey:   "config.jwt_secret",
			configExists:  true,
			configValue:   "external-secret",
			expectError:   true,
			errorContains: "this configuration is managed by external config",
			description:   "Should prevent setting JWT secret when external config exists",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage := new(MockStorage)
			mockRegistryStore := new(MockRegistryStore)
			mockUserStore := new(MockUserStore)
			logger, _ := zap.NewDevelopment()

			// Create a mock config that simulates GetByRegistryKey behavior
			mockConfig := &MockConfig{
				configExists: tt.configExists,
				configValue:  tt.configValue,
			}

			mockStorageProvider := NewMockStorageProvider(mockStorage)
			resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, mockConfig, nil, logger)

			ctx := createAdminContext("admin-user-id")

			if !tt.expectError {
				// Only expect registry store call if we're not expecting an error

				resultRegistry := &registrystore.Registry{
					Key:   tt.registryKey,
					Value: "test-value",
				}
				expectedEntries := []*registrystore.Registry{{Key: tt.registryKey, Value: "test-value", IsEncrypted: false}}
				mockRegistryStore.On("SetMulti", ctx, "system:global", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)
			}

			entries := []*gql.RegistryEntryInput{{Key: tt.registryKey, Value: "test-value"}}
			result, err := resolver.Mutation().SetSystemRegistry(ctx, nil, entries)

			if tt.expectError {
				assert.Error(t, err, tt.description)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), tt.errorContains, tt.description)
			} else {
				assert.NoError(t, err, tt.description)
				assert.NotNil(t, result)
				assert.Len(t, result, 1)
				assert.Equal(t, tt.registryKey, result[0].Key)
			}

			mockRegistryStore.AssertExpectations(t)
		})
	}
}

func TestGetSystemRegistry_OverrideDetection(t *testing.T) {
	tests := []struct {
		name                 string
		registryKey          string
		registryValue        string
		configExists         bool
		configValue          string
		expectedValue        string
		expectedIsOverridden bool
		description          string
	}{
		{
			name:                 "Registry value only - not overridden",
			registryKey:          "app.version",
			registryValue:        "1.0.0",
			configExists:         false,
			expectedValue:        "1.0.0",
			expectedIsOverridden: false,
			description:          "Non-config registry values should not be marked as overridden",
		},
		{
			name:                 "Config key exists - overridden",
			registryKey:          "config.allow_guest_mode",
			registryValue:        "true",
			configExists:         true,
			configValue:          "false",
			expectedValue:        "false",
			expectedIsOverridden: true,
			description:          "Config values should be marked as overridden when external config exists",
		},
		{
			name:                 "Config key exists with same value - still overridden",
			registryKey:          "config.storage_type",
			registryValue:        "file",
			configExists:         true,
			configValue:          "file",
			expectedValue:        "file",
			expectedIsOverridden: true,
			description:          "Should be marked as overridden even when values match",
		},
		{
			name:                 "Config key without external config - not overridden",
			registryKey:          "config.imagor_mode",
			registryValue:        "external",
			configExists:         false,
			expectedValue:        "external",
			expectedIsOverridden: false,
			description:          "Config keys without external config should not be overridden",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage := new(MockStorage)
			mockRegistryStore := new(MockRegistryStore)
			mockUserStore := new(MockUserStore)
			logger, _ := zap.NewDevelopment()

			// Create a mock config that simulates GetByRegistryKey behavior
			mockConfig := &MockConfig{
				configExists: tt.configExists,
				configValue:  tt.configValue,
			}

			mockStorageProvider := NewMockStorageProvider(mockStorage)
			resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, mockConfig, nil, logger)

			ctx := createReadWriteContext("user-id")

			mockRegistry := &registrystore.Registry{
				Key:   tt.registryKey,
				Value: tt.registryValue,
			}

			mockRegistryStore.On("Get", ctx, "system:global", tt.registryKey).Return(mockRegistry, nil)

			result, err := resolver.Query().GetSystemRegistry(ctx, &tt.registryKey, nil)

			assert.NoError(t, err, tt.description)
			assert.NotNil(t, result)
			assert.Len(t, result, 1)
			assert.Equal(t, tt.registryKey, result[0].Key)
			assert.Equal(t, tt.expectedValue, result[0].Value, "Value mismatch: %s", tt.description)
			assert.Equal(t, tt.expectedIsOverridden, result[0].IsOverriddenByConfig, "Override detection mismatch: %s", tt.description)

			mockRegistryStore.AssertExpectations(t)
		})
	}
}

func TestListSystemRegistry_OverrideDetection(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()

	// Create a mock config that simulates different override scenarios
	mockConfig := &MockConfigMultiple{
		configs: map[string]MockConfigEntry{
			"config.allow_guest_mode": {exists: true, value: "false"},
			"config.storage_type":     {exists: false, value: ""},
			"app.version":             {exists: false, value: ""},
		},
	}

	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, mockConfig, nil, logger)

	ctx := createReadWriteContext("user-id")

	mockRegistries := []*registrystore.Registry{
		{Key: "config.allow_guest_mode", Value: "true"},
		{Key: "config.storage_type", Value: "file"},
		{Key: "app.version", Value: "1.0.0"},
	}

	mockRegistryStore.On("List", ctx, "system:global", (*string)(nil)).Return(mockRegistries, nil)

	result, err := resolver.Query().ListSystemRegistry(ctx, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 3)

	// Check config.allow_guest_mode - should be overridden
	guestModeEntry := findRegistryByKey(result, "config.allow_guest_mode")
	assert.NotNil(t, guestModeEntry)
	assert.Equal(t, "false", guestModeEntry.Value) // Should use config value
	assert.True(t, guestModeEntry.IsOverriddenByConfig)

	// Check config.storage_type - should not be overridden
	storageEntry := findRegistryByKey(result, "config.storage_type")
	assert.NotNil(t, storageEntry)
	assert.Equal(t, "file", storageEntry.Value) // Should use registry value
	assert.False(t, storageEntry.IsOverriddenByConfig)

	// Check app.version - should not be overridden
	versionEntry := findRegistryByKey(result, "app.version")
	assert.NotNil(t, versionEntry)
	assert.Equal(t, "1.0.0", versionEntry.Value) // Should use registry value
	assert.False(t, versionEntry.IsOverriddenByConfig)

	mockRegistryStore.AssertExpectations(t)
}

// Helper function to find registry entry by key
func findRegistryByKey(registries []*gql.SystemRegistry, key string) *gql.SystemRegistry {
	for _, registry := range registries {
		if registry.Key == key {
			return registry
		}
	}
	return nil
}

// MockConfig for testing GetByRegistryKey behavior
type MockConfig struct {
	configExists bool
	configValue  string
}

func (m *MockConfig) GetByRegistryKey(registryKey string) (effectiveValue string, exists bool) {
	return m.configValue, m.configExists
}

func (m *MockConfig) IsEmbeddedMode() bool {
	return false // Default to non-embedded mode for tests
}

// MockConfigMultiple for testing multiple registry keys
type MockConfigMultiple struct {
	configs map[string]MockConfigEntry
}

type MockConfigEntry struct {
	exists bool
	value  string
}

func (m *MockConfigMultiple) GetByRegistryKey(registryKey string) (effectiveValue string, exists bool) {
	if entry, found := m.configs[registryKey]; found {
		return entry.value, entry.exists
	}
	return "", false
}

func (m *MockConfigMultiple) IsEmbeddedMode() bool {
	return false // Default to non-embedded mode for tests
}

// MockConfigEmbedded simulates embedded mode with multiple registry keys.
type MockConfigEmbedded struct {
	configs map[string]MockConfigEntry
}

func (m *MockConfigEmbedded) GetByRegistryKey(registryKey string) (effectiveValue string, exists bool) {
	if entry, found := m.configs[registryKey]; found {
		return entry.value, entry.exists
	}
	return "", false
}

func (m *MockConfigEmbedded) IsEmbeddedMode() bool {
	return true
}

// --- License enforcement tests ---

func TestSetSystemRegistry_LicenseRequired_Unlicensed(t *testing.T) {
	tests := []struct {
		name string
		key  string
	}{
		{name: "app_title rejected when unlicensed", key: "config.app_title"},
		{name: "app_url rejected when unlicensed", key: "config.app_url"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage := new(MockStorage)
			mockRegistryStore := new(MockRegistryStore)
			mockUserStore := new(MockUserStore)
			mockLicense := new(MockLicenseChecker)
			logger, _ := zap.NewDevelopment()
			cfg := &config.Config{}
			mockStorageProvider := NewMockStorageProvider(mockStorage)
			resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, mockLicense, logger)

			ctx := createAdminContext("admin-user-id")
			mockLicense.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{IsLicensed: false}, nil)

			entries := []*gql.RegistryEntryInput{{Key: tt.key, Value: "My Brand"}}
			result, err := resolver.Mutation().SetSystemRegistry(ctx, nil, entries)

			assert.Error(t, err)
			assert.Nil(t, result)
			assert.Contains(t, err.Error(), "a valid license is required")
			assert.Contains(t, err.Error(), tt.key)

			// Registry store must NOT be called
			mockRegistryStore.AssertNotCalled(t, "SetMulti")
			mockLicense.AssertExpectations(t)
		})
	}
}

func TestSetSystemRegistry_LicenseRequired_Licensed(t *testing.T) {
	tests := []struct {
		name  string
		key   string
		value string
	}{
		{name: "app_title allowed when licensed", key: "config.app_title", value: "My Studio"},
		{name: "app_url allowed when licensed", key: "config.app_url", value: "https://example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockStorage := new(MockStorage)
			mockRegistryStore := new(MockRegistryStore)
			mockUserStore := new(MockUserStore)
			mockLicense := new(MockLicenseChecker)
			logger, _ := zap.NewDevelopment()
			cfg := &config.Config{} // no config override
			mockStorageProvider := NewMockStorageProvider(mockStorage)
			resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, mockLicense, logger)

			ctx := createAdminContext("admin-user-id")
			mockLicense.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{IsLicensed: true}, nil)

			resultEntry := &registrystore.Registry{Key: tt.key, Value: tt.value}
			expectedEntries := []*registrystore.Registry{{Key: tt.key, Value: tt.value, IsEncrypted: false}}
			mockRegistryStore.On("SetMulti", ctx, "system:global", expectedEntries).Return([]*registrystore.Registry{resultEntry}, nil)

			entries := []*gql.RegistryEntryInput{{Key: tt.key, Value: tt.value}}
			result, err := resolver.Mutation().SetSystemRegistry(ctx, nil, entries)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Len(t, result, 1)
			assert.Equal(t, tt.key, result[0].Key)
			assert.Equal(t, tt.value, result[0].Value)

			mockRegistryStore.AssertExpectations(t)
			mockLicense.AssertExpectations(t)
		})
	}
}

func TestSetSystemRegistry_LicenseRequired_CheckOnlyOnce(t *testing.T) {
	// Submitting multiple license-required keys should only call GetLicenseStatus once
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockLicense := new(MockLicenseChecker)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, mockLicense, logger)

	ctx := createAdminContext("admin-user-id")
	// Expect exactly ONE call regardless of how many license-required keys are in the batch
	mockLicense.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{IsLicensed: false}, nil).Once()

	entries := []*gql.RegistryEntryInput{
		{Key: "config.app_title", Value: "My Studio"},
		{Key: "config.app_url", Value: "https://example.com"},
	}
	result, err := resolver.Mutation().SetSystemRegistry(ctx, nil, entries)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "a valid license is required")
	mockLicense.AssertExpectations(t) // verifies called exactly once
}

func TestSetSystemRegistry_NonLicenseRequired_NoLicenseCheck(t *testing.T) {
	// Non-license-required keys must not trigger a license check even without licenseService
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	// nil licenseService — if the code wrongly calls it, a nil-pointer panic will fail the test
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createAdminContext("admin-user-id")
	key := "config.app_home_title"
	value := "Gallery"

	resultEntry := &registrystore.Registry{Key: key, Value: value}
	expectedEntries := []*registrystore.Registry{{Key: key, Value: value, IsEncrypted: false}}
	mockRegistryStore.On("SetMulti", ctx, "system:global", expectedEntries).Return([]*registrystore.Registry{resultEntry}, nil)

	entries := []*gql.RegistryEntryInput{{Key: key, Value: value}}
	result, err := resolver.Mutation().SetSystemRegistry(ctx, nil, entries)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 1)
	mockRegistryStore.AssertExpectations(t)
}

func TestGetSystemRegistry_LicenseRequired_OmittedWhenUnlicensed(t *testing.T) {
	// When unlicensed, license-required keys are omitted entirely from the response —
	// regardless of whether the value comes from the DB, env var, or CLI flag.
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockLicense := new(MockLicenseChecker)
	logger, _ := zap.NewDevelopment()
	mockConfig := &MockConfig{configExists: true, configValue: "Env Brand Title"}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, mockConfig, mockLicense, logger)

	ctx := createAdminContext("admin-user-id")
	mockLicense.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{IsLicensed: false}, nil)

	dbEntry := &registrystore.Registry{Key: "config.app_title", Value: "db-title"}
	mockRegistryStore.On("Get", ctx, "system:global", "config.app_title").Return(dbEntry, nil)

	key := "config.app_title"
	result, err := resolver.Query().GetSystemRegistry(ctx, &key, nil)

	assert.NoError(t, err)
	assert.Len(t, result, 0) // entry omitted entirely — DB value is not exposed either

	mockLicense.AssertExpectations(t)
	mockRegistryStore.AssertExpectations(t)
}

func TestGetSystemRegistry_LicenseRequired_ShowConfigOverrideWhenLicensed(t *testing.T) {
	// When licensed, the config-override value should be visible as usual.
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockLicense := new(MockLicenseChecker)
	logger, _ := zap.NewDevelopment()
	mockConfig := &MockConfig{configExists: true, configValue: "Env Brand Title"}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, mockConfig, mockLicense, logger)

	ctx := createAdminContext("admin-user-id")
	mockLicense.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{IsLicensed: true}, nil)

	dbEntry := &registrystore.Registry{Key: "config.app_title", Value: "db-title"}
	mockRegistryStore.On("Get", ctx, "system:global", "config.app_title").Return(dbEntry, nil)

	key := "config.app_title"
	result, err := resolver.Query().GetSystemRegistry(ctx, &key, nil)

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, "Env Brand Title", result[0].Value) // config/env value shown
	assert.True(t, result[0].IsOverriddenByConfig)      // override visible

	mockLicense.AssertExpectations(t)
	mockRegistryStore.AssertExpectations(t)
}

func TestListSystemRegistry_LicenseRequired_OmittedWhenUnlicensed(t *testing.T) {
	// config.app_title override is suppressed for unlicensed instances;
	// config.app_home_title (non-license-required) is still shown as overridden.
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockLicense := new(MockLicenseChecker)
	logger, _ := zap.NewDevelopment()
	mockConfig := &MockConfigMultiple{
		configs: map[string]MockConfigEntry{
			"config.app_title":      {exists: true, value: "Env Brand Title"},
			"config.app_home_title": {exists: true, value: "Env Home"},
		},
	}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, mockConfig, mockLicense, logger)

	ctx := createAdminContext("admin-user-id")
	mockLicense.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{IsLicensed: false}, nil)

	dbEntries := []*registrystore.Registry{
		{Key: "config.app_title", Value: "db-title"},
		{Key: "config.app_home_title", Value: "db-home"},
	}
	mockRegistryStore.On("List", ctx, "system:global", (*string)(nil)).Return(dbEntries, nil)

	result, err := resolver.Query().ListSystemRegistry(ctx, nil)

	assert.NoError(t, err)
	assert.Len(t, result, 1) // app_title omitted entirely; only app_home_title returned

	titleEntry := findRegistryByKey(result, "config.app_title")
	assert.Nil(t, titleEntry) // omitted — neither DB value nor env override is exposed

	homeEntry := findRegistryByKey(result, "config.app_home_title")
	assert.NotNil(t, homeEntry)
	assert.Equal(t, "Env Home", homeEntry.Value)   // config value visible
	assert.True(t, homeEntry.IsOverriddenByConfig) // not license-gated, shows override

	mockLicense.AssertExpectations(t)
	mockRegistryStore.AssertExpectations(t)
}

func TestGetSystemRegistry_LicenseRequired_EmbeddedMode_Unlicensed(t *testing.T) {
	// In embedded mode, license-required config-only keys must be omitted when unlicensed.
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockLicense := new(MockLicenseChecker)
	logger, _ := zap.NewDevelopment()
	mockConfig := &MockConfigEmbedded{
		configs: map[string]MockConfigEntry{
			"config.app_title":      {exists: true, value: "Env Brand Title"},
			"config.app_home_title": {exists: true, value: "Env Home"},
		},
	}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, mockConfig, mockLicense, logger)

	ctx := createAdminContext("admin-user-id")
	mockLicense.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{IsLicensed: false}, nil)

	// Request both keys at once
	keys := []string{"config.app_title", "config.app_home_title"}
	result, err := resolver.Query().GetSystemRegistry(ctx, nil, keys)

	assert.NoError(t, err)
	// app_title must be absent (suppressed); app_home_title must appear
	titleEntry := findRegistryByKey(result, "config.app_title")
	assert.Nil(t, titleEntry, "license-required key should be omitted in embedded mode when unlicensed")

	homeEntry := findRegistryByKey(result, "config.app_home_title")
	assert.NotNil(t, homeEntry)
	assert.Equal(t, "Env Home", homeEntry.Value)
	assert.True(t, homeEntry.IsOverriddenByConfig)

	mockLicense.AssertExpectations(t)
}

func TestGetSystemRegistry_LicenseRequired_EmbeddedMode_Licensed(t *testing.T) {
	// In embedded mode, license-required keys ARE returned when licensed.
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	mockLicense := new(MockLicenseChecker)
	logger, _ := zap.NewDevelopment()
	mockConfig := &MockConfigEmbedded{
		configs: map[string]MockConfigEntry{
			"config.app_title": {exists: true, value: "Env Brand Title"},
		},
	}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, mockConfig, mockLicense, logger)

	ctx := createAdminContext("admin-user-id")
	mockLicense.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{IsLicensed: true}, nil)

	key := "config.app_title"
	result, err := resolver.Query().GetSystemRegistry(ctx, &key, nil)

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, "Env Brand Title", result[0].Value)
	assert.True(t, result[0].IsOverriddenByConfig)

	mockLicense.AssertExpectations(t)
}
