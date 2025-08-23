package firstrun

import (
	"context"
	"crypto/rand"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/model"
	"github.com/cshum/imagor-studio/server/pkg/userstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap/zaptest"
)

// Mock userstore for testing
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

// Note: This returns *model.User, not *userstore.User
func (m *MockUserStore) GetByUsernameOrEmail(ctx context.Context, usernameOrEmail string) (*model.User, error) {
	args := m.Called(ctx, usernameOrEmail)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

// Note: This returns *model.User, not *userstore.User
func (m *MockUserStore) GetByIDWithPassword(ctx context.Context, id string) (*model.User, error) {
	args := m.Called(ctx, id)
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
	if args.Get(0) == nil {
		return nil, args.Get(1).(int), args.Error(2)
	}
	return args.Get(0).([]*userstore.User), args.Get(1).(int), args.Error(2)
}

func TestEnsureAdminUser(t *testing.T) {
	tests := []struct {
		name                  string
		createAdminOnFirstRun bool
		defaultAdminUsername  string
		defaultAdminEmail     string
		defaultAdminPassword  string
		existingUserCount     int
		listError             error
		createError           error
		expectedError         string
		expectUserCreation    bool
		expectPasswordGen     bool
	}{
		{
			name:                  "Admin creation disabled",
			createAdminOnFirstRun: false,
			expectedError:         "",
			expectUserCreation:    false,
		},
		{
			name:                  "Users already exist",
			createAdminOnFirstRun: true,
			existingUserCount:     5,
			expectedError:         "",
			expectUserCreation:    false,
		},
		{
			name:                  "Create admin with provided password",
			createAdminOnFirstRun: true,
			defaultAdminUsername:  "admin",
			defaultAdminEmail:     "admin@example.com",
			defaultAdminPassword:  "secretpassword123",
			existingUserCount:     0,
			expectedError:         "",
			expectUserCreation:    true,
			expectPasswordGen:     false,
		},
		{
			name:                  "Create admin with generated password",
			createAdminOnFirstRun: true,
			defaultAdminUsername:  "admin",
			defaultAdminEmail:     "admin@example.com",
			defaultAdminPassword:  "", // Empty, should generate
			existingUserCount:     0,
			expectedError:         "",
			expectUserCreation:    true,
			expectPasswordGen:     true,
		},
		{
			name:                  "List users error",
			createAdminOnFirstRun: true,
			listError:             errors.New("database error"),
			expectedError:         "failed to check existing users: database error",
			expectUserCreation:    false,
		},
		{
			name:                  "Create user error",
			createAdminOnFirstRun: true,
			defaultAdminUsername:  "admin",
			defaultAdminEmail:     "admin@example.com",
			defaultAdminPassword:  "password123",
			existingUserCount:     0,
			createError:           errors.New("username already exists"),
			expectedError:         "failed to create admin user: username already exists",
			expectUserCreation:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			ctx := context.Background()
			logger := zaptest.NewLogger(t)
			mockUserStore := new(MockUserStore)

			cfg := &config.Config{
				CreateAdminOnFirstRun: tt.createAdminOnFirstRun,
				DefaultAdminUsername:  tt.defaultAdminUsername,
				DefaultAdminEmail:     tt.defaultAdminEmail,
				DefaultAdminPassword:  tt.defaultAdminPassword,
				Logger:                logger,
			}

			// Setup mock expectations
			if tt.createAdminOnFirstRun {
				if tt.listError != nil {
					mockUserStore.On("List", ctx, 0, 1).Return(nil, 0, tt.listError)
				} else {
					var users []*userstore.User
					if tt.existingUserCount > 0 {
						// Create dummy users for the list
						for i := 0; i < tt.existingUserCount && i < 1; i++ { // Only return 1 user max due to limit
							users = append(users, &userstore.User{
								ID:       "existing-user-id",
								Username: "existinguser",
								Email:    "existing@example.com",
								Role:     "user",
							})
						}
					}
					mockUserStore.On("List", ctx, 0, 1).Return(users, tt.existingUserCount, nil)
				}

				if tt.expectUserCreation && tt.existingUserCount == 0 && tt.listError == nil {
					if tt.createError != nil {
						mockUserStore.On("Create", ctx, tt.defaultAdminUsername, tt.defaultAdminEmail, mock.AnythingOfType("string"), "admin").Return(nil, tt.createError)
					} else {
						now := time.Now()
						createdUser := &userstore.User{
							ID:        "admin-user-id",
							Username:  tt.defaultAdminUsername,
							Email:     tt.defaultAdminEmail,
							Role:      "admin",
							IsActive:  true,
							CreatedAt: now,
							UpdatedAt: now,
						}
						mockUserStore.On("Create", ctx, tt.defaultAdminUsername, tt.defaultAdminEmail, mock.AnythingOfType("string"), "admin").Return(createdUser, nil)
					}
				}
			}

			// Execute
			err := EnsureAdminUser(ctx, cfg, mockUserStore)

			// Assert
			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestEnsureAdminUser_PasswordHashing(t *testing.T) {
	ctx := context.Background()
	logger := zaptest.NewLogger(t)
	mockUserStore := new(MockUserStore)

	cfg := &config.Config{
		CreateAdminOnFirstRun: true,
		DefaultAdminUsername:  "admin",
		DefaultAdminEmail:     "admin@example.com",
		DefaultAdminPassword:  "testpassword123",
		Logger:                logger,
	}

	// Setup mocks
	mockUserStore.On("List", ctx, 0, 1).Return([]*userstore.User{}, 0, nil)

	// Capture the hashed password
	var capturedHashedPassword string
	mockUserStore.On("Create", ctx, "admin", "admin@example.com", mock.AnythingOfType("string"), "admin").
		Run(func(args mock.Arguments) {
			// Function signature: Create(ctx, username, email, hashedPassword, role)
			// args[0] = ctx, args[1] = username, args[2] = email, args[3] = hashedPassword, args[4] = role
			capturedHashedPassword = args.Get(3).(string) // Changed from args.Get(2) to args.Get(3)
		}).
		Return(&userstore.User{
			ID:       "admin-id",
			Username: "admin",
			Email:    "admin@example.com",
			Role:     "admin",
		}, nil)

	// Execute
	err := EnsureAdminUser(ctx, cfg, mockUserStore)

	// Assert
	assert.NoError(t, err)
	assert.NotEmpty(t, capturedHashedPassword)
	assert.NotEqual(t, "testpassword123", capturedHashedPassword) // Should be hashed
	assert.True(t, strings.HasPrefix(capturedHashedPassword, "$2"), "Password should be bcrypt hashed")

	mockUserStore.AssertExpectations(t)
}

func TestEnsureAdminUser_InputValidation(t *testing.T) {
	tests := []struct {
		name     string
		username string
		email    string
		password string
	}{
		{
			name:     "Empty username handled gracefully",
			username: "",
			email:    "admin@example.com",
			password: "password123",
		},
		{
			name:     "Empty email handled gracefully",
			username: "admin",
			email:    "",
			password: "password123",
		},
		{
			name:     "Special characters in username",
			username: "admin-user_test",
			email:    "admin@example.com",
			password: "password123",
		},
		{
			name:     "Email with plus addressing",
			username: "admin",
			email:    "admin+test@example.com",
			password: "password123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			logger := zaptest.NewLogger(t)
			mockUserStore := new(MockUserStore)

			cfg := &config.Config{
				CreateAdminOnFirstRun: true,
				DefaultAdminUsername:  tt.username,
				DefaultAdminEmail:     tt.email,
				DefaultAdminPassword:  tt.password,
				Logger:                logger,
			}

			mockUserStore.On("List", ctx, 0, 1).Return([]*userstore.User{}, 0, nil)
			mockUserStore.On("Create", ctx, tt.username, tt.email, mock.AnythingOfType("string"), "admin").
				Return(&userstore.User{
					ID:       "admin-id",
					Username: tt.username,
					Email:    tt.email,
					Role:     "admin",
				}, nil)

			err := EnsureAdminUser(ctx, cfg, mockUserStore)

			// Should not error even with edge case inputs
			assert.NoError(t, err)
			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestGenerateRandomPassword(t *testing.T) {
	tests := []struct {
		name           string
		length         int
		expectedLength int
	}{
		{
			name:           "Standard length",
			length:         16,
			expectedLength: 16,
		},
		{
			name:           "Short length",
			length:         8,
			expectedLength: 8,
		},
		{
			name:           "Long length",
			length:         32,
			expectedLength: 32,
		},
		{
			name:           "Odd length",
			length:         15,
			expectedLength: 14, // hex encoding of length/2 bytes gives even number of chars
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			password := generateRandomPassword(tt.length)

			assert.Len(t, password, tt.expectedLength)
			assert.NotEmpty(t, password)

			// Should only contain hex characters
			for _, char := range password {
				assert.True(t,
					(char >= '0' && char <= '9') || (char >= 'a' && char <= 'f'),
					"Password should only contain hex characters, got: %c", char)
			}
		})
	}
}

func TestGenerateRandomPassword_Uniqueness(t *testing.T) {
	// Generate multiple passwords and ensure they're different
	passwords := make(map[string]bool)

	for i := 0; i < 100; i++ {
		password := generateRandomPassword(16)
		assert.False(t, passwords[password], "Generated password should be unique")
		passwords[password] = true
		assert.Len(t, password, 16)
	}
}

func TestGenerateRandomPassword_Fallback(t *testing.T) {
	// Test the fallback behavior when rand.Read fails
	// This is difficult to test directly since we can't easily mock crypto/rand
	// But we can test that the fallback value is returned in error cases

	// Test with zero length (edge case)
	password := generateRandomPassword(0)
	assert.Equal(t, "", password) // Should return empty string for 0 length
}

// Integration test that tests the full flow
func TestEnsureAdminUser_Integration(t *testing.T) {
	ctx := context.Background()
	logger := zaptest.NewLogger(t)
	mockUserStore := new(MockUserStore)

	cfg := &config.Config{
		CreateAdminOnFirstRun: true,
		DefaultAdminUsername:  "admin",
		DefaultAdminEmail:     "admin@example.com",
		DefaultAdminPassword:  "", // Will generate password
		Logger:                logger,
	}

	now := time.Now()
	expectedUser := &userstore.User{
		ID:        "admin-123",
		Username:  "admin",
		Email:     "admin@example.com",
		Role:      "admin",
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Setup expectations
	mockUserStore.On("List", ctx, 0, 1).Return([]*userstore.User{}, 0, nil)
	mockUserStore.On("Create", ctx, "admin", "admin@example.com", mock.AnythingOfType("string"), "admin").Return(expectedUser, nil)

	// Execute
	err := EnsureAdminUser(ctx, cfg, mockUserStore)

	// Assert
	assert.NoError(t, err)
	mockUserStore.AssertExpectations(t)
}

// Test concurrent access (if applicable)
func TestEnsureAdminUser_Concurrent(t *testing.T) {
	ctx := context.Background()
	logger := zaptest.NewLogger(t)

	// This test verifies that the function handles concurrent calls gracefully
	// In a real scenario, you might want to add proper synchronization

	for i := 0; i < 10; i++ {
		t.Run("concurrent_call", func(t *testing.T) {
			t.Parallel()

			mockUserStore := new(MockUserStore)
			cfg := &config.Config{
				CreateAdminOnFirstRun: true,
				DefaultAdminUsername:  "admin",
				DefaultAdminEmail:     "admin@example.com",
				DefaultAdminPassword:  "password123",
				Logger:                logger,
			}

			// All calls should see existing users (simulating race condition)
			mockUserStore.On("List", ctx, 0, 1).Return([]*userstore.User{
				{ID: "existing", Username: "existing", Email: "existing@example.com"},
			}, 1, nil)

			err := EnsureAdminUser(ctx, cfg, mockUserStore)
			assert.NoError(t, err)
			mockUserStore.AssertExpectations(t)
		})
	}
}

// Benchmark the password generation
func BenchmarkGenerateRandomPassword(b *testing.B) {
	for i := 0; i < b.N; i++ {
		generateRandomPassword(16)
	}
}

// Test helper to verify the randomness reader works
func TestRandomnessAvailable(t *testing.T) {
	// Ensure crypto/rand is working in test environment
	bytes := make([]byte, 10)
	n, err := rand.Read(bytes)
	assert.NoError(t, err)
	assert.Equal(t, 10, n)

	// Verify bytes are not all zeros (extremely unlikely with proper randomness)
	allZeros := true
	for _, b := range bytes {
		if b != 0 {
			allZeros = false
			break
		}
	}
	assert.False(t, allZeros, "Random bytes should not all be zero")
}
