package resolver

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestMe(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	now := time.Now()
	mockUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "testuser",
		Username:    "testuser",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	mockUserStore.On("GetByID", ctx, "test-user-id").Return(mockUser, nil)

	result, err := resolver.Query().Me(ctx)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "test-user-id", result.ID)
	assert.Equal(t, "testuser", result.DisplayName)
	assert.Equal(t, "testuser", result.Username)
	assert.Equal(t, "user", result.Role)
	assert.True(t, result.IsActive)

	mockUserStore.AssertExpectations(t)
}

func TestUser_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	tests := []struct {
		name        string
		userRole    string
		userScopes  []string
		expectError bool
	}{
		{
			name:        "Admin user can access",
			userRole:    "admin",
			userScopes:  []string{"read", "write", "admin"},
			expectError: false,
		},
		{
			name:        "Regular user cannot access",
			userRole:    "user",
			userScopes:  []string{"read", "write"},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil

			ctx := createUserContext("current-user", tt.userRole, tt.userScopes)

			if !tt.expectError {
				now := time.Now()
				targetUser := &userstore.User{
					ID:          "target-user-id",
					DisplayName: "targetuser",
					Username:    "targetuser",
					Role:        "user",
					IsActive:    true,
					CreatedAt:   now,
					UpdatedAt:   now,
				}
				mockUserStore.On("GetByID", ctx, "target-user-id").Return(targetUser, nil)
			}

			result, err := resolver.Query().User(ctx, "target-user-id")

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), "insufficient permission")
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, "target-user-id", result.ID)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestUpdateProfile_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	now := time.Now()
	currentUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "oldDisplayName",
		Username:    "oldusername",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	updatedUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "newDisplayName",
		Username:    "newusername",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now.Add(time.Minute),
	}

	newDisplayName := "newDisplayName"
	newUsername := "newusername"

	mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
	mockUserStore.On("UpdateDisplayName", ctx, "test-user-id", "newDisplayName").Return(nil)
	mockUserStore.On("UpdateUsername", ctx, "test-user-id", "newusername").Return(nil)
	mockUserStore.On("GetByID", ctx, "test-user-id").Return(updatedUser, nil).Once()

	input := gql.UpdateProfileInput{
		DisplayName: &newDisplayName,
		Username:    &newUsername,
	}

	result, err := resolver.Mutation().UpdateProfile(ctx, input, nil) // nil userID means self-operation

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "newDisplayName", result.DisplayName)
	assert.Equal(t, "newusername", result.Username)

	mockUserStore.AssertExpectations(t)
}

func TestUpdateProfile_AdminOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createAdminContext("admin-user-id")

	now := time.Now()
	targetUser := &userstore.User{
		ID:          "target-user-id",
		DisplayName: "oldDisplayName",
		Username:    "oldusername",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	updatedUser := &userstore.User{
		ID:          "target-user-id",
		DisplayName: "newDisplayName",
		Username:    "newusername",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now.Add(time.Minute),
	}

	targetUserID := "target-user-id"
	newDisplayName := "newDisplayName"
	newUsername := "newusername"

	mockUserStore.On("GetByID", ctx, "target-user-id").Return(targetUser, nil).Once()
	mockUserStore.On("UpdateDisplayName", ctx, "target-user-id", "newDisplayName").Return(nil)
	mockUserStore.On("UpdateUsername", ctx, "target-user-id", "newusername").Return(nil)
	mockUserStore.On("GetByID", ctx, "target-user-id").Return(updatedUser, nil).Once()

	input := gql.UpdateProfileInput{
		DisplayName: &newDisplayName,
		Username:    &newUsername,
	}

	result, err := resolver.Mutation().UpdateProfile(ctx, input, &targetUserID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "newDisplayName", result.DisplayName)
	assert.Equal(t, "newusername", result.Username)

	mockUserStore.AssertExpectations(t)
}

