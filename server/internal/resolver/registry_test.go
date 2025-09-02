package resolver

import (
	"context"
	"testing"

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

func (m *MockRegistryStore) SetMulti(ctx context.Context, ownerID string, entries []registrystore.RegistryEntry) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, entries)
	return args.Get(0).([]*registrystore.Registry), args.Error(1)
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

	resultRegistry := &registrystore.Registry{
		Key:   key,
		Value: value,
	}

	expectedEntries := []registrystore.RegistryEntry{{Key: key, Value: value, IsEncrypted: false}}
	mockRegistryStore.On("SetMulti", ctx, "test-user-id", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)

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

	resultRegistry := &registrystore.Registry{
		Key:   key,
		Value: value,
	}

	expectedEntries := []registrystore.RegistryEntry{{Key: key, Value: value, IsEncrypted: false}}
	mockRegistryStore.On("SetMulti", ctx, targetOwnerID, expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)

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

	mockRegistry := &registrystore.Registry{
		Key:   key,
		Value: "dark_mode",
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

	mockRegistry := []*registrystore.Registry{
		{Key: "app:setting1", Value: "value1"},
		{Key: "app:setting2", Value: "value2"},
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

				resultRegistry := &registrystore.Registry{
					Key:   "app_version",
					Value: "1.0.0",
				}
				expectedEntries := []registrystore.RegistryEntry{{Key: "app_version", Value: "1.0.0", IsEncrypted: false}}
				mockRegistryStore.On("SetMulti", ctx, "system", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)
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

			mockRegistry := &registrystore.Registry{
				Key:   "app_version",
				Value: "1.0.0",
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

	mockRegistry := []*registrystore.Registry{
		{Key: "config:setting1", Value: "value1"},
		{Key: "config:setting2", Value: "value2"},
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

	resultRegistry := &registrystore.Registry{
		Key:         key,
		Value:       value,
		IsEncrypted: true,
	}

	expectedEntries := []registrystore.RegistryEntry{{Key: key, Value: value, IsEncrypted: true}}
	mockRegistryStore.On("SetMulti", ctx, "test-user-id", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)

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

	mockRegistry := &registrystore.Registry{
		Key:         key,
		Value:       "super-secret-value",
		IsEncrypted: true,
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

	mockRegistry := []*registrystore.Registry{
		{Key: "normal_setting", Value: "visible_value", IsEncrypted: false},
		{Key: "api_secret", Value: "super-secret-value", IsEncrypted: true},
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

	resultRegistry := &registrystore.Registry{
		Key:         key,
		Value:       value,
		IsEncrypted: true,
	}

	expectedEntries := []registrystore.RegistryEntry{{Key: key, Value: value, IsEncrypted: true}}
	mockRegistryStore.On("SetMulti", ctx, "system", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)

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

			resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, mockConfig, logger)

			ctx := createAdminContext("admin-user-id")

			if !tt.expectError {
				// Only expect registry store call if we're not expecting an error

				resultRegistry := &registrystore.Registry{
					Key:   tt.registryKey,
					Value: "test-value",
				}
				expectedEntries := []registrystore.RegistryEntry{{Key: tt.registryKey, Value: "test-value", IsEncrypted: false}}
				mockRegistryStore.On("SetMulti", ctx, "system", expectedEntries).Return([]*registrystore.Registry{resultRegistry}, nil)
			}

			entries := []*gql.RegistryEntryInput{{Key: tt.registryKey, Value: "test-value"}}
			result, err := resolver.Mutation().SetSystemRegistry(ctx, entries)

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

			resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, mockConfig, logger)

			ctx := createReadWriteContext("user-id")

			mockRegistry := &registrystore.Registry{
				Key:   tt.registryKey,
				Value: tt.registryValue,
			}

			mockRegistryStore.On("Get", ctx, "system", tt.registryKey).Return(mockRegistry, nil)

			result, err := resolver.Query().GetSystemRegistry(ctx, tt.registryKey)

			assert.NoError(t, err, tt.description)
			assert.NotNil(t, result)
			assert.Equal(t, tt.registryKey, result.Key)
			assert.Equal(t, tt.expectedValue, result.Value, "Value mismatch: %s", tt.description)
			assert.Equal(t, tt.expectedIsOverridden, result.IsOverriddenByConfig, "Override detection mismatch: %s", tt.description)
			assert.Equal(t, "system", result.OwnerID)

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

	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, mockConfig, logger)

	ctx := createReadWriteContext("user-id")

	mockRegistries := []*registrystore.Registry{
		{Key: "config.allow_guest_mode", Value: "true"},
		{Key: "config.storage_type", Value: "file"},
		{Key: "app.version", Value: "1.0.0"},
	}

	mockRegistryStore.On("List", ctx, "system", (*string)(nil)).Return(mockRegistries, nil)

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
