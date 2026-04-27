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

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"go.uber.org/zap"
)

// ── failing orgStore stub ─────────────────────────────────────────────────────

// errOrgStore implements space.OrgStore but returns an error on every call.
// Used to verify failure paths without a real database.
type errOrgStore struct{ msg string }

func (e *errOrgStore) CreateWithMember(_ context.Context, _, _, _ string, _ *time.Time) (*org.Org, error) {
	return nil, fmt.Errorf("%s", e.msg)
}
func (e *errOrgStore) GetByID(_ context.Context, _ string) (*org.Org, error) {
	return nil, fmt.Errorf("%s", e.msg)
}
func (e *errOrgStore) GetByUserID(_ context.Context, _ string) (*org.Org, error) {
	return nil, fmt.Errorf("%s", e.msg)
}
func (e *errOrgStore) GetBySlug(_ context.Context, _ string) (*org.Org, error) {
	return nil, fmt.Errorf("%s", e.msg)
}

func (e *errOrgStore) GetByStripeCustomerID(_ context.Context, _ string) (*org.Org, error) {
	return nil, fmt.Errorf("%s", e.msg)
}

func (e *errOrgStore) UpdateBillingState(_ context.Context, _ string, _ org.BillingStateUpdate) (*org.Org, error) {
	return nil, fmt.Errorf("%s", e.msg)
}

func (e *errOrgStore) ExpireTrials(_ context.Context, _ time.Time) ([]string, error) {
	return nil, fmt.Errorf("%s", e.msg)
}

func (e *errOrgStore) ListMembers(_ context.Context, _ string) ([]*org.OrgMemberView, error) {
	return nil, fmt.Errorf("%s", e.msg)
}

func (e *errOrgStore) AddMember(_ context.Context, _, _, _ string) error {
	return fmt.Errorf("%s", e.msg)
}

func (e *errOrgStore) RemoveMember(_ context.Context, _, _ string) error {
	return fmt.Errorf("%s", e.msg)
}

func (e *errOrgStore) UpdateMemberRole(_ context.Context, _, _, _ string) error {
	return fmt.Errorf("%s", e.msg)
}

func (e *errOrgStore) TransferOwnership(_ context.Context, _, _, _ string) error {
	return fmt.Errorf("%s", e.msg)
}

// nilOrgStore implements space.OrgStore but returns (nil, nil) on lookups —
// simulates a user that exists but has no org yet.
type nilOrgStore struct{}

func (n *nilOrgStore) CreateWithMember(_ context.Context, _, _, _ string, _ *time.Time) (*org.Org, error) {
	return nil, nil
}
func (n *nilOrgStore) GetByID(_ context.Context, _ string) (*org.Org, error) {
	return nil, nil
}
func (n *nilOrgStore) GetByUserID(_ context.Context, _ string) (*org.Org, error) {
	return nil, nil // no org found
}
func (n *nilOrgStore) GetBySlug(_ context.Context, _ string) (*org.Org, error) {
	return nil, nil
}

func (n *nilOrgStore) GetByStripeCustomerID(_ context.Context, _ string) (*org.Org, error) {
	return nil, nil
}

func (n *nilOrgStore) UpdateBillingState(_ context.Context, _ string, _ org.BillingStateUpdate) (*org.Org, error) {
	return nil, nil
}

func (n *nilOrgStore) ExpireTrials(_ context.Context, _ time.Time) ([]string, error) {
	return []string{}, nil
}

func (n *nilOrgStore) ListMembers(_ context.Context, _ string) ([]*org.OrgMemberView, error) {
	return nil, nil
}

func (n *nilOrgStore) AddMember(_ context.Context, _, _, _ string) error {
	return nil
}

func (n *nilOrgStore) RemoveMember(_ context.Context, _, _ string) error {
	return nil
}

func (n *nilOrgStore) UpdateMemberRole(_ context.Context, _, _, _ string) error {
	return nil
}

func (n *nilOrgStore) TransferOwnership(_ context.Context, _, _, _ string) error {
	return nil
}

type stubSpaceStore struct {
	spaceByKey map[string]*space.Space
	err        error
}

