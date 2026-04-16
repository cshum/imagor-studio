package httphandler

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"go.uber.org/zap"
)

// OAuthHandler handles Google OAuth 2.0 flows.
type OAuthHandler struct {
	tokenManager       *auth.TokenManager
	userStore          userstore.Store
	orgStore           orgstore.Store // nil in self-hosted mode
	logger             *zap.Logger
	googleClientID     string
	googleClientSecret string
	appBaseURL         string
}

// NewOAuthHandler creates a new OAuthHandler.
func NewOAuthHandler(
	tokenManager *auth.TokenManager,
	userStore userstore.Store,
	orgStore orgstore.Store,
	logger *zap.Logger,
	googleClientID string,
	googleClientSecret string,
	appBaseURL string,
) *OAuthHandler {
	return &OAuthHandler{
		tokenManager:       tokenManager,
		userStore:          userStore,
		orgStore:           orgStore,
		logger:             logger,
		googleClientID:     googleClientID,
		googleClientSecret: googleClientSecret,
		appBaseURL:         appBaseURL,
	}
}

// GoogleAuthProviders returns a JSON list of configured OAuth providers.
// GET /api/auth/providers
func (h *OAuthHandler) GoogleAuthProviders() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if h.googleClientID != "" {
			w.Write([]byte(`{"providers":["google"]}`))
		} else {
			w.Write([]byte(`{"providers":[]}`))
		}
	}
}

// GoogleLogin redirects the user to the Google OAuth consent screen.
// GET /api/auth/google/login
func (h *OAuthHandler) GoogleLogin() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Generate a random state nonce.
		state := generateRandomState()

		// Store state in a short-lived cookie.
		http.SetCookie(w, &http.Cookie{
			Name:     "oauth_state",
			Value:    state,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   int((10 * time.Minute).Seconds()),
			Expires:  time.Now().Add(10 * time.Minute),
		})

		redirectURI := h.appBaseURL + "/api/auth/google/callback"

		params := url.Values{}
		params.Set("client_id", h.googleClientID)
		params.Set("redirect_uri", redirectURI)
		params.Set("response_type", "code")
		params.Set("scope", "openid email profile")
		params.Set("state", state)

		authURL := "https://accounts.google.com/o/oauth2/auth?" + params.Encode()
		http.Redirect(w, r, authURL, http.StatusFound)
	}
}

