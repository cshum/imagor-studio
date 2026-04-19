package httphandler

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/apperror"
	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/cloudmode"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// OAuthHandler handles Google OAuth 2.0 flows.
type OAuthHandler struct {
	tokenManager *auth.TokenManager
	userStore    userstore.Store
	orgStore     cloudcontract.OrgStore // nil in self-hosted mode
	spaceStore   cloudcontract.SpaceStore
	inviteStore  cloudcontract.SpaceInviteStore
	logger       *zap.Logger
	googleConfig *oauth2.Config
	appBaseURL   string
	userinfoURL  string
}

// NewOAuthHandler creates a new OAuthHandler.
//
// appBaseURL is the frontend URL used for the post-auth redirect to /auth/callback.
// appApiBaseURL is the backend server URL used for the Google OAuth redirect URI
// registration (/api/auth/google/callback).  When empty it falls back to appBaseURL,
// which is correct for single-domain deployments where frontend and API share the same host.
func NewOAuthHandler(
	tokenManager *auth.TokenManager,
	userStore userstore.Store,
	orgStore cloudcontract.OrgStore,
	spaceStore cloudcontract.SpaceStore,
	inviteStore cloudcontract.SpaceInviteStore,
	logger *zap.Logger,
	googleClientID string,
	googleClientSecret string,
	appBaseURL string,
	appApiBaseURL string,
) *OAuthHandler {
	// Determine the base URL to use for the server-side OAuth redirect URI.
	// Falls back to appBaseURL when both share the same domain (default case).
	apiBase := appApiBaseURL
	if apiBase == "" {
		apiBase = appBaseURL
	}
	var googleConfig *oauth2.Config
	if googleClientID != "" {
		googleConfig = &oauth2.Config{
			ClientID:     googleClientID,
			ClientSecret: googleClientSecret,
			RedirectURL:  apiBase + "/api/auth/google/callback",
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		}
	}
	return &OAuthHandler{
		tokenManager: tokenManager,
		userStore:    userStore,
		orgStore:     orgStore,
		spaceStore:   spaceStore,
		inviteStore:  inviteStore,
		logger:       logger,
		googleConfig: googleConfig,
		appBaseURL:   appBaseURL,
		userinfoURL:  "https://www.googleapis.com/oauth2/v2/userinfo",
	}
}

// newOAuthHandlerWithConfig constructs an OAuthHandler directly from a pre-built
// *oauth2.Config.  It is intended for use in tests only (package-private).
func newOAuthHandlerWithConfig(
	tokenManager *auth.TokenManager,
	userStore userstore.Store,
	orgStore cloudcontract.OrgStore,
	spaceStore cloudcontract.SpaceStore,
	inviteStore cloudcontract.SpaceInviteStore,
	logger *zap.Logger,
	googleConfig *oauth2.Config,
	appBaseURL string,
	userinfoURL string,
) *OAuthHandler {
	return &OAuthHandler{
		tokenManager: tokenManager,
		userStore:    userStore,
		orgStore:     orgStore,
		spaceStore:   spaceStore,
		inviteStore:  inviteStore,
		logger:       logger,
		googleConfig: googleConfig,
		appBaseURL:   appBaseURL,
		userinfoURL:  userinfoURL,
	}
}

func (h *OAuthHandler) cloudEnabled() bool {
	return cloudmode.CloudEnabled(h.orgStore, h.spaceStore)
}

func (h *OAuthHandler) inviteFlowEnabled() bool {
	return cloudmode.InviteEnabled(h.orgStore, h.spaceStore, h.inviteStore, nil)
}

// AuthProvidersResponse is the typed response for the providers endpoint.
type AuthProvidersResponse struct {
	Providers []string `json:"providers"`
}

// GoogleAuthProviders returns a JSON list of configured OAuth providers.
// GET /api/auth/providers
func (h *OAuthHandler) GoogleAuthProviders() http.HandlerFunc {
	return Handle(http.MethodGet, func(w http.ResponseWriter, r *http.Request) error {
		if h.googleConfig != nil {
			return WriteSuccess(w, AuthProvidersResponse{Providers: []string{"google"}})
		}
		return WriteSuccess(w, AuthProvidersResponse{Providers: []string{}})
	})
}

// GoogleLogin redirects the user to the Google OAuth consent screen.
// GET /api/auth/google/login
func (h *OAuthHandler) GoogleLogin() http.HandlerFunc {
	return Handle(http.MethodGet, func(w http.ResponseWriter, r *http.Request) error {
		if h.googleConfig == nil {
			return apperror.NotFound("OAuth not configured")
		}

		// Generate a random state nonce.
		state := generateRandomState()

		// Store state in a short-lived cookie.
		http.SetCookie(w, &http.Cookie{
			Name:     "oauth_state",
			Value:    state,
			Path:     "/",
			HttpOnly: true,
			Secure:   strings.HasPrefix(h.appBaseURL, "https://"),
			SameSite: http.SameSiteLaxMode,
			MaxAge:   int((10 * time.Minute).Seconds()),
			Expires:  time.Now().Add(10 * time.Minute),
		})

		if inviteToken := strings.TrimSpace(r.URL.Query().Get("invite_token")); inviteToken != "" {
			http.SetCookie(w, &http.Cookie{
				Name:     "oauth_invite_token",
				Value:    inviteToken,
				Path:     "/",
				HttpOnly: true,
				Secure:   strings.HasPrefix(h.appBaseURL, "https://"),
				SameSite: http.SameSiteLaxMode,
				MaxAge:   int((30 * time.Minute).Seconds()),
				Expires:  time.Now().Add(30 * time.Minute),
			})
		}

		authURL := h.googleConfig.AuthCodeURL(state, oauth2.AccessTypeOnline)
		http.Redirect(w, r, authURL, http.StatusFound)
		return nil
	})
}