func (s *stubSpaceStore) Create(_ context.Context, _ *space.Space) error                { return nil }
func (s *stubSpaceStore) RenameKey(_ context.Context, _, _ string) error                { return nil }
func (s *stubSpaceStore) Upsert(_ context.Context, _ *space.Space) error                { return nil }
func (s *stubSpaceStore) SetSuspendedByOrgID(_ context.Context, _ string, _ bool) error { return nil }
func (s *stubSpaceStore) SoftDelete(_ context.Context, _ string) error                  { return nil }
func (s *stubSpaceStore) GetByKey(_ context.Context, key string) (*space.Space, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.spaceByKey == nil {
		return nil, nil
	}
	return s.spaceByKey[key], nil
}
func (s *stubSpaceStore) GetByID(_ context.Context, id string) (*space.Space, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.spaceByKey == nil {
		return nil, nil
	}
	for _, sp := range s.spaceByKey {
		if sp != nil && sp.ID == id {
			return sp, nil
		}
	}
	return nil, nil
}
func (s *stubSpaceStore) List(_ context.Context) ([]*space.Space, error) { return nil, nil }
func (s *stubSpaceStore) ListByOrgID(_ context.Context, _ string) ([]*space.Space, error) {
	return nil, nil
}
func (s *stubSpaceStore) ListByMemberUserID(_ context.Context, _ string) ([]*space.Space, error) {
	return nil, nil
}
func (s *stubSpaceStore) Delta(_ context.Context, _ time.Time) (*space.DeltaResult, error) {
	return nil, nil
}
func (s *stubSpaceStore) KeyExists(_ context.Context, _ string) (bool, error) { return false, nil }
func (s *stubSpaceStore) ListMembers(_ context.Context, _ string) ([]*space.SpaceMemberView, error) {
	return nil, nil
}
func (s *stubSpaceStore) AddMember(_ context.Context, _, _, _ string) error        { return nil }
func (s *stubSpaceStore) RemoveMember(_ context.Context, _, _ string) error        { return nil }
func (s *stubSpaceStore) UpdateMemberRole(_ context.Context, _, _, _ string) error { return nil }
func (s *stubSpaceStore) HasMember(_ context.Context, _, _ string) (bool, error)   { return false, nil }

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