func TestUpdateProfile_NonAdminCannotUpdateOthers(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("regular-user-id")

	targetUserID := "other-user-id"
	newDisplayName := "newDisplayName"

	input := gql.UpdateProfileInput{
		DisplayName: &newDisplayName,
	}

	result, err := resolver.Mutation().UpdateProfile(ctx, input, &targetUserID)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "insufficient permission: admin access required")

	mockUserStore.AssertExpectations(t)
}

func TestUpdateProfile_ValidationErrors(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	now := time.Now()
	currentUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "currentuser",
		Username:    "currentuser",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	tests := []struct {
		name        string
		input       gql.UpdateProfileInput
		setupMocks  func()
		expectError bool
		errorMsg    string
	}{
		{
			name: "Invalid displayName - too long",
			input: gql.UpdateProfileInput{
				DisplayName: stringPtr(strings.Repeat("a", 101)),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil)
			},
			expectError: true,
			errorMsg:    "display name must be at most 100 characters long",
		},
		{
			name: "Invalid username format",
			input: gql.UpdateProfileInput{
				Username: stringPtr("invalid-username!"),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil)
			},
			expectError: true,
			errorMsg:    "username must start with an alphanumeric character and can only contain alphanumeric characters, underscores, and hyphens",
		},
		{
			name: "Username too short",
			input: gql.UpdateProfileInput{
				Username: stringPtr("ab"),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil)
			},
			expectError: true,
			errorMsg:    "username must be at least 3 characters long",
		},
		{
			name: "Empty displayName after trimming - should ignore",
			input: gql.UpdateProfileInput{
				DisplayName: stringPtr("   "),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
			},
			expectError: false, // Empty after trimming should be ignored
		},
		{
			name: "Empty username after trimming - should ignore",
			input: gql.UpdateProfileInput{
				Username: stringPtr("   "),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
			},
			expectError: false, // Empty after trimming should be ignored
		},
		{
			name: "Valid displayName normalization",
			input: gql.UpdateProfileInput{
				DisplayName: stringPtr("  ValidUser  "),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
				mockUserStore.On("UpdateDisplayName", ctx, "test-user-id", "ValidUser").Return(nil)
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(&userstore.User{
					ID:          "test-user-id",
					DisplayName: "ValidUser",
					Username:    "currentuser",
					Role:        "user",
					IsActive:    true,
					CreatedAt:   now,
					UpdatedAt:   now.Add(time.Minute),
				}, nil).Once()
			},
			expectError: false,
		},
		{
			name: "Valid username normalization",
			input: gql.UpdateProfileInput{
				Username: stringPtr("  TESTUSER  "),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
				mockUserStore.On("UpdateUsername", ctx, "test-user-id", "testuser").Return(nil)
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(&userstore.User{
					ID:          "test-user-id",
					DisplayName: "currentuser",
					Username:    "testuser",
					Role:        "user",
					IsActive:    true,
					CreatedAt:   now,
					UpdatedAt:   now.Add(time.Minute),
				}, nil).Once()
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			tt.setupMocks()

			result, err := resolver.Mutation().UpdateProfile(ctx, tt.input, nil)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestChangePassword_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	// Hash current password for testing
	hashedCurrentPassword, err := auth.HashPassword("currentpassword")
	require.NoError(t, err)

	currentUser := &model.User{
		ID:             "test-user-id",
		DisplayName:    "testuser",
		Username:       "testuser",
		HashedPassword: hashedCurrentPassword,
		Role:           "user",
		IsActive:       true,
	}

	mockUserStore.On("GetByIDWithPassword", ctx, "test-user-id").Return(currentUser, nil)
	mockUserStore.On("UpdatePassword", ctx, "test-user-id", mock.AnythingOfType("string")).Return(nil)

	input := gql.ChangePasswordInput{
		CurrentPassword: stringPtr("currentpassword"),
		NewPassword:     "newpassword123",
	}

	result, err := resolver.Mutation().ChangePassword(ctx, input, nil)

	assert.NoError(t, err)
	assert.True(t, result)

	mockUserStore.AssertExpectations(t)
}

func TestChangePassword_AdminOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createAdminContext("admin-user-id")

	targetUser := &model.User{
		ID:             "target-user-id",
		DisplayName:    "targetuser",
		Username:       "targetuser",
		HashedPassword: "old-hashed-password",
		Role:           "user",
		IsActive:       true,
	}

	targetUserID := "target-user-id"

	mockUserStore.On("GetByIDWithPassword", ctx, "target-user-id").Return(targetUser, nil)
	mockUserStore.On("UpdatePassword", ctx, "target-user-id", mock.AnythingOfType("string")).Return(nil)

	input := gql.ChangePasswordInput{
		CurrentPassword: nil, // Admin doesn't need current password
		NewPassword:     "newpassword123",
	}

	result, err := resolver.Mutation().ChangePassword(ctx, input, &targetUserID)

	assert.NoError(t, err)
	assert.True(t, result)

	mockUserStore.AssertExpectations(t)
}

