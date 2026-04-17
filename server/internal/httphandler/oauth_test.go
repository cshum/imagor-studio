package httphandler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
)

// newTestOAuthHandler is a helper that builds an OAuthHandler with sensible
// test defaults.  Pass googleClientID="" to simulate "no provider configured".
func newTestOAuthHandler(t *testing.T, googleClientID string) *OAuthHandler {
	t.Helper()
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	mockUserStore := new(MockUserStore) // defined in auth_test.go (same package)
	return NewOAuthHandler(
		tokenManager,
		mockUserStore,
		nil, // no orgStore
		nil, // no spaceStore
		nil, // no inviteStore
		logger,
		googleClientID,
		"test-client-secret",
		"http://localhost:3000",
		"", // appApiBaseURL: empty = same as appBaseURL (single-domain test setup)
	)
}

// TestGoogleAuthProviders_WithClientID — when googleClientID is non-empty,
// GET /api/auth/providers returns {"providers":["google"]} with status 200.
func TestGoogleAuthProviders_WithClientID(t *testing.T) {
	h := newTestOAuthHandler(t, "my-google-client-id")

	req := httptest.NewRequest(http.MethodGet, "/api/auth/providers", nil)
	rr := httptest.NewRecorder()

	h.GoogleAuthProviders()(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	assert.Equal(t, `{"providers":["google"]}`, strings.TrimSpace(rr.Body.String()))
}

// TestGoogleAuthProviders_WithoutClientID — when googleClientID is empty,
// GET /api/auth/providers returns {"providers":[]} with status 200.
func TestGoogleAuthProviders_WithoutClientID(t *testing.T) {
	h := newTestOAuthHandler(t, "")

	req := httptest.NewRequest(http.MethodGet, "/api/auth/providers", nil)
	rr := httptest.NewRecorder()

	h.GoogleAuthProviders()(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	assert.Equal(t, `{"providers":[]}`, strings.TrimSpace(rr.Body.String()))
}

// TestGoogleLogin_RedirectsToGoogle — when googleClientID is set,
// GET /api/auth/google/login returns 302 redirect to accounts.google.com
// and sets the oauth_state cookie.
func TestGoogleLogin_RedirectsToGoogle(t *testing.T) {
	h := newTestOAuthHandler(t, "my-google-client-id")

	req := httptest.NewRequest(http.MethodGet, "/api/auth/google/login", nil)
	rr := httptest.NewRecorder()

	h.GoogleLogin()(rr, req)

	require.Equal(t, http.StatusFound, rr.Code)

	location := rr.Header().Get("Location")
	assert.Contains(t, location, "accounts.google.com", "redirect should point to Google")
	assert.Contains(t, location, "my-google-client-id", "redirect URL should include client_id")

	// Verify the oauth_state cookie was set.
	cookies := rr.Result().Cookies()
	var stateCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "oauth_state" {
			stateCookie = c
			break
		}
	}
	require.NotNil(t, stateCookie, "oauth_state cookie must be set")
	assert.NotEmpty(t, stateCookie.Value, "oauth_state cookie value must not be empty")
	assert.True(t, stateCookie.HttpOnly, "oauth_state cookie must be HttpOnly")
}

// TestGoogleCallback_MissingStateCookie — GET /api/auth/google/callback?code=x&state=y
// without the oauth_state cookie returns 400.
func TestGoogleCallback_MissingStateCookie(t *testing.T) {
	h := newTestOAuthHandler(t, "my-google-client-id")

	req := httptest.NewRequest(http.MethodGet, "/api/auth/google/callback?code=authcode&state=somestate", nil)
	// No cookie set — simulates a missing / expired state cookie.
	rr := httptest.NewRecorder()

	h.GoogleCallback()(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid OAuth state")
}

// TestGoogleCallback_StateMismatch — the oauth_state cookie value differs from
// the state query parameter — returns 400.
func TestGoogleCallback_StateMismatch(t *testing.T) {
	h := newTestOAuthHandler(t, "my-google-client-id")

	req := httptest.NewRequest(http.MethodGet, "/api/auth/google/callback?code=authcode&state=bad-state", nil)
	req.AddCookie(&http.Cookie{
		Name:  "oauth_state",
		Value: "correct-state",
	})
	rr := httptest.NewRecorder()

	h.GoogleCallback()(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid OAuth state")
}

// ── Full callback flow integration tests ────────────────────────────────────

// mockGoogleServer creates an httptest.Server that serves:
//   - POST /token  → returns a fake bearer token
//   - GET  /userinfo → returns fake user profile JSON
func mockGoogleServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/token":
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token": "fake-access-token",
				"token_type":   "bearer",
				"expires_in":   3600,
			})
		case "/userinfo":
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"id":             "google-uid-123",
				"email":          "test@example.com",
				"verified_email": true,
				"name":           "Test User",
				"picture":        "https://example.com/pic.jpg",
			})
		default:
			http.NotFound(w, r)
		}
	}))
}