// GoogleCallback handles the OAuth callback from Google.
// GET /api/auth/google/callback
func (h *OAuthHandler) GoogleCallback() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// Validate state cookie.
		stateCookie, err := r.Cookie("oauth_state")
		if err != nil || stateCookie.Value == "" {
			h.logger.Warn("OAuth callback: missing state cookie")
			http.Error(w, "Invalid OAuth state", http.StatusBadRequest)
			return
		}

		stateParam := r.URL.Query().Get("state")
		if stateParam != stateCookie.Value {
			h.logger.Warn("OAuth callback: state mismatch",
				zap.String("cookie", stateCookie.Value),
				zap.String("param", stateParam))
			http.Error(w, "Invalid OAuth state", http.StatusBadRequest)
			return
		}

		// Clear the state cookie.
		http.SetCookie(w, &http.Cookie{
			Name:     "oauth_state",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   -1,
		})

		// Check for error from Google.
		if errParam := r.URL.Query().Get("error"); errParam != "" {
			h.logger.Warn("OAuth callback: error from Google", zap.String("error", errParam))
			http.Redirect(w, r, h.appBaseURL+"/auth/callback?error="+url.QueryEscape(errParam), http.StatusFound)
			return
		}

		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing authorization code", http.StatusBadRequest)
			return
		}

		// Exchange authorization code for tokens.
		redirectURI := h.appBaseURL + "/api/auth/google/callback"
		tokenResp, err := h.exchangeGoogleCode(code, redirectURI)
		if err != nil {
			h.logger.Error("OAuth callback: failed to exchange code", zap.Error(err))
			http.Error(w, "Failed to exchange authorization code", http.StatusInternalServerError)
			return
		}

		// Fetch userinfo from Google.
		userInfo, err := h.fetchGoogleUserInfo(tokenResp.AccessToken)
		if err != nil {
			h.logger.Error("OAuth callback: failed to fetch userinfo", zap.Error(err))
			http.Error(w, "Failed to fetch user info", http.StatusInternalServerError)
			return
		}

		// Upsert user in our database.
		user, err := h.userStore.UpsertOAuth(ctx, "google", userInfo.ID, userInfo.Email, userInfo.Name, userInfo.Picture)
		if err != nil {
			h.logger.Error("OAuth callback: failed to upsert user", zap.Error(err))
			http.Error(w, "Failed to create or update user", http.StatusInternalServerError)
			return
		}

		// Resolve org (multi-tenant mode only).
		orgID := ""
		if h.orgStore != nil {
			org, orgErr := h.orgStore.GetByUserID(ctx, user.ID)
			if orgErr != nil {
				h.logger.Warn("OAuth callback: failed to get org for user",
					zap.String("userID", user.ID), zap.Error(orgErr))
			} else if org == nil {
				// Auto-create a personal org for new OAuth users.
				trialEndsAt := time.Now().UTC().Add(14 * 24 * time.Hour)
				newOrg, createErr := h.orgStore.CreateWithMember(ctx, user.ID, user.DisplayName, user.Username, &trialEndsAt)
				if createErr != nil {
					h.logger.Warn("OAuth callback: failed to create org for user",
						zap.String("userID", user.ID), zap.Error(createErr))
				} else {
					orgID = newOrg.ID
				}
			} else {
				orgID = org.ID
			}
		}

		// Generate JWT.
		scopes := []string{"read", "write"}
		if user.Role == "admin" {
			scopes = append(scopes, "admin")
		}

		var token string
		if orgID != "" {
			token, err = h.tokenManager.GenerateTokenForUser(user.ID, user.Role, scopes, orgID)
		} else {
			token, err = h.tokenManager.GenerateToken(user.ID, user.Role, scopes, "")
		}
		if err != nil {
			h.logger.Error("OAuth callback: failed to generate token", zap.Error(err))
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}

		expiresIn := h.tokenManager.TokenDuration().Milliseconds() / 1000

		// Redirect to frontend with token.
		frontendURL := h.appBaseURL + "/auth/callback?token=" + url.QueryEscape(token) +
			"&expires_in=" + strconv.FormatInt(expiresIn, 10)
		http.Redirect(w, r, frontendURL, http.StatusFound)
	}
}

// googleTokenResponse is the response from Google's token endpoint.
type googleTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
}

// googleUserInfo is the response from Google's userinfo endpoint.
type googleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

// exchangeGoogleCode exchanges an authorization code for access/id tokens.
func (h *OAuthHandler) exchangeGoogleCode(code, redirectURI string) (*googleTokenResponse, error) {
	formData := url.Values{}
	formData.Set("code", code)
	formData.Set("client_id", h.googleClientID)
	formData.Set("client_secret", h.googleClientSecret)
	formData.Set("redirect_uri", redirectURI)
	formData.Set("grant_type", "authorization_code")

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", formData)
	if err != nil {
		return nil, fmt.Errorf("token exchange request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token exchange returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp googleTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w", err)
	}
	return &tokenResp, nil
}

// fetchGoogleUserInfo fetches user profile from Google's userinfo endpoint.
func (h *OAuthHandler) fetchGoogleUserInfo(accessToken string) (*googleUserInfo, error) {
	req, err := http.NewRequest(http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("userinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read userinfo response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo returned %d: %s", resp.StatusCode, string(body))
	}

	var info googleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("failed to decode userinfo response: %w", err)
	}
	return &info, nil
}

// generateRandomState generates a cryptographically random 16-byte hex state string.
func generateRandomState() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fallback to timestamp-based state (shouldn't happen in practice).
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("%x", b)
}
