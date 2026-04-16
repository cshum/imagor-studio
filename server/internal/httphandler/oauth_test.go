package httphandler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
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
		logger,
		googleClientID,
		"test-client-secret",
		"http://localhost:3000",
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