func TestChangePassword_ValidationErrors(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	hashedCurrentPassword, err := auth.HashPassword("currentpassword")
	require.NoError(t, err)

	currentUser := &model.User{
		ID:             "test-user-id",
		DisplayName:    "testuser",
		Username:       "testuser",
		HashedPassword: hashedCurrentPassword,
		Role:           "user",
		IsActive:       true,
	}

	tests := []struct {
		name        string
		input       gql.ChangePasswordInput
		setupMocks  func()
		expectError bool
		errorMsg    string
	}{
		{
			name: "Password too short",
			input: gql.ChangePasswordInput{
				CurrentPassword: stringPtr("currentpassword"),
				NewPassword:     "short", // Less than 8 characters
			},
			setupMocks:  func() {},
			expectError: true,
			errorMsg:    "invalid new password: password must be at least 8 characters long",
		},
		{
			name: "Password too long",
			input: gql.ChangePasswordInput{
				CurrentPassword: stringPtr("currentpassword"),
				NewPassword:     strings.Repeat("a", 73), // 73 chars
			},
			setupMocks:  func() {},
			expectError: true,
			errorMsg:    "invalid new password: password must be at most 72 characters long",
		},
		{
			name: "Wrong current password",
			input: gql.ChangePasswordInput{
				CurrentPassword: stringPtr("wrongpassword"),
				NewPassword:     "newpassword123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByIDWithPassword", ctx, "test-user-id").Return(currentUser, nil)
			},
			expectError: true,
			errorMsg:    "current password is incorrect",
		},
		{
			name: "Missing current password for self operation",
			input: gql.ChangePasswordInput{
				CurrentPassword: nil,
				NewPassword:     "newpassword123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByIDWithPassword", ctx, "test-user-id").Return(currentUser, nil)
			},
			expectError: true,
			errorMsg:    "current password is required",
		},
		{
			name: "Empty current password for self operation",
			input: gql.ChangePasswordInput{
				CurrentPassword: stringPtr(""),
				NewPassword:     "newpassword123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByIDWithPassword", ctx, "test-user-id").Return(currentUser, nil)
			},
			expectError: true,
			errorMsg:    "current password is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			tt.setupMocks()

			result, err := resolver.Mutation().ChangePassword(ctx, tt.input, nil)

			assert.Error(t, err)
			assert.False(t, result)
			if tt.errorMsg != "" {
				assert.Contains(t, err.Error(), tt.errorMsg)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestDeactivateAccount_SelfOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	// For self-operation, we need to mock the GetByID call that checks if user exists
	now := time.Now()
	targetUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "testuser",
		Username:    "testuser",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	mockUserStore.On("GetByID", ctx, "test-user-id").Return(targetUser, nil)
	mockUserStore.On("SetActive", ctx, "test-user-id", false).Return(nil)

	result, err := resolver.Mutation().DeactivateAccount(ctx, nil)

	assert.NoError(t, err)
	assert.True(t, result)

	mockUserStore.AssertExpectations(t)
}

