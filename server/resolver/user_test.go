package resolver

import (
	"context"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/model"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/userstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type MockUserStore struct {
	mock.Mock
}

func (m *MockUserStore) Create(ctx context.Context, username, email, hashedPassword, role string) (*userstore.User, error) {
	args := m.Called(ctx, username, email, hashedPassword, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) GetByID(ctx context.Context, id string) (*userstore.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) GetByUsernameOrEmail(ctx context.Context, usernameOrEmail string) (*model.User, error) {
	args := m.Called(ctx, usernameOrEmail)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserStore) UpdateLastLogin(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockUserStore) UpdatePassword(ctx context.Context, id string, hashedPassword string) error {
	args := m.Called(ctx, id, hashedPassword)
	return args.Error(0)
}

func (m *MockUserStore) UpdateUsername(ctx context.Context, id string, username string) error {
	args := m.Called(ctx, id, username)
	return args.Error(0)
}

func (m *MockUserStore) UpdateEmail(ctx context.Context, id string, email string) error {
	args := m.Called(ctx, id, email)
	return args.Error(0)
}

func (m *MockUserStore) SetActive(ctx context.Context, id string, active bool) error {
	args := m.Called(ctx, id, active)
	return args.Error(0)
}

func (m *MockUserStore) List(ctx context.Context, offset, limit int) ([]*userstore.User, int, error) {
	args := m.Called(ctx, offset, limit)
	return args.Get(0).([]*userstore.User), args.Get(1).(int), args.Error(2)
}

func TestMe(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-user-id")

	now := time.Now()
	mockUser := &userstore.User{
		ID:        "test-user-id",
		Username:  "testuser",
		Email:     "test@example.com",
		Role:      "user",
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	mockUserStore.On("GetByID", ctx, "test-user-id").Return(mockUser, nil)

	result, err := resolver.Query().Me(ctx)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "test-user-id", result.ID)
	assert.Equal(t, "testuser", result.Username)
	assert.Equal(t, "test@example.com", result.Email)
	assert.Equal(t, "user", result.Role)
	assert.True(t, result.IsActive)

	mockUserStore.AssertExpectations(t)
}

func TestUser_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

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

			// Create context with claims
			claims := &auth.Claims{
				UserID: "current-user",
				Role:   tt.userRole,
				Scopes: tt.userScopes,
			}
			ctx := auth.SetClaimsInContext(context.Background(), claims)

			if !tt.expectError {
				now := time.Now()
				targetUser := &userstore.User{
					ID:        "target-user-id",
					Username:  "targetuser",
					Email:     "target@example.com",
					Role:      "user",
					IsActive:  true,
					CreatedAt: now,
					UpdatedAt: now,
				}
				mockUserStore.On("GetByID", ctx, "target-user-id").Return(targetUser, nil)
			}

			result, err := resolver.Query().User(ctx, "target-user-id")

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, "target-user-id", result.ID)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestUpdateProfile(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-user-id")

	now := time.Now()
	currentUser := &userstore.User{
		ID:        "test-user-id",
		Username:  "oldusername",
		Email:     "old@example.com",
		Role:      "user",
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	updatedUser := &userstore.User{
		ID:        "test-user-id",
		Username:  "newusername",
		Email:     "new@example.com",
		Role:      "user",
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now.Add(time.Minute),
	}

	newUsername := "newusername"
	newEmail := "new@example.com"

	mockUserStore.On("GetByID", ctx, "test-user-id").Return(currentUser, nil).Once()
	mockUserStore.On("UpdateUsername", ctx, "test-user-id", "newusername").Return(nil)
	mockUserStore.On("UpdateEmail", ctx, "test-user-id", "new@example.com").Return(nil)
	mockUserStore.On("GetByID", ctx, "test-user-id").Return(updatedUser, nil).Once()

	input := gql.UpdateProfileInput{
		Username: &newUsername,
		Email:    &newEmail,
	}

	result, err := resolver.Mutation().UpdateProfile(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "newusername", result.Username)
	assert.Equal(t, "new@example.com", result.Email)

	mockUserStore.AssertExpectations(t)
}

func TestChangePassword(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-user-id")

	// Hash current password for testing
	hashedCurrentPassword, err := auth.HashPassword("currentpassword")
	require.NoError(t, err)

	// First, the user returned by GetByID (without password)
	user := &userstore.User{
		ID:        "test-user-id",
		Username:  "testuser",
		Email:     "test@example.com",
		Role:      "user",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Then, the user returned by GetByUsernameOrEmail (with password)
	currentUser := &model.User{
		ID:             "test-user-id",
		Username:       "testuser",
		Email:          "test@example.com",
		HashedPassword: hashedCurrentPassword,
		Role:           "user",
		IsActive:       true,
	}

	// Set up all the expected mock calls in order
	mockUserStore.On("GetByID", ctx, "test-user-id").Return(user, nil)
	mockUserStore.On("GetByUsernameOrEmail", ctx, "testuser").Return(currentUser, nil)
	mockUserStore.On("UpdatePassword", ctx, "test-user-id", mock.AnythingOfType("string")).Return(nil)

	input := gql.ChangePasswordInput{
		CurrentPassword: "currentpassword",
		NewPassword:     "newpassword123",
	}

	result, err := resolver.Mutation().ChangePassword(ctx, input)

	assert.NoError(t, err)
	assert.True(t, result)

	mockUserStore.AssertExpectations(t)
}

func TestUsers_AdminOnly(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	mockUserStore := new(MockUserStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, mockUserStore, logger)

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

			// Create context with claims
			claims := &auth.Claims{
				UserID: "current-user",
				Role:   tt.userRole,
				Scopes: tt.userScopes,
			}
			ctx := auth.SetClaimsInContext(context.Background(), claims)

			if !tt.expectError {
				now := time.Now()
				users := []*userstore.User{
					{
						ID:        "user1",
						Username:  "user1",
						Email:     "user1@example.com",
						Role:      "user",
						IsActive:  true,
						CreatedAt: now,
						UpdatedAt: now,
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

// Helper function for tests
func intPtr(i int) *int {
	return &i
}