// GoogleCallback handles the OAuth callback from Google.
// GET /api/auth/google/callback
func (h *OAuthHandler) GoogleCallback() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		if h.googleConfig == nil {
			http.Redirect(w, r, h.appBaseURL+"/auth/callback?error="+url.QueryEscape("oauth_not_configured"), http.StatusFound)
			return
		}

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

		// Exchange authorization code for tokens using the oauth2 library.
		token, err := h.googleConfig.Exchange(ctx, code)
		if err != nil {
			h.logger.Error("OAuth callback: failed to exchange code", zap.Error(err))
			http.Redirect(w, r, h.appBaseURL+"/auth/callback?error="+url.QueryEscape("oauth_failed"), http.StatusFound)
			return
		}

		// Fetch userinfo using the oauth2 HTTP client.
		userInfo, err := h.fetchGoogleUserInfo(ctx, token)
		if err != nil {
			h.logger.Error("OAuth callback: failed to fetch userinfo", zap.Error(err))
			http.Redirect(w, r, h.appBaseURL+"/auth/callback?error="+url.QueryEscape("oauth_failed"), http.StatusFound)
			return
		}

		// Upsert user in our database.
		user, err := h.userStore.UpsertOAuth(ctx, "google", userInfo.ID, userInfo.Email, userInfo.Name, userInfo.Picture)
		if err != nil {
			h.logger.Error("OAuth callback: failed to upsert user", zap.Error(err))
			http.Redirect(w, r, h.appBaseURL+"/auth/callback?error="+url.QueryEscape("oauth_failed"), http.StatusFound)
			return
		}

		inviteToken := ""
		if inviteCookie, cookieErr := r.Cookie("oauth_invite_token"); cookieErr == nil {
			inviteToken = strings.TrimSpace(inviteCookie.Value)
		}
		http.SetCookie(w, &http.Cookie{
			Name:     "oauth_invite_token",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   -1,
		})

		var pendingInvite *cloudcontract.Invitation
		if inviteToken != "" && h.inviteFlowEnabled() {
			invite, inviteErr := h.inviteStore.GetPendingByToken(ctx, inviteToken)
			if inviteErr != nil {
				h.logger.Error("OAuth callback: failed to load invitation", zap.Error(inviteErr))
				http.Redirect(w, r, h.appBaseURL+"/auth/callback?error="+url.QueryEscape("invite_failed"), http.StatusFound)
				return
			}
			pendingInvite = invite
		}

		// Resolve org (multi-tenant mode only).
		orgID := ""
		if h.cloudEnabled() {
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
					// The org creator is the owner — promote them to admin.
					if roleErr := h.userStore.UpdateRole(ctx, user.ID, "admin"); roleErr != nil {
						h.logger.Warn("OAuth callback: failed to set admin role for org owner",
							zap.String("userID", user.ID), zap.Error(roleErr))
					} else {
						user.Role = "admin"
					}
				}
			} else {
				orgID = org.ID
			}
		}

		if pendingInvite != nil {
			if acceptErr := h.acceptInvitation(ctx, user.ID, pendingInvite); acceptErr != nil {
				h.logger.Error("OAuth callback: failed to accept invitation", zap.Error(acceptErr))
				http.Redirect(w, r, h.appBaseURL+"/auth/callback?error="+url.QueryEscape("invite_failed"), http.StatusFound)
				return
			}
		}

		// Generate JWT.
		scopes := []string{"read", "write"}
		if user.Role == "admin" {
			scopes = append(scopes, "admin")
		}

		var jwtToken string
		if orgID != "" {
			jwtToken, err = h.tokenManager.GenerateTokenForUser(user.ID, user.Role, scopes, orgID)
		} else {
			jwtToken, err = h.tokenManager.GenerateToken(user.ID, user.Role, scopes, "")
		}
		if err != nil {
			h.logger.Error("OAuth callback: failed to generate token", zap.Error(err))
			http.Redirect(w, r, h.appBaseURL+"/auth/callback?error="+url.QueryEscape("oauth_failed"), http.StatusFound)
			return
		}

		expiresIn := h.tokenManager.TokenDuration().Milliseconds() / 1000

		// Redirect to frontend with token.
		frontendURL := h.appBaseURL + "/auth/callback?token=" + url.QueryEscape(jwtToken) +
			"&expires_in=" + strconv.FormatInt(expiresIn, 10)
		http.Redirect(w, r, frontendURL, http.StatusFound)
	}
}

func (h *OAuthHandler) acceptInvitation(ctx context.Context, userID string, invite *cloudcontract.Invitation) error {
	hasSpaceAccess, err := h.spaceStore.HasMember(ctx, invite.SpaceKey, userID)
	if err != nil {
		return fmt.Errorf("check space membership: %w", err)
	}
	if !hasSpaceAccess {
		if err := h.spaceStore.AddMember(ctx, invite.SpaceKey, userID, invite.Role); err != nil {
			return fmt.Errorf("add invited user to space: %w", err)
		}
	}

	if err := h.inviteStore.MarkAccepted(ctx, invite.ID, time.Now().UTC()); err != nil {
		return fmt.Errorf("mark invitation accepted: %w", err)
	}
	return nil
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

// fetchGoogleUserInfo fetches user profile from Google's userinfo endpoint
// using the oauth2-authenticated HTTP client.
func (h *OAuthHandler) fetchGoogleUserInfo(ctx context.Context, token *oauth2.Token) (*googleUserInfo, error) {
	client := h.googleConfig.Client(ctx, token)
	resp, err := client.Get(h.userinfoURL)
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
