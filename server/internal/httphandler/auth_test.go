package httphandler

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

	"github.com/cshum/imagor-studio/server/internal/apperror"
	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type MockUserStore struct {
	mock.Mock
}

func (m *MockUserStore) Create(ctx context.Context, displayName, email, hashedPassword, role string) (*userstore.User, error) {
	args := m.Called(ctx, displayName, email, hashedPassword, role)
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

func (m *MockUserStore) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	args := m.Called(ctx, email)
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

func (m *MockUserStore) UpdateDisplayName(ctx context.Context, id string, displayName string) error {
	args := m.Called(ctx, id, displayName)
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

type MockRegistryStore struct {
	mock.Mock
}

func (m *MockRegistryStore) List(ctx context.Context, ownerID string, prefix *string) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, prefix)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
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
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) Delete(ctx context.Context, ownerID, key string) error {
	args := m.Called(ctx, ownerID, key)
	return args.Error(0)
}

func (m *MockRegistryStore) SetMulti(ctx context.Context, ownerID string, entries []*registrystore.Registry) ([]*registrystore.Registry, error) {
	args := m.Called(ctx, ownerID, entries)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*registrystore.Registry), args.Error(1)
}

func (m *MockRegistryStore) DeleteMulti(ctx context.Context, ownerID string, keys []string) error {
	args := m.Called(ctx, ownerID, keys)
	return args.Error(0)
}