// buildTestOAuthConfig returns an *oauth2.Config whose token endpoint is the
// given mockServerURL so that code-exchange calls hit the local test server.
func buildTestOAuthConfig(mockServerURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     "test-client-id",
		ClientSecret: "test-client-secret",
		RedirectURL:  "http://localhost/api/auth/google/callback",
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  mockServerURL + "/auth",
			TokenURL: mockServerURL + "/token",
		},
	}
}

// oauthCallbackRequest builds a test HTTP request that simulates the Google
// callback.  It pre-loads the oauth2.HTTPClient context key so that all HTTP
// calls made by the oauth2 library (token exchange + userinfo) are routed
// through mockGoogle.Client() instead of the real internet.
func oauthCallbackRequest(mockGoogle *httptest.Server, state string) *http.Request {
	req := httptest.NewRequest(
		http.MethodGet,
		"/api/auth/google/callback?code=fake-code&state="+state,
		nil,
	)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: state})
	// Inject the test server's HTTP client so oauth2 uses the mock for ALL requests.
	ctx := context.WithValue(req.Context(), oauth2.HTTPClient, mockGoogle.Client())
	return req.WithContext(ctx)
}

// TestGoogleCallback_FullFlow_SelfHosted verifies the happy-path callback in
// self-hosted mode (no orgStore).  Expects a 302 redirect to /auth/callback
// with a valid token= query parameter and no error= parameter.
func TestGoogleCallback_FullFlow_SelfHosted(t *testing.T) {
	mockGoogle := mockGoogleServer(t)
	defer mockGoogle.Close()

	tm := auth.NewTokenManager("test-secret", 24*time.Hour)

	upsertedUser := &userstore.User{
		ID:          "user-selfhosted-1",
		DisplayName: "Test User",
		Username:    "testuser",
		Role:        "user",
		IsActive:    true,
	}
	ms := new(MockUserStore)
	ms.On(
		"UpsertOAuth",
		mock.Anything,
		"google", "google-uid-123", "test@example.com", "Test User", "https://example.com/pic.jpg",
	).Return(upsertedUser, nil)

	handler := newOAuthHandlerWithConfig(
		tm, ms, nil, nil, nil, zap.NewNop(),
		buildTestOAuthConfig(mockGoogle.URL),
		"http://localhost",
		mockGoogle.URL+"/userinfo",
	)

	rr := httptest.NewRecorder()
	handler.GoogleCallback()(rr, oauthCallbackRequest(mockGoogle, "test-state-sh"))

	require.Equal(t, http.StatusFound, rr.Code, "expected redirect")

	location := rr.Header().Get("Location")
	assert.Contains(t, location, "token=", "redirect URL must include token param")
	assert.NotContains(t, location, "error=", "redirect URL must not include error param")

	// Decode and validate the embedded JWT.
	parsed, err := url.ParseRequestURI(location)
	require.NoError(t, err)
	rawToken, err := url.QueryUnescape(parsed.Query().Get("token"))
	require.NoError(t, err)
	require.NotEmpty(t, rawToken)

	claims, err := tm.ValidateToken(rawToken)
	require.NoError(t, err)
	assert.Equal(t, upsertedUser.ID, claims.UserID)
	assert.Equal(t, "user", claims.Role)
	assert.Contains(t, claims.Scopes, "read")
	assert.Contains(t, claims.Scopes, "write")
	assert.Empty(t, claims.OrgID, "self-hosted token must not carry org_id")

	ms.AssertExpectations(t)
}

