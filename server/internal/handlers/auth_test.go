package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/model"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/errors"
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
	if args.Get(0) == nil {
		return nil, args.Get(1).(int), args.Error(2)
	}
	return args.Get(0).([]*userstore.User), args.Get(1).(int), args.Error(2)
}

func (m *MockUserStore) GetByIDWithPassword(ctx context.Context, id string) (*model.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func TestRegister(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, logger)

	tests := []struct {
		name           string
		method         string
		body           interface{}
		setupMocks     func()
		expectedStatus int
		expectError    bool
		errorCode      errors.ErrorCode
	}{
		{
			name:   "Valid registration",
			method: http.MethodPost,
			body: RegisterRequest{
				Username: "testuser",
				Email:    "test@example.com",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "testuser", "test@example.com", mock.AnythingOfType("string"), "user").Return(&userstore.User{
					ID:       "user-123",
					Username: "testuser",
					Email:    "test@example.com",
					Role:     "user",
					IsActive: true,
				}, nil)
			},
			expectedStatus: http.StatusCreated,
			expectError:    false,
		},
		{
			name:   "Username already exists",
			method: http.MethodPost,
			body: RegisterRequest{
				Username: "existinguser",
				Email:    "new@example.com",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "existinguser", "new@example.com", mock.AnythingOfType("string"), "user").Return(nil, fmt.Errorf("username already exists"))
			},
			expectedStatus: http.StatusConflict,
			expectError:    true,
			errorCode:      errors.ErrAlreadyExists,
		},
		{
			name:   "Email already exists",
			method: http.MethodPost,
			body: RegisterRequest{
				Username: "newuser",
				Email:    "existing@example.com",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "newuser", "existing@example.com", mock.AnythingOfType("string"), "user").Return(nil, fmt.Errorf("email already exists"))
			},
			expectedStatus: http.StatusConflict,
			expectError:    true,
			errorCode:      errors.ErrAlreadyExists,
		},
		{
			name:   "Invalid password too short",
			method: http.MethodPost,
			body: RegisterRequest{
				Username: "testuser",
				Email:    "test@example.com",
				Password: "short",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:   "Missing username",
			method: http.MethodPost,
			body: RegisterRequest{
				Username: "",
				Email:    "test@example.com",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:   "Missing email",
			method: http.MethodPost,
			body: RegisterRequest{
				Username: "testuser",
				Email:    "",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:   "Invalid email format",
			method: http.MethodPost,
			body: RegisterRequest{
				Username: "testuser",
				Email:    "invalid-email",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			setupMocks:     func() {},
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			tt.setupMocks()

			var body []byte
			if tt.body != nil {
				switch v := tt.body.(type) {
				case string:
					body = []byte(v)
				default:
					var err error
					body, err = json.Marshal(tt.body)
					require.NoError(t, err)
				}
			}

			req := httptest.NewRequest(tt.method, "/auth/register", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.Register(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp errors.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Error.Code)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Greater(t, loginResp.ExpiresIn, int64(0))
				assert.Equal(t, "testuser", loginResp.User.Username)
				assert.Equal(t, "test@example.com", loginResp.User.Email)
				assert.Equal(t, "user", loginResp.User.Role)

				// Verify the token is valid
				claims, err := tokenManager.ValidateToken(loginResp.Token)
				require.NoError(t, err)
				assert.Equal(t, "user-123", claims.UserID)
				assert.Equal(t, "user", claims.Role)
				assert.Contains(t, claims.Scopes, "read")
				assert.Contains(t, claims.Scopes, "write")
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestLogin(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, logger)

	// Create a valid hashed password for testing
	hashedPassword, err := auth.HashPassword("password123")
	require.NoError(t, err)

	tests := []struct {
		name           string
		method         string
		body           interface{}
		setupMocks     func()
		expectedStatus int
		expectError    bool
		errorCode      errors.ErrorCode
	}{
		{
			name:   "Valid login with username",
			method: http.MethodPost,
			body: LoginRequest{
				Username: "testuser",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByUsernameOrEmail", mock.Anything, "testuser").Return(&model.User{
					ID:             "user-123",
					Username:       "testuser",
					Email:          "test@example.com",
					HashedPassword: hashedPassword,
					Role:           "user",
					IsActive:       true,
				}, nil)
				mockUserStore.On("UpdateLastLogin", mock.Anything, "user-123").Return(nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:   "Valid login with email",
			method: http.MethodPost,
			body: LoginRequest{
				Username: "test@example.com",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByUsernameOrEmail", mock.Anything, "test@example.com").Return(&model.User{
					ID:             "user-123",
					Username:       "testuser",
					Email:          "test@example.com",
					HashedPassword: hashedPassword,
					Role:           "user",
					IsActive:       true,
				}, nil)
				mockUserStore.On("UpdateLastLogin", mock.Anything, "user-123").Return(nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:   "Valid login with admin role",
			method: http.MethodPost,
			body: LoginRequest{
				Username: "admin",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByUsernameOrEmail", mock.Anything, "admin").Return(&model.User{
					ID:             "admin-123",
					Username:       "admin",
					Email:          "admin@example.com",
					HashedPassword: hashedPassword,
					Role:           "admin",
					IsActive:       true,
				}, nil)
				mockUserStore.On("UpdateLastLogin", mock.Anything, "admin-123").Return(nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:   "Invalid password",
			method: http.MethodPost,
			body: LoginRequest{
				Username: "testuser",
				Password: "wrongpassword",
			},
			setupMocks: func() {
				mockUserStore.On("GetByUsernameOrEmail", mock.Anything, "testuser").Return(&model.User{
					ID:             "user-123",
					Username:       "testuser",
					Email:          "test@example.com",
					HashedPassword: hashedPassword,
					Role:           "user",
					IsActive:       true,
				}, nil)
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      errors.ErrInvalidCredentials,
		},
		{
			name:   "User not found",
			method: http.MethodPost,
			body: LoginRequest{
				Username: "nonexistent",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByUsernameOrEmail", mock.Anything, "nonexistent").Return(nil, nil)
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      errors.ErrInvalidCredentials,
		},
		{
			name:   "Empty username",
			method: http.MethodPost,
			body: LoginRequest{
				Username: "",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:   "Empty password",
			method: http.MethodPost,
			body: LoginRequest{
				Username: "testuser",
				Password: "",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			setupMocks:     func() {},
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			tt.setupMocks()

			var body []byte
			if tt.body != nil {
				switch v := tt.body.(type) {
				case string:
					body = []byte(v)
				default:
					var err error
					body, err = json.Marshal(tt.body)
					require.NoError(t, err)
				}
			}

			req := httptest.NewRequest(tt.method, "/auth/login", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.Login(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp errors.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Error.Code)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Greater(t, loginResp.ExpiresIn, int64(0))

				// Verify the token is valid
				claims, err := tokenManager.ValidateToken(loginResp.Token)
				require.NoError(t, err)
				assert.Contains(t, claims.Scopes, "read")
				assert.Contains(t, claims.Scopes, "write")

				// Check admin scope for admin role
				if loginResp.User.Role == "admin" {
					assert.Contains(t, claims.Scopes, "admin")
				}
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestRefreshToken(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, logger)

	// Generate a valid token first
	validToken, err := tokenManager.GenerateToken("user1", "user", []string{"read"})
	require.NoError(t, err)

	tests := []struct {
		name           string
		method         string
		body           interface{}
		setupMocks     func()
		expectedStatus int
		expectError    bool
		errorCode      errors.ErrorCode
	}{
		{
			name:   "Valid refresh request",
			method: http.MethodPost,
			body: RefreshTokenRequest{
				Token: validToken,
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", mock.Anything, "user1").Return(&userstore.User{
					ID:       "user1",
					Username: "testuser",
					Email:    "test@example.com",
					Role:     "user",
					IsActive: true,
				}, nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:   "User not found",
			method: http.MethodPost,
			body: RefreshTokenRequest{
				Token: validToken,
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", mock.Anything, "user1").Return(nil, nil)
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      errors.ErrInvalidToken,
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			setupMocks:     func() {},
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:   "Invalid token",
			method: http.MethodPost,
			body: RefreshTokenRequest{
				Token: "invalid.token.here",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      errors.ErrInvalidToken,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			tt.setupMocks()

			var body []byte
			if tt.body != nil {
				switch v := tt.body.(type) {
				case string:
					body = []byte(v)
				default:
					var err error
					body, err = json.Marshal(tt.body)
					require.NoError(t, err)
				}
			}

			req := httptest.NewRequest(tt.method, "/auth/refresh", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.RefreshToken(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp errors.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Error.Code)
			} else {
				var refreshResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &refreshResp)
				require.NoError(t, err)
				assert.NotEmpty(t, refreshResp.Token)
				assert.Greater(t, refreshResp.ExpiresIn, int64(0))
				assert.NotEqual(t, validToken, refreshResp.Token) // Should be a new token

				// Verify the new token is valid
				claims, err := tokenManager.ValidateToken(refreshResp.Token)
				require.NoError(t, err)
				assert.Equal(t, "user1", claims.UserID)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestRegister_ValidationEdgeCases(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, logger)

	tests := []struct {
		name           string
		body           RegisterRequest
		setupMocks     func()
		expectedStatus int
		errorCode      errors.ErrorCode
		errorMessage   string
	}{
		{
			name: "Username too short",
			body: RegisterRequest{
				Username: "ab",
				Email:    "test@example.com",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "username must be at least 3 characters long",
		},
		{
			name: "Username too long",
			body: RegisterRequest{
				Username: strings.Repeat("a", 51),
				Email:    "test@example.com",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "username must be at most 50 characters long",
		},
		{
			name: "Username with invalid characters",
			body: RegisterRequest{
				Username: "test@user",
				Email:    "test@example.com",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "username contains invalid character: @",
		},
		{
			name: "Username starts with special character",
			body: RegisterRequest{
				Username: "_testuser",
				Email:    "test@example.com",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "username cannot start with special character",
		},
		{
			name: "Invalid email format",
			body: RegisterRequest{
				Username: "testuser",
				Email:    "invalid-email",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "valid email is required",
		},
		{
			name: "Email without TLD",
			body: RegisterRequest{
				Username: "testuser",
				Email:    "test@localhost",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "valid email is required",
		},
		{
			name: "Password too short",
			body: RegisterRequest{
				Username: "testuser",
				Email:    "test@example.com",
				Password: "1234567",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "password must be at least 8 characters long",
		},
		{
			name: "Password too long",
			body: RegisterRequest{
				Username: "testuser",
				Email:    "test@example.com",
				Password: strings.Repeat("a", 73),
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "password must be at most 72 characters long",
		},
		{
			name: "Valid registration with normalization",
			body: RegisterRequest{
				Username: "  TestUser  ",
				Email:    "  TEST@EXAMPLE.COM  ",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "TestUser", "test@example.com", mock.AnythingOfType("string"), "user").Return(&userstore.User{
					ID:       "user-123",
					Username: "TestUser",
					Email:    "test@example.com",
					Role:     "user",
					IsActive: true,
				}, nil)
			},
			expectedStatus: http.StatusCreated,
			errorCode:      "",
		},
		{
			name: "Empty username after trimming",
			body: RegisterRequest{
				Username: "   ",
				Email:    "test@example.com",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "username is required",
		},
		{
			name: "Empty email",
			body: RegisterRequest{
				Username: "testuser",
				Email:    "",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "valid email is required",
		},
		{
			name: "Empty password",
			body: RegisterRequest{
				Username: "testuser",
				Email:    "test@example.com",
				Password: "",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      errors.ErrInvalidInput,
			errorMessage:   "password must be at least 8 characters long",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			tt.setupMocks()

			body, err := json.Marshal(tt.body)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.Register(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.errorMessage != "" {
				var errResp errors.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Error.Code)
				assert.Contains(t, errResp.Error.Message, tt.errorMessage)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Greater(t, loginResp.ExpiresIn, int64(0))
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestLogin_InputNormalization(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, logger)

	// Create a valid hashed password for testing
	hashedPassword, err := auth.HashPassword("password123")
	require.NoError(t, err)

	tests := []struct {
		name           string
		body           LoginRequest
		setupMocks     func()
		expectedStatus int
		description    string
	}{
		{
			name: "Login with username (trimmed and normalized)",
			body: LoginRequest{
				Username: "  TestUser  ",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByUsernameOrEmail", mock.Anything, "TestUser").Return(&model.User{
					ID:             "user-123",
					Username:       "TestUser",
					Email:          "test@example.com",
					HashedPassword: hashedPassword,
					Role:           "user",
					IsActive:       true,
				}, nil)
				mockUserStore.On("UpdateLastLogin", mock.Anything, "user-123").Return(nil)
			},
			expectedStatus: http.StatusOK,
			description:    "Should trim and normalize username",
		},
		{
			name: "Login with email (normalized to lowercase)",
			body: LoginRequest{
				Username: "  TEST@EXAMPLE.COM  ",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByUsernameOrEmail", mock.Anything, "test@example.com").Return(&model.User{
					ID:             "user-123",
					Username:       "TestUser",
					Email:          "test@example.com",
					HashedPassword: hashedPassword,
					Role:           "user",
					IsActive:       true,
				}, nil)
				mockUserStore.On("UpdateLastLogin", mock.Anything, "user-123").Return(nil)
			},
			expectedStatus: http.StatusOK,
			description:    "Should normalize email to lowercase",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			tt.setupMocks()

			body, err := json.Marshal(tt.body)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.Login(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code, tt.description)

			if tt.expectedStatus == http.StatusOK {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Equal(t, "TestUser", loginResp.User.Username)
				assert.Equal(t, "test@example.com", loginResp.User.Email)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}
