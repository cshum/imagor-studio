package resolver

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/auth"
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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	now := time.Now()
	mockUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "testuser",
		Email:       "test@example.com",
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
	assert.Equal(t, "test@example.com", result.Email)
	assert.Equal(t, "user", result.Role)
	assert.True(t, result.IsActive)

	mockUserStore.AssertExpectations(t)
}

func TestUser_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

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
					Email:       "target@example.com",
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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	now := time.Now()
	currentUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "oldDisplayName",
		Email:       "old@example.com",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	updatedUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "newDisplayName",
		Email:       "new@example.com",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now.Add(time.Minute),
	}

	newDisplayName := "newDisplayName"
	newEmail := "new@example.com"

	mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
	mockUserStore.On("UpdateDisplayName", ctx, "test-user-id", "newDisplayName").Return(nil)
	mockUserStore.On("UpdateEmail", ctx, "test-user-id", "new@example.com").Return(nil)
	mockUserStore.On("GetByID", ctx, "test-user-id").Return(updatedUser, nil).Once()

	input := gql.UpdateProfileInput{
		DisplayName: &newDisplayName,
		Email:       &newEmail,
	}

	result, err := resolver.Mutation().UpdateProfile(ctx, input, nil) // nil userID means self-operation

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "newDisplayName", result.DisplayName)
	assert.Equal(t, "new@example.com", result.Email)

	mockUserStore.AssertExpectations(t)
}

func TestUpdateProfile_AdminOperation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	now := time.Now()
	targetUser := &userstore.User{
		ID:          "target-user-id",
		DisplayName: "oldDisplayName",
		Email:       "old@example.com",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	updatedUser := &userstore.User{
		ID:          "target-user-id",
		DisplayName: "newDisplayName",
		Email:       "new@example.com",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now.Add(time.Minute),
	}

	targetUserID := "target-user-id"
	newDisplayName := "newDisplayName"
	newEmail := "new@example.com"

	mockUserStore.On("GetByID", ctx, "target-user-id").Return(targetUser, nil).Once()
	mockUserStore.On("UpdateDisplayName", ctx, "target-user-id", "newDisplayName").Return(nil)
	mockUserStore.On("UpdateEmail", ctx, "target-user-id", "new@example.com").Return(nil)
	mockUserStore.On("GetByID", ctx, "target-user-id").Return(updatedUser, nil).Once()

	input := gql.UpdateProfileInput{
		DisplayName: &newDisplayName,
		Email:       &newEmail,
	}

	result, err := resolver.Mutation().UpdateProfile(ctx, input, &targetUserID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "newDisplayName", result.DisplayName)
	assert.Equal(t, "new@example.com", result.Email)

	mockUserStore.AssertExpectations(t)
}