// TestGoogleCallback_FullFlow_MultiTenant verifies the happy-path callback in
// multi-tenant mode (orgStore wired).  A new org should be created and the
// returned JWT must embed an org_id.
func TestGoogleCallback_FullFlow_MultiTenant(t *testing.T) {
	mockGoogle := mockGoogleServer(t)
	defer mockGoogle.Close()

	tm := auth.NewTokenManager("test-secret", 24*time.Hour)

	upsertedUser := &userstore.User{
		ID:          "user-mt-1",
		DisplayName: "Test User",
		Username:    "testuser",
		Role:        "user",
		IsActive:    true,
	}
	ms := new(MockUserStore)
	ms.On(
		"UpsertOAuth",
		mock.Anything,
		"google", "google-uid-123", "test@example.com", "Test User", "https://example.com/pic.jpg",
	).Return(upsertedUser, nil)
	// The org was just created, so the new owner is promoted to admin.
	ms.On("UpdateRole", mock.Anything, upsertedUser.ID, "admin").Return(nil)

	// Use a real in-memory orgStore (same helper used by auth_test.go).
	os := orgstore.New(newOrgTestDB(t))

	handler := newOAuthHandlerWithConfig(
		tm, ms, os, nil, nil, zap.NewNop(),
		buildTestOAuthConfig(mockGoogle.URL),
		"http://localhost",
		mockGoogle.URL+"/userinfo",
	)

	rr := httptest.NewRecorder()
	handler.GoogleCallback()(rr, oauthCallbackRequest(mockGoogle, "test-state-mt"))

	require.Equal(t, http.StatusFound, rr.Code, "expected redirect")

	location := rr.Header().Get("Location")
	assert.Contains(t, location, "token=", "redirect URL must include token param")
	assert.NotContains(t, location, "error=", "redirect URL must not include error param")

	// Decode and validate the JWT.
	parsed, err := url.ParseRequestURI(location)
	require.NoError(t, err)
	rawToken, err := url.QueryUnescape(parsed.Query().Get("token"))
	require.NoError(t, err)
	require.NotEmpty(t, rawToken)

	claims, err := tm.ValidateToken(rawToken)
	require.NoError(t, err)
	assert.Equal(t, upsertedUser.ID, claims.UserID)
	// The user was the first member of a new org, so they are promoted to admin.
	assert.Equal(t, "admin", claims.Role)
	assert.Contains(t, claims.Scopes, "read")
	assert.Contains(t, claims.Scopes, "write")
	assert.Contains(t, claims.Scopes, "admin")
	assert.NotEmpty(t, claims.OrgID, "multi-tenant token must carry org_id")

	// Confirm the org was persisted.
	org, err := os.GetByUserID(context.Background(), upsertedUser.ID)
	require.NoError(t, err)
	require.NotNil(t, org)
	assert.Equal(t, claims.OrgID, org.ID)

	ms.AssertExpectations(t)
}