func TestDeactivateAccount_AdminOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createAdminContext("admin-user-id")

	now := time.Now()
	targetUser := &userstore.User{
		ID:          "target-user-id",
		DisplayName: "targetuser",
		Username:    "targetuser",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	targetUserID := "target-user-id"

	mockUserStore.On("GetByID", ctx, "target-user-id").Return(targetUser, nil)
	mockUserStore.On("SetActive", ctx, "target-user-id", false).Return(nil)

	result, err := resolver.Mutation().DeactivateAccount(ctx, &targetUserID)

	assert.NoError(t, err)
	assert.True(t, result)

	mockUserStore.AssertExpectations(t)
}

func TestDeactivateAccount_AdminCannotDeactivateSelfViaAdminOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createAdminContext("admin-user-id")

	adminUserID := "admin-user-id" // Same as current user

	result, err := resolver.Mutation().DeactivateAccount(ctx, &adminUserID)

	assert.Error(t, err)
	assert.False(t, result)
	assert.Contains(t, err.Error(), "use self-deactivation (no userID parameter) to deactivate your own account")

	mockUserStore.AssertExpectations(t)
}

func TestDeactivateAccount_NonAdminCannotDeactivateOthers(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createReadWriteContext("regular-user-id")

	targetUserID := "other-user-id"

	result, err := resolver.Mutation().DeactivateAccount(ctx, &targetUserID)

	assert.Error(t, err)
	assert.False(t, result)
	assert.Contains(t, err.Error(), "insufficient permission: admin access required")

	mockUserStore.AssertExpectations(t)
}