func TestUpdateProfile_NonAdminCannotUpdateOthers(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	now := time.Now()
	currentUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "currentuser",
		Email:       "current@example.com",
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
			name: "Invalid email format",
			input: gql.UpdateProfileInput{
				Email: stringPtr("invalid-email"),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil)
			},
			expectError: true,
			errorMsg:    "invalid email format",
		},
		{
			name: "Invalid email - no TLD",
			input: gql.UpdateProfileInput{
				Email: stringPtr("test@localhost"),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil)
			},
			expectError: true,
			errorMsg:    "invalid email format",
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
			name: "Empty email after trimming - should ignore",
			input: gql.UpdateProfileInput{
				Email: stringPtr("   "),
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
					Email:       "current@example.com",
					Role:        "user",
					IsActive:    true,
					CreatedAt:   now,
					UpdatedAt:   now.Add(time.Minute),
				}, nil).Once()
			},
			expectError: false,
		},
		{
			name: "Valid email normalization",
			input: gql.UpdateProfileInput{
				Email: stringPtr("  TEST@EXAMPLE.COM  "),
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
				mockUserStore.On("UpdateEmail", ctx, "test-user-id", "test@example.com").Return(nil)
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(&userstore.User{
					ID:          "test-user-id",
					DisplayName: "currentuser",
					Email:       "test@example.com",
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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	// Hash current password for testing
	hashedCurrentPassword, err := auth.HashPassword("currentpassword")
	require.NoError(t, err)

	currentUser := &model.User{
		ID:             "test-user-id",
		DisplayName:    "testuser",
		Email:          "test@example.com",
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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	targetUser := &model.User{
		ID:             "target-user-id",
		DisplayName:    "targetuser",
		Email:          "target@example.com",
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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	hashedCurrentPassword, err := auth.HashPassword("currentpassword")
	require.NoError(t, err)

	currentUser := &model.User{
		ID:             "test-user-id",
		DisplayName:    "testuser",
		Email:          "test@example.com",
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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	// For self-operation, we need to mock the GetByID call that checks if user exists
	now := time.Now()
	targetUser := &userstore.User{
		ID:          "test-user-id",
		DisplayName: "testuser",
		Email:       "test@example.com",
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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	now := time.Now()
	targetUser := &userstore.User{
		ID:          "target-user-id",
		DisplayName: "targetuser",
		Email:       "target@example.com",
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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

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
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

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
						Email:       "user1@example.com",
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
				expectedLimit := 20
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

func TestUserOperations_UserNotFound(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

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

func TestPermissionErrors(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	regularUserCtx := createReadWriteContext("regular-user-id")

	tests := []struct {
		name     string
		execute  func() (interface{}, error)
		errorMsg string
	}{
		{
			name: "Regular user cannot access User query",
			execute: func() (interface{}, error) {
				return resolver.Query().User(regularUserCtx, "other-user-id")
			},
			errorMsg: "insufficient permission",
		},
		{
			name: "Regular user cannot access Users query",
			execute: func() (interface{}, error) {
				return resolver.Query().Users(regularUserCtx, nil, nil)
			},
			errorMsg: "insufficient permission",
		},
		{
			name: "Regular user cannot update other user's profile",
			execute: func() (interface{}, error) {
				input := gql.UpdateProfileInput{DisplayName: stringPtr("newname")}
				otherUserID := "other-user-id"
				return resolver.Mutation().UpdateProfile(regularUserCtx, input, &otherUserID)
			},
			errorMsg: "insufficient permission",
		},
		{
			name: "Regular user cannot change other user's password",
			execute: func() (interface{}, error) {
				input := gql.ChangePasswordInput{NewPassword: "newpass123"}
				otherUserID := "other-user-id"
				return resolver.Mutation().ChangePassword(regularUserCtx, input, &otherUserID)
			},
			errorMsg: "insufficient permission",
		},
		{
			name: "Regular user cannot deactivate other user's account",
			execute: func() (interface{}, error) {
				otherUserID := "other-user-id"
				return resolver.Mutation().DeactivateAccount(regularUserCtx, &otherUserID)
			},
			errorMsg: "insufficient permission",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := tt.execute()

			assert.Error(t, err)
			assert.Contains(t, err.Error(), tt.errorMsg)

			if result != nil {
				// For boolean returns, should be false
				if boolResult, ok := result.(bool); ok {
					assert.False(t, boolResult)
				} else {
					// For object returns, should be nil
					assert.Nil(t, result)
				}
			}
		})
	}
}

func TestDatabaseErrors(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createReadWriteContext("test-user-id")

	tests := []struct {
		name      string
		setupMock func()
		execute   func() (interface{}, error)
		errorMsg  string
	}{
		{
			name: "UpdateProfile - database error on GetByID",
			setupMock: func() {
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(nil, assert.AnError)
			},
			execute: func() (interface{}, error) {
				input := gql.UpdateProfileInput{DisplayName: stringPtr("newname")}
				return resolver.Mutation().UpdateProfile(ctx, input, nil)
			},
			errorMsg: "failed to get user",
		},
		{
			name: "UpdateProfile - database error on UpdateDisplayName",
			setupMock: func() {
				now := time.Now()
				user := &userstore.User{
					ID: "test-user-id", DisplayName: "current", Email: "test@example.com",
					Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now,
				}
				mockUserStore.On("GetByID", ctx, "test-user-id").Return(user, nil).Once()
				mockUserStore.On("UpdateDisplayName", ctx, "test-user-id", "newname").Return(assert.AnError)
			},
			execute: func() (interface{}, error) {
				input := gql.UpdateProfileInput{DisplayName: stringPtr("newname")}
				return resolver.Mutation().UpdateProfile(ctx, input, nil)
			},
			errorMsg: "failed to update display name",
		},
		{
			name: "ChangePassword - database error on GetByIDWithPassword",
			setupMock: func() {
				mockUserStore.On("GetByIDWithPassword", ctx, "test-user-id").Return(nil, assert.AnError)
			},
			execute: func() (interface{}, error) {
				input := gql.ChangePasswordInput{
					CurrentPassword: stringPtr("current"),
					NewPassword:     "newpass123",
				}
				return resolver.Mutation().ChangePassword(ctx, input, nil)
			},
			errorMsg: "failed to get user",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			tt.setupMock()

			result, err := tt.execute()

			assert.Error(t, err)
			assert.Contains(t, err.Error(), tt.errorMsg)

			if result != nil {
				if boolResult, ok := result.(bool); ok {
					assert.False(t, boolResult)
				} else {
					assert.Nil(t, result)
				}
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestCreateUser_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	tests := []struct {
		name        string
		userRole    string
		userScopes  []string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "Admin can create user",
			userRole:    "admin",
			userScopes:  []string{"read", "write", "admin"},
			expectError: false,
		},
		{
			name:        "Regular user cannot create user",
			userRole:    "user",
			userScopes:  []string{"read", "write"},
			expectError: true,
			errorMsg:    "insufficient permission: admin access required",
		},
		{
			name:        "User with admin role but no admin scope cannot create user",
			userRole:    "admin",
			userScopes:  []string{"read", "write"}, // Missing "admin" scope
			expectError: true,
			errorMsg:    "insufficient permission: admin access required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil

			ctx := createUserContext("current-user", tt.userRole, tt.userScopes)

			if !tt.expectError {
				now := time.Now()
				createdUser := &userstore.User{
					ID:          "new-user-id",
					DisplayName: "newuser",
					Email:       "new@example.com",
					Role:        "user",
					IsActive:    true,
					CreatedAt:   now,
					UpdatedAt:   now,
				}
				mockUserStore.On("Create", ctx, "newuser", "new@example.com", mock.AnythingOfType("string"), "user").Return(createdUser, nil)
			}

			input := gql.CreateUserInput{
				DisplayName: "newuser",
				Email:       "new@example.com",
				Password:    "password123",
				Role:        "user",
			}

			result, err := resolver.Mutation().CreateUser(ctx, input)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, "new-user-id", result.ID)
				assert.Equal(t, "newuser", result.DisplayName)
				assert.Equal(t, "new@example.com", result.Email)
				assert.Equal(t, "user", result.Role)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestCreateUser_ValidationErrors(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	tests := []struct {
		name        string
		input       gql.CreateUserInput
		expectError bool
		errorMsg    string
	}{
		{
			name: "Valid user creation with default role",
			input: gql.CreateUserInput{
				DisplayName: "validuser",
				Email:       "valid@example.com",
				Password:    "validpassword123",
				Role:        "user",
			},
			expectError: false,
		},
		{
			name: "Valid admin user creation",
			input: gql.CreateUserInput{
				DisplayName: "adminuser",
				Email:       "admin@example.com",
				Password:    "adminpassword123",
				Role:        "admin",
			},
			expectError: false,
		},
		{
			name: "Invalid displayName - too long",
			input: gql.CreateUserInput{
				DisplayName: strings.Repeat("a", 101),
				Email:       "test@example.com",
				Password:    "password123",
				Role:        "user",
			},
			expectError: true,
			errorMsg:    "display name must be at most 100 characters long",
		},
		{
			name: "Invalid email format",
			input: gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "invalid-email",
				Password:    "password123",
				Role:        "user",
			},
			expectError: true,
			errorMsg:    "invalid email format",
		},
		{
			name: "Invalid email - no TLD",
			input: gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "test@localhost",
				Password:    "password123",
				Role:        "user",
			},
			expectError: true,
			errorMsg:    "invalid email format",
		},
		{
			name: "Invalid password - too short",
			input: gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "short",
				Role:        "user",
			},
			expectError: true,
			errorMsg:    "invalid password: password must be at least 8 characters long",
		},
		{
			name: "Invalid password - too long",
			input: gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    strings.Repeat("a", 73),
				Role:        "user",
			},
			expectError: true,
			errorMsg:    "invalid password: password must be at most 72 characters long",
		},
		{
			name: "Invalid role",
			input: gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "password123",
				Role:        "invalidrole",
			},
			expectError: true,
			errorMsg:    "invalid role: invalidrole (valid roles: user, admin)",
		},
		{
			name: "Empty role",
			input: gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "password123",
				Role:        "",
			},
			expectError: true,
			errorMsg:    "role cannot be empty",
		},
		{
			name: "Empty displayName",
			input: gql.CreateUserInput{
				DisplayName: "",
				Email:       "test@example.com",
				Password:    "password123",
				Role:        "user",
			},
			expectError: true,
			errorMsg:    "display name is required",
		},
		{
			name: "Empty email",
			input: gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "",
				Password:    "password123",
				Role:        "user",
			},
			expectError: true,
			errorMsg:    "invalid email format",
		},
		{
			name: "Empty password",
			input: gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "",
				Role:        "user",
			},
			expectError: true,
			errorMsg:    "invalid password: password must be at least 8 characters long",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil

			if !tt.expectError {
				now := time.Now()
				createdUser := &userstore.User{
					ID:          "new-user-id",
					DisplayName: tt.input.DisplayName,
					Email:       strings.ToLower(tt.input.Email), // Should be normalized
					Role:        tt.input.Role,
					IsActive:    true,
					CreatedAt:   now,
					UpdatedAt:   now,
				}
				mockUserStore.On("Create", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("string"), tt.input.Role).Return(createdUser, nil)
			}

			result, err := resolver.Mutation().CreateUser(ctx, tt.input)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, "new-user-id", result.ID)
				assert.True(t, result.IsActive)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestCreateUser_InputNormalization(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	tests := []struct {
		name     string
		input    gql.CreateUserInput
		expected struct {
			displayName string
			email       string
			role        string
		}
	}{
		{
			name: "DisplayName and email normalization",
			input: gql.CreateUserInput{
				DisplayName: "  TestUser  ",
				Email:       "  TEST@EXAMPLE.COM  ",
				Password:    "password123",
				Role:        "  user  ",
			},
			expected: struct {
				displayName string
				email       string
				role        string
			}{
				displayName: "TestUser",
				email:       "test@example.com",
				role:        "user",
			},
		},
		{
			name: "Email with display name normalization",
			input: gql.CreateUserInput{
				DisplayName: "displayuser",
				Email:       "John Doe <john@example.com>",
				Password:    "password123",
				Role:        "admin",
			},
			expected: struct {
				displayName string
				email       string
				role        string
			}{
				displayName: "displayuser",
				email:       "john@example.com",
				role:        "admin",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil

			now := time.Now()
			createdUser := &userstore.User{
				ID:          "new-user-id",
				DisplayName: tt.expected.displayName,
				Email:       tt.expected.email,
				Role:        tt.expected.role,
				IsActive:    true,
				CreatedAt:   now,
				UpdatedAt:   now,
			}

			mockUserStore.On("Create", ctx, tt.expected.displayName, tt.expected.email, mock.AnythingOfType("string"), tt.expected.role).Return(createdUser, nil)

			result, err := resolver.Mutation().CreateUser(ctx, tt.input)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expected.displayName, result.DisplayName)
			assert.Equal(t, tt.expected.email, result.Email)
			assert.Equal(t, tt.expected.role, result.Role)

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestCreateUser_DatabaseErrors(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	tests := []struct {
		name        string
		setupMock   func()
		expectError bool
		errorMsg    string
	}{
		{
			name: "Email already exists",
			setupMock: func() {
				mockUserStore.On("Create", ctx, "newuser", "existing@example.com", mock.AnythingOfType("string"), "user").Return(nil, fmt.Errorf("email already exists"))
			},
			expectError: true,
			errorMsg:    "user creation failed: email already exists",
		},
		{
			name: "Database error",
			setupMock: func() {
				mockUserStore.On("Create", ctx, "testuser", "test@example.com", mock.AnythingOfType("string"), "user").Return(nil, assert.AnError)
			},
			expectError: true,
			errorMsg:    "failed to create user",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			tt.setupMock()

			input := gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "password123",
				Role:        "user",
			}

			// Override specific fields for test cases
			if tt.name == "DisplayName already exists" {
				input.DisplayName = "existinguser"
				input.Email = "new@example.com"
			} else if tt.name == "Email already exists" {
				input.DisplayName = "newuser"
				input.Email = "existing@example.com"
			}

			result, err := resolver.Mutation().CreateUser(ctx, input)

			assert.Error(t, err)
			assert.Nil(t, result)
			assert.Contains(t, err.Error(), tt.errorMsg)

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestCreateUser_RoleValidation(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	tests := []struct {
		name        string
		role        string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "Valid user role",
			role:        "user",
			expectError: false,
		},
		{
			name:        "Valid admin role",
			role:        "admin",
			expectError: false,
		},
		{
			name:        "Invalid role - manager",
			role:        "manager",
			expectError: true,
			errorMsg:    "invalid role: manager (valid roles: user, admin)",
		},
		{
			name:        "Invalid role - guest",
			role:        "guest",
			expectError: true,
			errorMsg:    "invalid role: guest (valid roles: user, admin)",
		},
		{
			name:        "Invalid role - empty",
			role:        "",
			expectError: true,
			errorMsg:    "role cannot be empty",
		},
		{
			name:        "Invalid role - whitespace only",
			role:        "   ",
			expectError: true,
			errorMsg:    "role cannot be empty",
		},
		{
			name:        "Role normalization - with spaces",
			role:        "  admin  ",
			expectError: false, // Should be normalized to "admin"
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil

			if !tt.expectError {
				now := time.Now()
				expectedRole := strings.TrimSpace(tt.role)
				if expectedRole == "" {
					expectedRole = "user" // Default role
				}

				createdUser := &userstore.User{
					ID:          "new-user-id",
					DisplayName: "testuser",
					Email:       "test@example.com",
					Role:        expectedRole,
					IsActive:    true,
					CreatedAt:   now,
					UpdatedAt:   now,
				}
				mockUserStore.On("Create", ctx, "testuser", "test@example.com", mock.AnythingOfType("string"), expectedRole).Return(createdUser, nil)
			}

			input := gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "password123",
				Role:        tt.role,
			}

			result, err := resolver.Mutation().CreateUser(ctx, input)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				expectedRole := strings.TrimSpace(tt.role)
				if expectedRole == "" {
					expectedRole = "user"
				}
				assert.Equal(t, expectedRole, result.Role)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestCreateUser_PasswordHashing(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	now := time.Now()
	createdUser := &userstore.User{
		ID:          "new-user-id",
		DisplayName: "testuser",
		Email:       "test@example.com",
		Role:        "user",
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Mock expects that the hashed password is different from the plain password
	mockUserStore.On("Create", ctx, "testuser", "test@example.com", mock.MatchedBy(func(hashedPassword string) bool {
		// Verify that the password was actually hashed (should be different and start with bcrypt prefix)
		return hashedPassword != "plainpassword123" && strings.HasPrefix(hashedPassword, "$2")
	}), "user").Return(createdUser, nil)

	input := gql.CreateUserInput{
		DisplayName: "testuser",
		Email:       "test@example.com",
		Password:    "plainpassword123",
		Role:        "user",
	}

	result, err := resolver.Mutation().CreateUser(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "new-user-id", result.ID)

	mockUserStore.AssertExpectations(t)
}

func TestCreateUser_EdgeCases(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	tests := []struct {
		name        string
		input       gql.CreateUserInput
		expectError bool
		setupMock   func()
	}{
		{
			name: "Unicode displayName",
			input: gql.CreateUserInput{
				DisplayName: "пользователь",
				Email:       "unicode@example.com",
				Password:    "password123",
				Role:        "user",
			},
			expectError: false,
			setupMock: func() {
				now := time.Now()
				createdUser := &userstore.User{
					ID: "new-user-id", DisplayName: "пользователь", Email: "unicode@example.com",
					Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now,
				}
				mockUserStore.On("Create", ctx, "пользователь", "unicode@example.com", mock.AnythingOfType("string"), "user").Return(createdUser, nil)
			},
		},
		{
			name: "Special characters in displayName",
			input: gql.CreateUserInput{
				DisplayName: "user-with_special.chars",
				Email:       "special@example.com",
				Password:    "password123",
				Role:        "user",
			},
			expectError: false,
			setupMock: func() {
				now := time.Now()
				createdUser := &userstore.User{
					ID: "new-user-id", DisplayName: "user-with_special.chars", Email: "special@example.com",
					Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now,
				}
				mockUserStore.On("Create", ctx, "user-with_special.chars", "special@example.com", mock.AnythingOfType("string"), "user").Return(createdUser, nil)
			},
		},
		{
			name: "Email with plus addressing",
			input: gql.CreateUserInput{
				DisplayName: "plususer",
				Email:       "user+tag@example.com",
				Password:    "password123",
				Role:        "user",
			},
			expectError: false,
			setupMock: func() {
				now := time.Now()
				createdUser := &userstore.User{
					ID: "new-user-id", DisplayName: "plususer", Email: "user+tag@example.com",
					Role: "user", IsActive: true, CreatedAt: now, UpdatedAt: now,
				}
				mockUserStore.On("Create", ctx, "plususer", "user+tag@example.com", mock.AnythingOfType("string"), "user").Return(createdUser, nil)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			if tt.setupMock != nil {
				tt.setupMock()
			}

			result, err := resolver.Mutation().CreateUser(ctx, tt.input)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.input.DisplayName, result.DisplayName)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

// Test admin creating users with different roles
func TestCreateUser_RoleAssignment(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	ctx := createAdminContext("admin-user-id")

	tests := []struct {
		name         string
		inputRole    string
		expectedRole string
	}{
		{
			name:         "Create regular user",
			inputRole:    "user",
			expectedRole: "user",
		},
		{
			name:         "Create admin user",
			inputRole:    "admin",
			expectedRole: "admin",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil

			now := time.Now()
			createdUser := &userstore.User{
				ID:          "new-user-id",
				DisplayName: "newuser",
				Email:       "new@example.com",
				Role:        tt.expectedRole,
				IsActive:    true,
				CreatedAt:   now,
				UpdatedAt:   now,
			}

			mockUserStore.On("Create", ctx, "newuser", "new@example.com", mock.AnythingOfType("string"), tt.expectedRole).Return(createdUser, nil)

			input := gql.CreateUserInput{
				DisplayName: "newuser",
				Email:       "new@example.com",
				Password:    "password123",
				Role:        tt.inputRole,
			}

			result, err := resolver.Mutation().CreateUser(ctx, input)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.Equal(t, tt.expectedRole, result.Role)

			mockUserStore.AssertExpectations(t)
		})
	}
}

// Test that admin cannot create users without proper context
func TestCreateUser_ContextErrors(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	tests := []struct {
		name        string
		context     context.Context
		expectError bool
		errorMsg    string
	}{
		{
			name:        "No claims in context",
			context:     context.Background(),
			expectError: true,
			errorMsg:    "unauthorized",
		},
		{
			name:        "No owner ID in context",
			context:     auth.SetClaimsInContext(context.Background(), &auth.Claims{UserID: "test", Scopes: []string{"admin"}}),
			expectError: true,
			errorMsg:    "failed to get current user ID",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := gql.CreateUserInput{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "password123",
				Role:        "user",
			}

			result, err := resolver.Mutation().CreateUser(tt.context, input)

			assert.Error(t, err)
			assert.Nil(t, result)
			assert.Contains(t, err.Error(), tt.errorMsg)
		})
	}
}

func TestMe_GuestUser(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	// Create guest context
	guestID := "guest-12345"
	claims := &auth.Claims{
		UserID: guestID,
		Role:   "guest",
		Scopes: []string{"read"},
	}
	ctx := auth.SetClaimsInContext(context.Background(), claims)
	ctx = context.WithValue(ctx, UserIDContextKey, guestID)

	// Guest users should NOT trigger database lookup
	// mockUserStore should not be called

	result, err := resolver.Query().Me(ctx)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, guestID, result.ID)
	assert.Equal(t, "guest", result.DisplayName)
	assert.Equal(t, "guest@temporary.local", result.Email)
	assert.Equal(t, "guest", result.Role)
	assert.True(t, result.IsActive)
	assert.NotEmpty(t, result.CreatedAt)
	assert.NotEmpty(t, result.UpdatedAt)

	// Verify no database calls were made
	mockUserStore.AssertExpectations(t)
}

func TestGuestUserRestrictions(t *testing.T) {
	mockStorage := new(MockStorage)
	mockRegistryStore := new(MockRegistryStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockRegistryStore, mockUserStore, nil, logger)

	// Create guest context
	guestID := "guest-12345"
	claims := &auth.Claims{
		UserID: guestID,
		Role:   "guest",
		Scopes: []string{"read"},
	}
	ctx := auth.SetClaimsInContext(context.Background(), claims)
	ctx = context.WithValue(ctx, UserIDContextKey, guestID)

	t.Run("UpdateProfile_GuestBlocked", func(t *testing.T) {
		input := gql.UpdateProfileInput{
			DisplayName: stringPtr("newname"),
		}

		result, err := resolver.Mutation().UpdateProfile(ctx, input, nil)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "cannot update a guest user")
		mockUserStore.AssertExpectations(t)
	})

	t.Run("ChangePassword_GuestBlocked", func(t *testing.T) {
		input := gql.ChangePasswordInput{
			CurrentPassword: stringPtr("current"),
			NewPassword:     "newpassword123",
		}

		result, err := resolver.Mutation().ChangePassword(ctx, input, nil)

		assert.Error(t, err)
		assert.False(t, result)
		assert.Contains(t, err.Error(), "cannot update a guest user")
		mockUserStore.AssertExpectations(t)
	})

	t.Run("DeactivateAccount_GuestBlocked", func(t *testing.T) {
		result, err := resolver.Mutation().DeactivateAccount(ctx, nil)

		assert.Error(t, err)
		assert.False(t, result)
		assert.Contains(t, err.Error(), "cannot update a guest user")
		mockUserStore.AssertExpectations(t)
	})

	t.Run("CreateUser_GuestBlocked", func(t *testing.T) {
		input := gql.CreateUserInput{
			DisplayName: "newuser",
			Email:       "new@example.com",
			Password:    "password123",
			Role:        "user",
		}

		result, err := resolver.Mutation().CreateUser(ctx, input)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "insufficient permission: admin access required")
		mockUserStore.AssertExpectations(t)
	})

	t.Run("User_GuestBlocked", func(t *testing.T) {
		result, err := resolver.Query().User(ctx, "some-user-id")

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "insufficient permission: admin access required")
		mockUserStore.AssertExpectations(t)
	})

	t.Run("Users_GuestBlocked", func(t *testing.T) {
		result, err := resolver.Query().Users(ctx, nil, nil)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "insufficient permission: admin access required")
		mockUserStore.AssertExpectations(t)
	})
}