func (m *MockUserStore) GetByIDAdmin(ctx context.Context, id string) (*userstore.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) GetByEmail(ctx context.Context, email string) (*userstore.User, error) {
	args := m.Called(ctx, email)
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

func (m *MockUserStore) RequestEmailChange(ctx context.Context, id string, email string) (*userstore.User, error) {
	args := m.Called(ctx, id, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) ListAuthProviders(ctx context.Context, id string) ([]*userstore.AuthProvider, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return []*userstore.AuthProvider{}, args.Error(1)
	}
	return args.Get(0).([]*userstore.AuthProvider), args.Error(1)
}

func (m *MockUserStore) UnlinkAuthProvider(ctx context.Context, id string, provider string) error {
	args := m.Called(ctx, id, provider)
	return args.Error(0)
}

func (m *MockUserStore) SetActive(ctx context.Context, id string, active bool) error {
	args := m.Called(ctx, id, active)
	return args.Error(0)
}

func (m *MockUserStore) List(ctx context.Context, offset, limit int, search string) ([]*userstore.User, int, error) {
	args := m.Called(ctx, offset, limit, search)
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

func (m *MockUserStore) UpsertOAuth(ctx context.Context, provider, providerID, email, displayName, avatarURL string) (*userstore.User, error) {
	args := m.Called(ctx, provider, providerID, email, displayName, avatarURL)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) UpdateRole(ctx context.Context, id string, role string) error {
	args := m.Called(ctx, id, role)
	return args.Error(0)
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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, nil, logger, AuthHandlerConfig{})

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
			name:   "Unexpected already exists error is internal",
			method: http.MethodPost,
			body: RegisterRequest{
				DisplayName: "existinguser",
				Username:    "existinguser",
				Password:    "password123",
			},
			setupMocks: func() {
				mockUserStore.On("Create", mock.Anything, "existinguser", "existinguser", mock.AnythingOfType("string"), "user").Return(nil, fmt.Errorf("displayName already exists"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectError:    true,
			errorCode:      "INTERNAL_SERVER_ERROR",
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
				mockUserStore.On("Create", mock.Anything, "newuser", "existinguser", mock.AnythingOfType("string"), "user").Return(nil, userstore.ErrUsernameAlreadyExists)
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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, nil, logger, AuthHandlerConfig{})

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
	handler := NewAuthHandler(tokenManager, mockUserStore, nil, nil, logger, AuthHandlerConfig{})

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
		requestBody    string
		spaceStore     space.SpaceStore
		setupMocks     func()
		expectedStatus int
		expectError    bool
		errorCode      string
	}{
		{
			name:        "Guest login enabled",
			requestBody: "",
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
			name:        "Guest login disabled",
			requestBody: "",
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
			name:        "Guest mode setting not found - fallback to old key",
			requestBody: "",
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
		{
			name:        "Public space guest login enabled",
			requestBody: `{"spaceKey":"testspace"}`,
			spaceStore: &stubSpaceStore{spaceByKey: map[string]*space.Space{
				"testspace": {ID: "space-testspace", Key: "testspace"},
			}},
			setupMocks: func() {
				mockRegistryStore.On("Get", mock.Anything, registrystore.SystemOwnerID, "config.allow_guest_mode").Return(&registrystore.Registry{
					Key:   "config.allow_guest_mode",
					Value: "false",
				}, nil)
				mockRegistryStore.On("Get", mock.Anything, registrystore.SpaceOwnerID("space-testspace"), "config.allow_guest_mode").Return(&registrystore.Registry{
					Key:   "config.allow_guest_mode",
					Value: "true",
				}, nil)
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRegistryStore.ExpectedCalls = nil
			tt.setupMocks()

			handler := NewAuthHandler(tokenManager, mockUserStore, nil, mockRegistryStore, logger, AuthHandlerConfig{EmbeddedMode: true, SpaceStore: tt.spaceStore})

			var body *bytes.Buffer
			if tt.requestBody != "" {
				body = bytes.NewBufferString(tt.requestBody)
			} else {
				body = bytes.NewBuffer(nil)
			}
			req := httptest.NewRequest(http.MethodPost, "/api/auth/guest", body)
			req.Header.Set("Content-Type", "application/json")
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

// ── Multi-tenant org integration tests ───────────────────────────────────────────────

// TestRegister_MultiTenant_CreatesOrg verifies that registering with a wired orgStore:
//   - Creates a personal org in the DB.
//   - Embeds org_id in the returned JWT.
func TestRegister_MultiTenant_CreatesOrg(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	os := newTestOrgStore(newOrgTestDB(t))
	handler := NewAuthHandler(tokenManager, mockUserStore, os, nil, logger, AuthHandlerConfig{})

	const userID = "saas-reg-user-1"
	mockUserStore.On("Create", mock.Anything, "saasuser", "saasuser", mock.AnythingOfType("string"), "user").
		Return(&userstore.User{
			ID: userID, DisplayName: "saasuser", Username: "saasuser", Role: "user", IsActive: true,
		}, nil)

	body, err := json.Marshal(RegisterRequest{
		DisplayName: "saasuser",
		Username:    "saasuser",
		Password:    "password123",
	})
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	handler.Register()(rr, req)

	require.Equal(t, http.StatusCreated, rr.Code)

	var resp LoginResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp.Token)

	// Verify JWT embeds org_id.
	claims, err := tokenManager.ValidateToken(resp.Token)
	require.NoError(t, err)
	assert.NotEmpty(t, claims.OrgID, "JWT should carry org_id for multi-tenant signup")

	// Verify the org was persisted in the store.
	org, err := os.GetByUserID(context.Background(), userID)
	require.NoError(t, err)
	require.NotNil(t, org, "org should have been created on signup")
	assert.Equal(t, claims.OrgID, org.ID, "JWT org_id must match the created org")
	assert.Equal(t, "saasuser", org.Slug)
	assert.Equal(t, userID, org.OwnerID)

	mockUserStore.AssertExpectations(t)
}

// TestLogin_MultiTenant_EmbeddsOrgID verifies that logging in with a wired orgStore
// embeds the user's org_id in the returned JWT.
func TestLogin_MultiTenant_EmbeddsOrgID(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	os := newTestOrgStore(newOrgTestDB(t))
	handler := NewAuthHandler(tokenManager, mockUserStore, os, nil, logger, AuthHandlerConfig{})

	const userID = "saas-login-user-1"

	// Pre-create the org so login can look it up.
	createdOrg, err := os.CreateWithMember(context.Background(), userID, "loginuser", "loginuser", nil)
	require.NoError(t, err)

	hashedPassword, err := auth.HashPassword("password123")
	require.NoError(t, err)

	mockUserStore.On("GetByUsername", mock.Anything, "loginuser").Return(&model.User{
		ID: userID, DisplayName: "loginuser", Username: "loginuser",
		HashedPassword: hashedPassword, Role: "user", IsActive: true,
	}, nil)
	mockUserStore.On("UpdateLastLogin", mock.Anything, userID).Return(nil)

	body, err := json.Marshal(LoginRequest{Username: "loginuser", Password: "password123"})
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	handler.Login()(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var resp LoginResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))

	claims, err := tokenManager.ValidateToken(resp.Token)
	require.NoError(t, err)
	assert.Equal(t, createdOrg.ID, claims.OrgID, "login JWT should carry the user's org_id")

	mockUserStore.AssertExpectations(t)
}

// TestRegister_MultiTenant_OrgCreationFails — when the database is unavailable during
// org creation the handler should return 500 and not leak a partial JWT.
func TestRegister_MultiTenant_OrgCreationFails(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, &errOrgStore{msg: "DB connection refused"}, nil, logger, AuthHandlerConfig{})

	const userID = "saas-fail-user-1"
	mockUserStore.On("Create", mock.Anything, "failuser", "failuser", mock.AnythingOfType("string"), "user").
		Return(&userstore.User{ID: userID, DisplayName: "failuser", Username: "failuser", Role: "user", IsActive: true}, nil)

	body, _ := json.Marshal(RegisterRequest{DisplayName: "failuser", Username: "failuser", Password: "password123"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	handler.Register()(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	var errResp apperror.ErrorResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &errResp))
	assert.Equal(t, "INTERNAL_SERVER_ERROR", errResp.Code)

	mockUserStore.AssertExpectations(t)
}

// TestRegister_MultiTenant_SelfHosted_NoOrgInJWT — when orgStore is nil (self-hosted
// deployment) the JWT must NOT carry an org_id.
func TestRegister_MultiTenant_SelfHosted_NoOrgInJWT(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, nil /* no orgStore */, nil, logger, AuthHandlerConfig{})

	mockUserStore.On("Create", mock.Anything, "selfhosted", "selfhosted", mock.AnythingOfType("string"), "user").
		Return(&userstore.User{ID: "sh-1", DisplayName: "selfhosted", Username: "selfhosted", Role: "user", IsActive: true}, nil)

	body, _ := json.Marshal(RegisterRequest{DisplayName: "selfhosted", Username: "selfhosted", Password: "password123"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	handler.Register()(rr, req)

	require.Equal(t, http.StatusCreated, rr.Code)
	var resp LoginResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))

	claims, err := tokenManager.ValidateToken(resp.Token)
	require.NoError(t, err)
	assert.Empty(t, claims.OrgID, "self-hosted JWT must not contain an org_id")

	mockUserStore.AssertExpectations(t)
}

func TestProvisionWorkspaceMember_EmbedsProvidedOrgID(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	handler := NewAuthHandler(tokenManager, new(MockUserStore), nil, nil, logger, AuthHandlerConfig{})

	resp, err := handler.provisionWorkspaceMember(context.Background(), &userstore.User{
		ID:          "member-user-1",
		DisplayName: "memberuser",
		Username:    "memberuser",
		Role:        "user",
	}, "org-join-1")
	require.NoError(t, err)
	require.NotNil(t, resp)

	claims, err := tokenManager.ValidateToken(resp.Token)
	require.NoError(t, err)
	assert.Equal(t, "org-join-1", claims.OrgID)
}

func TestProvisionWorkspaceMember_RequiresOrgID(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	handler := NewAuthHandler(tokenManager, new(MockUserStore), nil, nil, logger, AuthHandlerConfig{})

	resp, err := handler.provisionWorkspaceMember(context.Background(), &userstore.User{
		ID:          "member-user-1",
		DisplayName: "memberuser",
		Username:    "memberuser",
		Role:        "user",
	}, "")
	require.Nil(t, resp)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	require.NotNil(t, gqlErr.Extensions)
	assert.Equal(t, apperror.ErrInternalServer, gqlErr.Extensions["code"])
}

func TestResolvePrimaryOrgID_ReturnsEmptyWhenLookupFails(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	handler := NewAuthHandler(tokenManager, new(MockUserStore), &errOrgStore{msg: "db unavailable"}, nil, logger, AuthHandlerConfig{})

	orgID := handler.resolvePrimaryOrgID(context.Background(), "user-1")
	assert.Empty(t, orgID)
}

// TestLogin_MultiTenant_UserWithNoOrg — user successfully authenticates but has no
// org row yet (e.g. created before multi-tenant migration). The login should succeed
// and the JWT should carry an empty OrgID rather than failing.
func TestLogin_MultiTenant_UserWithNoOrg(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, &nilOrgStore{}, nil, logger, AuthHandlerConfig{})

	const userID = "no-org-user-1"
	hashedPassword, _ := auth.HashPassword("password123")

	mockUserStore.On("GetByUsername", mock.Anything, "noorger").Return(&model.User{
		ID: userID, DisplayName: "noorger", Username: "noorger",
		HashedPassword: hashedPassword, Role: "user", IsActive: true,
	}, nil)
	mockUserStore.On("UpdateLastLogin", mock.Anything, userID).Return(nil)

	body, _ := json.Marshal(LoginRequest{Username: "noorger", Password: "password123"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	handler.Login()(rr, req)

	// Login must succeed even though there is no org.
	require.Equal(t, http.StatusOK, rr.Code)
	var resp LoginResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))

	claims, err := tokenManager.ValidateToken(resp.Token)
	require.NoError(t, err)
	assert.Empty(t, claims.OrgID, "JWT should have empty org_id when user has no org")

	mockUserStore.AssertExpectations(t)
}

// TestLogin_MultiTenant_OrgLookupError — org lookup returns an error (e.g. DB timeout).
// Login should still succeed (graceful degradation) and the JWT should carry
// an empty OrgID; the error gets logged but is not surfaced to the client.
func TestLogin_MultiTenant_OrgLookupError(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore)
	handler := NewAuthHandler(tokenManager, mockUserStore, &errOrgStore{msg: "read timeout"}, nil, logger, AuthHandlerConfig{})

	const userID = "org-err-user-1"
	hashedPassword, _ := auth.HashPassword("password123")

	mockUserStore.On("GetByUsername", mock.Anything, "orgfail").Return(&model.User{
		ID: userID, DisplayName: "orgfail", Username: "orgfail",
		HashedPassword: hashedPassword, Role: "user", IsActive: true,
	}, nil)
	mockUserStore.On("UpdateLastLogin", mock.Anything, userID).Return(nil)

	body, _ := json.Marshal(LoginRequest{Username: "orgfail", Password: "password123"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	rr := httptest.NewRecorder()
	handler.Login()(rr, req)

	// Login must not fail because of an org lookup error.
	require.Equal(t, http.StatusOK, rr.Code)
	var resp LoginResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))

	claims, err := tokenManager.ValidateToken(resp.Token)
	require.NoError(t, err)
	assert.Empty(t, claims.OrgID, "JWT should degrade gracefully and carry empty org_id on lookup error")

	mockUserStore.AssertExpectations(t)
}

func TestCheckFirstRun(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)

	tests := []struct {
		name              string
		userCount         int
		multiTenant       bool
		expectFirstRun    bool
		expectMultiTenant bool
	}{
		{
			name:              "No users - first run, self-hosted",
			userCount:         0,
			multiTenant:       false,
			expectFirstRun:    true,
			expectMultiTenant: false,
		},
		{
			name:              "Users exist - not first run, self-hosted",
			userCount:         5,
			multiTenant:       false,
			expectFirstRun:    false,
			expectMultiTenant: false,
		},
		{
			name:              "No users - first run, multi-tenant",
			userCount:         0,
			multiTenant:       true,
			expectFirstRun:    true,
			expectMultiTenant: true,
		},
		{
			name:              "Users exist - not first run, multi-tenant",
			userCount:         3,
			multiTenant:       true,
			expectFirstRun:    false,
			expectMultiTenant: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockUserStore := new(MockUserStore)
			handler := NewAuthHandler(tokenManager, mockUserStore, nil, nil, logger, AuthHandlerConfig{MultiTenant: tt.multiTenant})

			mockUserStore.On("List", mock.Anything, 0, 1, "").Return([]*userstore.User{}, tt.userCount, nil)

			req := httptest.NewRequest(http.MethodGet, "/api/auth/first-run", nil)
			rr := httptest.NewRecorder()

			handler.CheckFirstRun()(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code)

			var response FirstRunResponse
			err := json.Unmarshal(rr.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.Equal(t, tt.expectFirstRun, response.IsFirstRun, "isFirstRun mismatch")
			assert.Equal(t, tt.expectMultiTenant, response.MultiTenant, "multiTenant mismatch")

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
		body           RegisterAdminRequest
		existingUsers  int
		expectedStatus int
		expectError    bool
		errorCode      string
		setupMocks     func()
	}{
		{
			name: "Valid admin registration with registry population (no language - defaults to en)",
			body: RegisterAdminRequest{
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

				// Expect registry population with default language only
				mockRegistryStore.On("SetMulti", mock.Anything, registrystore.SystemOwnerID, mock.MatchedBy(func(entries []*registrystore.Registry) bool {
					if len(entries) != 1 {
						return false
					}
					languageFound := false
					for _, entry := range entries {
						if entry.Key == "config.app_default_language" &&
							entry.Value == "en" &&
							!entry.IsEncrypted {
							languageFound = true
						}
					}
					return languageFound
				})).Return([]*registrystore.Registry{
					{Key: "config.app_default_language", Value: "en", IsEncrypted: false},
				}, nil)
			},
		},
		{
			name: "Admin registration with Chinese language",
			body: RegisterAdminRequest{
				DisplayName:     "administrator",
				Username:        "administrator",
				Password:        "securepassword123",
				DefaultLanguage: "zh-CN",
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

				// Expect registry population with zh-CN language
				mockRegistryStore.On("SetMulti", mock.Anything, registrystore.SystemOwnerID, mock.MatchedBy(func(entries []*registrystore.Registry) bool {
					languageFound := false
					for _, entry := range entries {
						if entry.Key == "config.app_default_language" &&
							entry.Value == "zh-CN" &&
							!entry.IsEncrypted {
							languageFound = true
						}
					}
					return languageFound && len(entries) == 1
				})).Return([]*registrystore.Registry{
					{Key: "config.app_default_language", Value: "zh-CN", IsEncrypted: false},
				}, nil)
			},
		},
		{
			name: "Admin registration with Italian language",
			body: RegisterAdminRequest{
				DisplayName:     "administrator",
				Username:        "administrator",
				Password:        "securepassword123",
				DefaultLanguage: "it",
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

				// Expect registry population with it language
				mockRegistryStore.On("SetMulti", mock.Anything, registrystore.SystemOwnerID, mock.MatchedBy(func(entries []*registrystore.Registry) bool {
					languageFound := false
					for _, entry := range entries {
						if entry.Key == "config.app_default_language" &&
							entry.Value == "it" &&
							!entry.IsEncrypted {
							languageFound = true
						}
					}
					return languageFound && len(entries) == 1
				})).Return([]*registrystore.Registry{
					{Key: "config.app_default_language", Value: "it", IsEncrypted: false},
				}, nil)
			},
		},
		{
			name: "Admin registration with empty language string (defaults to en)",
			body: RegisterAdminRequest{
				DisplayName:     "administrator",
				Username:        "administrator",
				Password:        "securepassword123",
				DefaultLanguage: "",
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

				// Expect registry population with default "en" language
				mockRegistryStore.On("SetMulti", mock.Anything, registrystore.SystemOwnerID, mock.MatchedBy(func(entries []*registrystore.Registry) bool {
					languageFound := false
					for _, entry := range entries {
						if entry.Key == "config.app_default_language" &&
							entry.Value == "en" &&
							!entry.IsEncrypted {
							languageFound = true
						}
					}
					return languageFound && len(entries) == 1
				})).Return([]*registrystore.Registry{
					{Key: "config.app_default_language", Value: "en", IsEncrypted: false},
				}, nil)
			},
		},
		{
			name: "Admin registration succeeds even if registry population fails",
			body: RegisterAdminRequest{
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
			body: RegisterAdminRequest{
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

			mockUserStore.On("List", mock.Anything, 0, 1, "").Return([]*userstore.User{}, tt.existingUsers, nil)
			tt.setupMocks()

			handler := NewAuthHandler(tokenManager, mockUserStore, nil, mockRegistryStore, logger, AuthHandlerConfig{})

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
			handler := NewAuthHandler(tokenManager, mockUserStore, nil, mockRegistryStore, logger, AuthHandlerConfig{EmbeddedMode: tt.embeddedMode})

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