// TestGoogleCallback_FullFlow_AdminRole verifies that an admin user's token
// includes the "admin" scope in addition to "read" and "write".
func TestGoogleCallback_FullFlow_AdminRole(t *testing.T) {
	mockGoogle := mockGoogleServer(t)
	defer mockGoogle.Close()

	tm := auth.NewTokenManager("test-secret", 24*time.Hour)

	adminUser := &userstore.User{
		ID:          "admin-1",
		DisplayName: "Admin User",
		Username:    "adminuser",
		Role:        "admin",
		IsActive:    true,
	}
	ms := new(MockUserStore)
	ms.On(
		"UpsertOAuth",
		mock.Anything,
		"google", "google-uid-123", "test@example.com", "Test User", "https://example.com/pic.jpg",
	).Return(adminUser, nil)

	handler := newOAuthHandlerWithConfig(
		tm, ms, nil, nil, nil, zap.NewNop(),
		buildTestOAuthConfig(mockGoogle.URL),
		"http://localhost",
		mockGoogle.URL+"/userinfo",
	)

	rr := httptest.NewRecorder()
	handler.GoogleCallback()(rr, oauthCallbackRequest(mockGoogle, "test-state-admin"))

	require.Equal(t, http.StatusFound, rr.Code)

	location := rr.Header().Get("Location")
	parsed, err := url.ParseRequestURI(location)
	require.NoError(t, err)
	rawToken, err := url.QueryUnescape(parsed.Query().Get("token"))
	require.NoError(t, err)

	claims, err := tm.ValidateToken(rawToken)
	require.NoError(t, err)
	assert.Equal(t, "admin", claims.Role)
	assert.Contains(t, claims.Scopes, "admin", "admin user must have admin scope")

	ms.AssertExpectations(t)
}

// TestGoogleCallback_FullFlow_GoogleErrorParam verifies that an error query
// param forwarded from Google results in a redirect to /auth/callback?error=…
func TestGoogleCallback_FullFlow_GoogleErrorParam(t *testing.T) {
	// No actual Google calls happen here — the handler aborts before exchange.
	tm := auth.NewTokenManager("test-secret", 24*time.Hour)
	ms := new(MockUserStore)

	mockGoogle := mockGoogleServer(t)
	defer mockGoogle.Close()

	handler := newOAuthHandlerWithConfig(
		tm, ms, nil, nil, nil, zap.NewNop(),
		buildTestOAuthConfig(mockGoogle.URL),
		"http://localhost",
		mockGoogle.URL+"/userinfo",
	)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/auth/google/callback?error=access_denied&state=err-state",
		nil,
	)
	req.AddCookie(&http.Cookie{Name: "oauth_state", Value: "err-state"})
	ctx := context.WithValue(req.Context(), oauth2.HTTPClient, mockGoogle.Client())
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.GoogleCallback()(rr, req)

	require.Equal(t, http.StatusFound, rr.Code)
	location := rr.Header().Get("Location")
	assert.Contains(t, location, "error=", "should redirect with error param")
	assert.Contains(t, location, "access_denied", "should relay the Google error")
	assert.NotContains(t, location, "token=", "must not issue a token on error")
}

// TestGoogleCallback_FullFlow_UpsertFails verifies that when UpsertOAuth
// returns an error the handler redirects with error=oauth_failed.
func TestGoogleCallback_FullFlow_UpsertFails(t *testing.T) {
	mockGoogle := mockGoogleServer(t)
	defer mockGoogle.Close()

	tm := auth.NewTokenManager("test-secret", 24*time.Hour)
	ms := new(MockUserStore)
	ms.On("UpsertOAuth", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return((*userstore.User)(nil), assert.AnError)

	handler := newOAuthHandlerWithConfig(
		tm, ms, nil, nil, nil, zap.NewNop(),
		buildTestOAuthConfig(mockGoogle.URL),
		"http://localhost",
		mockGoogle.URL+"/userinfo",
	)

	rr := httptest.NewRecorder()
	handler.GoogleCallback()(rr, oauthCallbackRequest(mockGoogle, "test-state-fail"))

	require.Equal(t, http.StatusFound, rr.Code)
	location := rr.Header().Get("Location")
	assert.Contains(t, location, "error=oauth_failed")
	assert.NotContains(t, location, "token=")

	ms.AssertExpectations(t)
}
