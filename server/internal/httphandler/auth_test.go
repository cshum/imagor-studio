package httphandler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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

func (m *MockUserStore) Create(ctx context.Context, displayName, username, hashedPassword, role string) (*userstore.User, error) {
	args := m.Called(ctx, displayName, username, hashedPassword, role)
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

func (m *MockUserStore) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	args := m.Called(ctx, username)
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

func (m *MockUserStore) UpdateUsername(ctx context.Context, id string, username string) error {
	args := m.Called(ctx, id, username)
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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger, false)

	tests := []struct {
		name           string
		method         string
		body           interface{}
		setupMocks     func()
		expectedStatus int
		expectError    bool
		errorCode      string
	}{
		{
			name:   "Valid registration",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "testuser",
				Username:    "testuser",
				Password:    "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "testuser", "testuser", mock.AnythingOfType("string"), "user").Return(&userstore.User{
					ID:          "user-123",
					DisplayName: "testuser",
					Username:    "testuser",
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
				Username:    "existinguser",
				Password:    "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "existinguser", "existinguser", mock.AnythingOfType("string"), "user").Return(nil, fmt.Errorf("displayName already exists"))
			},
			expectedStatus: http.StatusConflict,
			expectError:    true,
			errorCode:      "ALREADY_EXISTS",
		},
		{
			name:   "Email already exists",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "newuser",
				Username:    "existinguser",
				Password:    "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "newuser", "existinguser", mock.AnythingOfType("string"), "user").Return(nil, fmt.Errorf("username already exists"))
			},
			expectedStatus: http.StatusConflict,
			expectError:    true,
			errorCode:      "ALREADY_EXISTS",
		},
		{
			name:   "Invalid password too short",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "testuser",
				Username:    "testuser",
				Password:    "short",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      "INVALID_INPUT",
		},
		{
			name:   "Missing displayName",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "",
				Username:    "testuser",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      "INVALID_INPUT",
		},
		{
			name:   "Missing username",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "testuser",
				Username:    "",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      "INVALID_INPUT",
		},
		{
			name:   "Invalid username format",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "testuser",
				Username:    "invalid-username!",
				Password:    "password123",
			},
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      "INVALID_INPUT",
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			setupMocks:     func() {},
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      "METHOD_NOT_ALLOWED",
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      "INVALID_INPUT",
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

			req := httptest.NewRequest(tt.method, "/api/auth/register", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.Register()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Code)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Greater(t, loginResp.ExpiresIn, int64(0))
				assert.Equal(t, "testuser", loginResp.User.DisplayName)
				assert.Equal(t, "testuser", loginResp.User.Username)
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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger, false)

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
		errorCode      string
	}{
		{
			name:   "Valid login with username",
			method: http.MethodPost,
			body: LoginRequest{
				Username: "testuser",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByUsername", mock.Anything, "testuser").Return(&model.User{
					ID:             "user-123",
					DisplayName:    "testuser",
					Username:       "testuser",
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
				mockUserStore.On("GetByUsername", mock.Anything, "admin").Return(&model.User{
					ID:             "admin-123",
					DisplayName:    "admin",
					Username:       "admin",
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
				mockUserStore.On("GetByUsername", mock.Anything, "testuser").Return(&model.User{
					ID:             "user-123",
					DisplayName:    "testuser",
					Username:       "testuser",
					HashedPassword: hashedPassword,
					Role:           "user",
					IsActive:       true,
				}, nil)
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      "INVALID_CREDENTIALS",
		},
		{
			name:   "User not found",
			method: http.MethodPost,
			body: LoginRequest{
				Username: "nonexistent",
				Password: "password123",
			},
			setupMocks: func() {
				mockUserStore.On("GetByUsername", mock.Anything, "nonexistent").Return(nil, nil)
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      "INVALID_CREDENTIALS",
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
			errorCode:      "INVALID_INPUT",
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
			errorCode:      "INVALID_INPUT",
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			setupMocks:     func() {},
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      "METHOD_NOT_ALLOWED",
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      "INVALID_INPUT",
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

			req := httptest.NewRequest(tt.method, "/api/auth/login", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.Login()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Code)
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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger, false)

	// Generate a valid token first
	validToken, err := tokenManager.GenerateToken("user1", "user", []string{"read"}, "")
	require.NoError(t, err)

	tests := []struct {
		name           string
		method         string
		body           interface{}
		setupMocks     func()
		expectedStatus int
		expectError    bool
		errorCode      string
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
					Username:    "testuser",
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
			errorCode:      "UNAUTHORIZED",
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			setupMocks:     func() {},
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      "METHOD_NOT_ALLOWED",
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			setupMocks:     func() {},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      "INVALID_INPUT",
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
			errorCode:      "UNAUTHORIZED",
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

			req := httptest.NewRequest(tt.method, "/api/auth/refresh", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.RefreshToken()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Code)
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
		errorCode      string
	}{
		{
			name: "Guest login enabled",
			setupMocks: func() {
				mockRegistryStore.On("Get", mock.Anything, registrystore.SystemOwnerID, "config.allow_guest_mode").Return(&registrystore.Registry{
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
				mockRegistryStore.On("Get", mock.Anything, registrystore.SystemOwnerID, "config.allow_guest_mode").Return(&registrystore.Registry{
					Key:   "config.allow_guest_mode",
					Value: "false",
				}, nil)
			},
			expectedStatus: http.StatusForbidden,
			expectError:    true,
			errorCode:      "FORBIDDEN",
		},
		{
			name: "Guest mode setting not found - fallback to old key",
			setupMocks: func() {
				// First call for new key returns nil
				mockRegistryStore.On("Get", mock.Anything, registrystore.SystemOwnerID, "config.allow_guest_mode").Return(nil, nil)
				// Second call for old key also returns nil
				mockRegistryStore.On("Get", mock.Anything, registrystore.SystemOwnerID, "auth.enableGuestMode").Return(nil, nil)
			},
			expectedStatus: http.StatusForbidden,
			expectError:    true,
			errorCode:      "FORBIDDEN",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRegistryStore.ExpectedCalls = nil
			tt.setupMocks()

			handler := NewAuthHandler(tokenManager, mockUserStore, mockRegistryStore, logger, true)

			req := httptest.NewRequest(http.MethodPost, "/api/auth/guest", nil)
			rr := httptest.NewRecorder()

			handler.GuestLogin()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Code)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Equal(t, "guest", loginResp.User.Role)
				assert.Equal(t, "guest", loginResp.User.DisplayName)
				assert.Equal(t, "guest", loginResp.User.Username)

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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, logger, false)

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

			req := httptest.NewRequest(http.MethodGet, "/api/auth/first-run", nil)
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
		errorCode      string
		setupMocks     func()
	}{
		{
			name: "Valid admin registration with registry population",
			body: RegisterRequest{
				DisplayName: "administrator",
				Username:    "administrator",
				Password:    "securepassword123",
			},
			existingUsers:  0,
			expectedStatus: http.StatusCreated,
			expectError:    false,
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "administrator", "administrator", mock.AnythingOfType("string"), "admin").Return(&userstore.User{
					ID:          "admin-123",
					DisplayName: "administrator",
					Username:    "administrator",
					Role:        "admin",
					IsActive:    true,
				}, nil)

				// Expect registry population with correct values
				mockRegistryStore.On("SetMulti", mock.Anything, registrystore.SystemOwnerID, mock.MatchedBy(func(entries []*registrystore.Registry) bool {
					if len(entries) != 3 {
						return false
					}
					// Verify all three entries
					imageExtensionsFound := false
					videoExtensionsFound := false
					hiddenFound := false
					for _, entry := range entries {
						if entry.Key == "config.app_image_extensions" &&
							entry.Value == ".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif" &&
							!entry.IsEncrypted {
							imageExtensionsFound = true
						}
						if entry.Key == "config.app_video_extensions" &&
							entry.Value == ".mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg" &&
							!entry.IsEncrypted {
							videoExtensionsFound = true
						}
						if entry.Key == "config.app_show_hidden" &&
							entry.Value == "false" &&
							!entry.IsEncrypted {
							hiddenFound = true
						}
					}
					return imageExtensionsFound && videoExtensionsFound && hiddenFound
				})).Return([]*registrystore.Registry{
					{Key: "config.app_image_extensions", Value: ".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif", IsEncrypted: false},
					{Key: "config.app_video_extensions", Value: ".mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg", IsEncrypted: false},
					{Key: "config.app_show_hidden", Value: "false", IsEncrypted: false},
				}, nil)
			},
		},
		{
			name: "Admin registration succeeds even if registry population fails",
			body: RegisterRequest{
				DisplayName: "administrator",
				Username:    "administrator",
				Password:    "securepassword123",
			},
			existingUsers:  0,
			expectedStatus: http.StatusCreated,
			expectError:    false,
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "administrator", "administrator", mock.AnythingOfType("string"), "admin").Return(&userstore.User{
					ID:          "admin-123",
					DisplayName: "administrator",
					Username:    "administrator",
					Role:        "admin",
					IsActive:    true,
				}, nil)

				// Registry population fails but doesn't affect registration
				mockRegistryStore.On("SetMulti", mock.Anything, registrystore.SystemOwnerID, mock.Anything).Return(nil, fmt.Errorf("registry error"))
			},
		},
		{
			name: "Admin registration when users already exist",
			body: RegisterRequest{
				DisplayName: "administrator",
				Username:    "administrator",
				Password:    "securepassword123",
			},
			existingUsers:  1,
			expectedStatus: http.StatusConflict,
			expectError:    true,
			errorCode:      "ALREADY_EXISTS",
			setupMocks:     func() {},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore.ExpectedCalls = nil
			mockRegistryStore.ExpectedCalls = nil

			mockUserStore.On("List", mock.Anything, 0, 1).Return([]*userstore.User{}, tt.existingUsers, nil)
			tt.setupMocks()

			handler := NewAuthHandler(tokenManager, mockUserStore, mockRegistryStore, logger, false)

			body, err := json.Marshal(tt.body)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPost, "/api/auth/register-admin", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.RegisterAdmin()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Code)
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

func TestEmbeddedGuestLogin(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	mockRegistryStore := new(MockRegistryStore)

	// Generate valid JWT tokens for testing
	validToken, err := tokenManager.GenerateToken("test-user", "user", []string{"read"}, "")
	require.NoError(t, err)

	// Generate token with path prefix
	tokenWithPathPrefix, err := tokenManager.GenerateTokenWithOptions("test-user", "user", []string{"read"}, true, "/user123/images")
	require.NoError(t, err)

	// Generate token with root path prefix
	tokenWithRootPrefix, err := tokenManager.GenerateTokenWithOptions("test-user", "user", []string{"read"}, true, "/")
	require.NoError(t, err)

	// Generate expired token
	expiredTokenManager := auth.NewTokenManager("test-secret", -time.Hour)
	expiredToken, err := expiredTokenManager.GenerateToken("test-user", "user", []string{"read"}, "")
	require.NoError(t, err)

	tests := []struct {
		name               string
		embeddedMode       bool
		method             string
		authHeader         string
		expectedStatus     int
		expectError        bool
		errorCode          string
		expectedPathPrefix string
	}{
		{
			name:           "Embedded mode disabled",
			embeddedMode:   false,
			method:         http.MethodPost,
			authHeader:     fmt.Sprintf("Bearer %s", validToken),
			expectedStatus: http.StatusForbidden,
			expectError:    true,
			errorCode:      "FORBIDDEN",
		},
		{
			name:               "Valid JWT token - successful embedded guest login",
			embeddedMode:       true,
			method:             http.MethodPost,
			authHeader:         fmt.Sprintf("Bearer %s", validToken),
			expectedStatus:     http.StatusOK,
			expectError:        false,
			expectedPathPrefix: "", // No path prefix in token
		},
		{
			name:               "Valid JWT token with path prefix",
			embeddedMode:       true,
			method:             http.MethodPost,
			authHeader:         fmt.Sprintf("Bearer %s", tokenWithPathPrefix),
			expectedStatus:     http.StatusOK,
			expectError:        false,
			expectedPathPrefix: "/user123/images",
		},
		{
			name:               "Valid JWT token with root path prefix",
			embeddedMode:       true,
			method:             http.MethodPost,
			authHeader:         fmt.Sprintf("Bearer %s", tokenWithRootPrefix),
			expectedStatus:     http.StatusOK,
			expectError:        false,
			expectedPathPrefix: "/",
		},
		{
			name:           "Missing Authorization header",
			embeddedMode:   true,
			method:         http.MethodPost,
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      "UNAUTHORIZED",
		},
		{
			name:           "Invalid Authorization header format",
			embeddedMode:   true,
			method:         http.MethodPost,
			authHeader:     validToken,
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      "UNAUTHORIZED",
		},
		{
			name:           "Invalid JWT token",
			embeddedMode:   true,
			method:         http.MethodPost,
			authHeader:     "Bearer invalid.jwt.token",
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      "UNAUTHORIZED",
		},
		{
			name:           "Expired JWT token",
			embeddedMode:   true,
			method:         http.MethodPost,
			authHeader:     fmt.Sprintf("Bearer %s", expiredToken),
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      "UNAUTHORIZED",
		},
		{
			name:           "Invalid HTTP method",
			embeddedMode:   true,
			method:         http.MethodGet,
			authHeader:     fmt.Sprintf("Bearer %s", validToken),
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      "METHOD_NOT_ALLOWED",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewAuthHandler(tokenManager, mockUserStore, mockRegistryStore, logger, tt.embeddedMode)

			req := httptest.NewRequest(tt.method, "/api/auth/embedded-guest", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			rr := httptest.NewRecorder()

			handler.EmbeddedGuestLogin()(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Code)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)

				// Verify response structure
				assert.NotEmpty(t, loginResp.Token)
				assert.Greater(t, loginResp.ExpiresIn, int64(0))
				assert.Equal(t, "guest", loginResp.User.Role)
				assert.Equal(t, "Embedded Guest", loginResp.User.DisplayName)
				assert.Equal(t, "embedded-guest", loginResp.User.Username)
				assert.NotEmpty(t, loginResp.User.ID)

				// Verify path prefix in response
				assert.Equal(t, tt.expectedPathPrefix, loginResp.PathPrefix)

				// Verify the session token is valid and has correct claims
				sessionClaims, err := tokenManager.ValidateToken(loginResp.Token)
				require.NoError(t, err)
				assert.Equal(t, "guest", sessionClaims.Role)
				assert.Contains(t, sessionClaims.Scopes, "read")
				assert.Contains(t, sessionClaims.Scopes, "edit")
				assert.NotContains(t, sessionClaims.Scopes, "write")
				assert.NotContains(t, sessionClaims.Scopes, "admin")
				assert.True(t, sessionClaims.IsEmbedded)

				// Verify path prefix is preserved in session token
				assert.Equal(t, tt.expectedPathPrefix, sessionClaims.PathPrefix)
			}
		})
	}
}