func TestUsers_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	tests := []struct {
		name        string
		userRole    string
		userScopes  []string
		offset      *int
		limit       *int
		expectError bool
	}{
		{
			name:        "Admin user can access with defaults",
			userRole:    "admin",
			userScopes:  []string{"read", "write", "admin"},
			offset:      nil,
			limit:       nil,
			expectError: false,
		},
		{
			name:        "Admin user can access with custom params",
			userRole:    "admin",
			userScopes:  []string{"read", "write", "admin"},
			offset:      intPtr(10),
			limit:       intPtr(5),
			expectError: false,
		},
		{
			name:        "Admin user can access with limit=0 (no limit)",
			userRole:    "admin",
			userScopes:  []string{"read", "write", "admin"},
			offset:      intPtr(0),
			limit:       intPtr(0),
			expectError: false,
		},
		{
			name:        "Regular user cannot access",
			userRole:    "user",
			userScopes:  []string{"read", "write"},
			offset:      nil,
			limit:       nil,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil

			ctx := createUserContext("current-user", tt.userRole, tt.userScopes)

			if !tt.expectError {
				now := time.Now()
				users := []*userstore.User{
					{
						ID:          "user1",
						DisplayName: "user1",
						Username:    "user1",
						Role:        "user",
						IsActive:    true,
						CreatedAt:   now,
						UpdatedAt:   now,
					},
				}

				expectedOffset := 0
				if tt.offset != nil {
					expectedOffset = *tt.offset
				}
				expectedLimit := 0 // Default is now 0
				if tt.limit != nil {
					expectedLimit = *tt.limit
				}

				mockUserStore.On("List", ctx, expectedOffset, expectedLimit).Return(users, 1, nil)
			}

			result, err := resolver.Query().Users(ctx, tt.offset, tt.limit)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), "insufficient permission")
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Len(t, result.Items, 1)
				assert.Equal(t, 1, result.TotalCount)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestUsers_LimitValidation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	ctx := createAdminContext("admin-user-id")

	now := time.Now()
	users := []*userstore.User{
		{
			ID:          "user1",
			DisplayName: "user1",
			Username:    "user1",
			Role:        "user",
			IsActive:    true,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}

	tests := []struct {
		name           string
		offset         *int
		limit          *int
		expectedOffset int
		expectedLimit  int
	}{
		{
			name:           "Negative offset becomes 0",
			offset:         intPtr(-5),
			limit:          intPtr(10),
			expectedOffset: 0,
			expectedLimit:  10,
		},
		{
			name:           "Negative limit becomes 0 (no limit)",
			offset:         intPtr(0),
			limit:          intPtr(-1),
			expectedOffset: 0,
			expectedLimit:  0,
		},
		{
			name:           "Limit over 100 becomes 0 (no limit)",
			offset:         intPtr(0),
			limit:          intPtr(150),
			expectedOffset: 0,
			expectedLimit:  0,
		},
		{
			name:           "Valid limit within range",
			offset:         intPtr(5),
			limit:          intPtr(50),
			expectedOffset: 5,
			expectedLimit:  50,
		},
		{
			name:           "Limit exactly 100 is allowed",
			offset:         intPtr(0),
			limit:          intPtr(100),
			expectedOffset: 0,
			expectedLimit:  100,
		},
		{
			name:           "Limit 0 means no limit",
			offset:         intPtr(0),
			limit:          intPtr(0),
			expectedOffset: 0,
			expectedLimit:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			mockUserStore.On("List", ctx, tt.expectedOffset, tt.expectedLimit).Return(users, 1, nil)

			result, err := resolver.Query().Users(ctx, tt.offset, tt.limit)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Len(t, result.Items, 1)
			assert.Equal(t, 1, result.TotalCount)

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestUserOperations_UserNotFound(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	cfg := &config.Config{}
	mockStorageProvider := NewMockStorageProvider(mockStorage)
	resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, nil, cfg, nil, logger)

	tests := []struct {
		name      string
		operation string
		setupCtx  func() context.Context
		setupMock func(context.Context)
		execute   func(context.Context) (interface{}, error)
	}{
		{
			name:      "Me - user not found",
			operation: "me",
			setupCtx: func() context.Context {
				return createReadWriteContext("non-existent-user")
			},
			setupMock: func(ctx context.Context) {
				mockUserStore.On("GetByID", ctx, "non-existent-user").Return(nil, nil)
			},
			execute: func(ctx context.Context) (interface{}, error) {
				return resolver.Query().Me(ctx)
			},
		},
		{
			name:      "UpdateProfile - user not found",
			operation: "updateProfile",
			setupCtx: func() context.Context {
				return createReadWriteContext("non-existent-user")
			},
			setupMock: func(ctx context.Context) {
				mockUserStore.On("GetByID", ctx, "non-existent-user").Return(nil, nil)
			},
			execute: func(ctx context.Context) (interface{}, error) {
				input := gql.UpdateProfileInput{DisplayName: stringPtr("newname")}
				return resolver.Mutation().UpdateProfile(ctx, input, nil)
			},
		},
		{
			name:      "ChangePassword - user not found",
			operation: "changePassword",
			setupCtx: func() context.Context {
				return createReadWriteContext("non-existent-user")
			},
			setupMock: func(ctx context.Context) {
				mockUserStore.On("GetByIDWithPassword", ctx, "non-existent-user").Return(nil, nil)
			},
			execute: func(ctx context.Context) (interface{}, error) {
				input := gql.ChangePasswordInput{
					CurrentPassword: stringPtr("current"),
					NewPassword:     "newpassword123",
				}
				return resolver.Mutation().ChangePassword(ctx, input, nil)
			},
		},
		{
			name:      "DeactivateAccount - admin operation, target user not found",
			operation: "deactivateAccount",
			setupCtx: func() context.Context {
				return createAdminContext("admin-user")
			},
			setupMock: func(ctx context.Context) {
				mockUserStore.On("GetByID", ctx, "non-existent-user").Return(nil, nil)
			},
			execute: func(ctx context.Context) (interface{}, error) {
				targetID := "non-existent-user"
				return resolver.Mutation().DeactivateAccount(ctx, &targetID)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil

			ctx := tt.setupCtx()
			tt.setupMock(ctx)

			result, err := tt.execute(ctx)

			assert.Error(t, err)
			assert.Contains(t, err.Error(), "not found")

			if result != nil {
				// For boolean returns, should be false
				if boolResult, ok := result.(bool); ok {
					assert.False(t, boolResult)
				} else {
					// For object returns, should be nil
					assert.Nil(t, result)
				}
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}