func TestRegister(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger)

	tests := []struct {
		name           string
		method         string
		body           interface{}
		setupMocks     func()
		expectedStatus int
		expectError    bool
		errorCode      apperror.ErrorCode
	}{
		{
			name:   "Valid registration",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "testuser", "test@example.com", mock.AnythingOfType("string"), "user").Return(&userstore.User{
					ID:          "user-123",
					DisplayName: "testuser",
					Email:       "test@example.com",
					Role:        "user",
					IsActive:    true,
				}, nil)
			},
			expectedStatus: http.StatusCreated,
			expectError:    false,
		},
		{
			name:   "DisplayName already exists",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "existinguser",
				Email:       "new@example.com",
				Password:    "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "existinguser", "new@example.com", mock.AnythingOfType("string"), "user").Return(nil, fmt.Errorf("displayName already exists"))
			},
			expectedStatus: http.StatusConflict,
			expectError:    true,
			errorCode:      apperror.ErrAlreadyExists,
		},
		{
			name:   "Email already exists",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "newuser",
				Email:       "existing@example.com",
				Password:    "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "newuser", "existing@example.com", mock.AnythingOfType("string"), "user").Return(nil, fmt.Errorf("email already exists"))
			},
			expectedStatus: http.StatusConflict,
			expectError:    true,
			errorCode:      apperror.ErrAlreadyExists,
		},
		{
			name:   "Invalid password too short",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "short",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
		},
		{
			name:   "Missing displayName",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "",
				Email:       "test@example.com",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
		},
		{
			name:   "Missing email",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
		},
		{
			name:   "Invalid email format",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "invalid-email",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			setupMocks:     func() {},
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
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

			handler.Register()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Error.Code)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Greater(t, loginResp.ExpiresIn, int64(0))
				assert.Equal(t, "testuser", loginResp.User.DisplayName)
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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger)

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
		errorCode      apperror.ErrorCode
	}{
		{
			name:   "Valid login with email",
			method: http.MethodPost,
			body: LoginRequest{
				Email:    "test@example.com",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByEmail", mock.Anything, "test@example.com").Return(&model.User{
					ID:             "user-123",
					DisplayName:    "testuser",
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
				Email:    "admin@example.com",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByEmail", mock.Anything, "admin@example.com").Return(&model.User{
					ID:             "admin-123",
					DisplayName:    "admin",
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
				Email:    "test@example.com",
				Password: "wrongpassword",
			},
			setupMocks: func() {
				mockUserStore.On("GetByEmail", mock.Anything, "test@example.com").Return(&model.User{
					ID:             "user-123",
					DisplayName:    "testuser",
					Email:          "test@example.com",
					HashedPassword: hashedPassword,
					Role:           "user",
					IsActive:       true,
				}, nil)
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      apperror.ErrInvalidCredentials,
		},
		{
			name:   "User not found",
			method: http.MethodPost,
			body: LoginRequest{
				Email:    "nonexistent@example.com",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByEmail", mock.Anything, "nonexistent@example.com").Return(nil, nil)
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      apperror.ErrInvalidCredentials,
		},
		{
			name:   "Empty email",
			method: http.MethodPost,
			body: LoginRequest{
				Email:    "",
				Password: "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
		},
		{
			name:   "Empty password",
			method: http.MethodPost,
			body: LoginRequest{
				Email:    "testuser@example.com",
				Password: "",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			setupMocks:     func() {},
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
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

			handler.Login()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger)

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
		errorCode      apperror.ErrorCode
	}{
		{
			name:   "Valid refresh request",
			method: http.MethodPost,
			body: RefreshTokenRequest{
				Token: validToken,
			},
			setupMocks: func() {
				mockUserStore.On("GetByID", mock.Anything, "user1").Return(&userstore.User{
					ID:          "user1",
					DisplayName: "testuser",
					Email:       "test@example.com",
					Role:        "user",
					IsActive:    true,
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
			errorCode:      apperror.ErrInvalidToken,
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			setupMocks:     func() {},
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      apperror.ErrInvalidInput,
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
			errorCode:      apperror.ErrInvalidToken,
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

			handler.RefreshToken()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger)

	tests := []struct {
		name           string
		body           RegisterRequest
		setupMocks     func()
		expectedStatus int
		errorCode      apperror.ErrorCode
		errorMessage   string
	}{
		{
			name: "DisplayName too long",
			body: RegisterRequest{
				DisplayName: strings.Repeat("a", 101),
				Email:       "test@example.com",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      apperror.ErrInvalidInput,
			errorMessage:   "display name must be at most 100 characters long",
		},
		{
			name: "Invalid email format",
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "invalid-email",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      apperror.ErrInvalidInput,
			errorMessage:   "valid email is required",
		},
		{
			name: "Email without TLD",
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "test@localhost",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      apperror.ErrInvalidInput,
			errorMessage:   "valid email is required",
		},
		{
			name: "Password too short",
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "1234567",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      apperror.ErrInvalidInput,
			errorMessage:   "password must be at least 8 characters long",
		},
		{
			name: "Password too long",
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    strings.Repeat("a", 73),
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      apperror.ErrInvalidInput,
			errorMessage:   "password must be at most 72 characters long",
		},
		{
			name: "Valid registration with normalization",
			body: RegisterRequest{
				DisplayName: "  TestUser  ",
				Email:       "  TEST@EXAMPLE.COM  ",
				Password:    "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "TestUser", "test@example.com", mock.AnythingOfType("string"), "user").Return(&userstore.User{
					ID:          "user-123",
					DisplayName: "TestUser",
					Email:       "test@example.com",
					Role:        "user",
					IsActive:    true,
				}, nil)
			},
			expectedStatus: http.StatusCreated,
			errorCode:      "",
		},
		{
			name: "Empty display name after trimming",
			body: RegisterRequest{
				DisplayName: "   ",
				Email:       "test@example.com",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      apperror.ErrInvalidInput,
			errorMessage:   "display name is required",
		},
		{
			name: "Empty email",
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      apperror.ErrInvalidInput,
			errorMessage:   "valid email is required",
		},
		{
			name: "Empty password",
			body: RegisterRequest{
				DisplayName: "testuser",
				Email:       "test@example.com",
				Password:    "",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			errorCode:      apperror.ErrInvalidInput,
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

			handler.Register()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.errorMessage != "" {
				var errResp apperror.ErrorResponse
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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger)

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
			name: "Login with email (normalized to lowercase)",
			body: LoginRequest{
				Email:    "  TEST@EXAMPLE.COM  ",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByEmail", mock.Anything, "test@example.com").Return(&model.User{
					ID:             "user-123",
					DisplayName:    "TestUser",
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

			handler.Login()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code, tt.description)

			if tt.expectedStatus == http.StatusOK {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Equal(t, "TestUser", loginResp.User.DisplayName)
				assert.Equal(t, "test@example.com", loginResp.User.Email)
			}

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestGuestLogin(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	mockRegistryStore := new(MockRegistryStore)

	tests := []struct {
		name           string
		setupMocks     func()
		expectedStatus int
		expectError    bool
		errorCode      apperror.ErrorCode
	}{
		{
			name: "Guest login enabled",
			setupMocks: func() {
				mockRegistryStore.On("Get", mock.Anything, "system", "config.allow_guest_mode").Return(&registrystore.Registry{
					Key:   "config.allow_guest_mode",
					Value: "true",
				}, nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name: "Guest login disabled",
			setupMocks: func() {
				mockRegistryStore.On("Get", mock.Anything, "system", "config.allow_guest_mode").Return(&registrystore.Registry{
					Key:   "config.allow_guest_mode",
					Value: "false",
				}, nil)
			},
			expectedStatus: http.StatusForbidden,
			expectError:    true,
			errorCode:      apperror.ErrPermissionDenied,
		},
		{
			name: "Guest mode setting not found - fallback to old key",
			setupMocks: func() {
				// First call for new key returns nil
				mockRegistryStore.On("Get", mock.Anything, "system", "config.allow_guest_mode").Return(nil, nil)
				// Second call for old key also returns nil
				mockRegistryStore.On("Get", mock.Anything, "system", "auth.enableGuestMode").Return(nil, nil)
			},
			expectedStatus: http.StatusForbidden,
			expectError:    true,
			errorCode:      apperror.ErrPermissionDenied,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRegistryStore.ExpectedCalls = nil
			tt.setupMocks()

			handler := NewAuthHandler(tokenManager, mockUserStore, mockRegistryStore, logger)

			req := httptest.NewRequest(http.MethodPost, "/auth/guest", nil)
			rr := httptest.NewRecorder()

			handler.GuestLogin()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Error.Code)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Equal(t, "guest", loginResp.User.Role)
				assert.Equal(t, "guest", loginResp.User.DisplayName)
				assert.Equal(t, "guest@temporary.local", loginResp.User.Email)

				// Verify the token is valid
				claims, err := tokenManager.ValidateToken(loginResp.Token)
				require.NoError(t, err)
				assert.Equal(t, "guest", claims.Role)
				assert.Contains(t, claims.Scopes, "read")
				assert.NotContains(t, claims.Scopes, "write")
				assert.NotContains(t, claims.Scopes, "admin")
			}

			mockRegistryStore.AssertExpectations(t)
		})
	}
}

func TestCheckFirstRun(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger)

	tests := []struct {
		name           string
		userCount      int
		expectFirstRun bool
	}{
		{"No users - first run", 0, true},
		{"Users exist - not first run", 5, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			mockUserStore.On("List", mock.Anything, 0, 1).Return([]*userstore.User{}, tt.userCount, nil)

			req := httptest.NewRequest(http.MethodGet, "/auth/first-run", nil)
			rr := httptest.NewRecorder()

			handler.CheckFirstRun()(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code)

			var response map[string]interface{}
			err := json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Equal(t, tt.expectFirstRun, response["isFirstRun"])

			mockUserStore.AssertExpectations(t)
		})
	}
}

func TestRegisterAdmin(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	mockRegistryStore := new(MockRegistryStore)

	tests := []struct {
		name           string
		body           RegisterRequest
		existingUsers  int
		expectedStatus int
		expectError    bool
		errorCode      apperror.ErrorCode
		setupMocks     func()
	}{
		{
			name: "Valid admin registration on first run",
			body: RegisterRequest{
				DisplayName: "admin",
				Email:       "admin@example.com",
				Password:    "securepassword123",
			},
			existingUsers:  0,
			expectedStatus: http.StatusCreated,
			expectError:    false,
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "admin", mock.AnythingOfType("string"), mock.AnythingOfType("string"), "admin").Return(&userstore.User{
					ID:          "admin-123",
					DisplayName: "admin",
					Email:       "admin@example.com",
					Role:        "admin",
					IsActive:    true,
				}, nil)
				// Mock the registry store calls for setupDefaultGalleryMetadata
				mockRegistryStore.On("Set", mock.Anything, "system", "gallery.supported_extensions", mock.AnythingOfType("string"), false).Return(&registrystore.Registry{}, nil)
				mockRegistryStore.On("Set", mock.Anything, "system", "gallery.thumbnail_sizes", mock.AnythingOfType("string"), false).Return(&registrystore.Registry{}, nil)
				mockRegistryStore.On("Set", mock.Anything, "system", "gallery.config", mock.AnythingOfType("string"), false).Return(&registrystore.Registry{}, nil)
				mockRegistryStore.On("Set", mock.Anything, "system", "imagor.config", mock.AnythingOfType("string"), false).Return(&registrystore.Registry{}, nil)
			},
		},
		{
			name: "Admin registration when users already exist",
			body: RegisterRequest{
				DisplayName: "admin",
				Email:       "admin@example.com",
				Password:    "securepassword123",
			},
			existingUsers:  1,
			expectedStatus: http.StatusConflict,
			expectError:    true,
			errorCode:      apperror.ErrAlreadyExists,
			setupMocks:     func() {},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			mockRegistryStore.ExpectedCalls = nil

			mockUserStore.On("List", mock.Anything, 0, 1).Return([]*userstore.User{}, tt.existingUsers, nil)
			tt.setupMocks()

			handler := NewAuthHandler(tokenManager, mockUserStore, mockRegistryStore, logger)

			body, err := json.Marshal(tt.body)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPost, "/auth/register-admin", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.RegisterAdmin()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Error.Code)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Equal(t, "admin", loginResp.User.Role)
			}

			mockUserStore.AssertExpectations(t)
			mockRegistryStore.AssertExpectations(t)
		})
	}
}
