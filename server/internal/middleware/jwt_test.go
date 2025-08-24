package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/resolver"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTMiddleware(t *testing.T) {
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)

	// Generate a valid token
	userID := "test-user-id"
	token, err := tokenManager.GenerateToken(userID, "user", []string{"read"})
	require.NoError(t, err)

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
		expectedError  apperror.ErrorCode
		setupRequest   func(*http.Request)
	}{
		{
			name:           "Valid token",
			authHeader:     "Bearer " + token,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Missing Authorization header",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  apperror.ErrInvalidToken,
		},
		{
			name:           "Invalid header format",
			authHeader:     "InvalidFormat " + token,
			expectedStatus: http.StatusUnauthorized,
			expectedError:  apperror.ErrInvalidToken,
		},
		{
			name:           "Invalid token",
			authHeader:     "Bearer invalid.token.here",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  apperror.ErrInvalidToken,
		},
		{
			name:           "Expired token",
			authHeader:     "Bearer " + generateExpiredToken(t),
			expectedStatus: http.StatusUnauthorized,
			expectedError:  apperror.ErrTokenExpired,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Check if context has claims
				claims, err := auth.GetClaimsFromContext(r.Context())
				if tt.expectedStatus == http.StatusOK {
					require.NoError(t, err)
					assert.Equal(t, userID, claims.UserID)
				}

				// Check if context has owner ID
				ownerID, err := resolver.GetOwnerIDFromContext(r.Context())
				if tt.expectedStatus == http.StatusOK {
					require.NoError(t, err)
					assert.Equal(t, userID, ownerID)
				}

				w.WriteHeader(http.StatusOK)
			})

			middleware := JWTMiddleware(tokenManager)
			wrappedHandler := middleware(handler)

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			if tt.setupRequest != nil {
				tt.setupRequest(req)
			}

			rr := httptest.NewRecorder()
			wrappedHandler.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectedError != "" {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedError, errResp.Error.Code)
			}
		})
	}
}

func TestAuthorizationMiddleware(t *testing.T) {
	tests := []struct {
		name           string
		requiredScope  string
		userScopes     []string
		expectedStatus int
		expectedError  apperror.ErrorCode
	}{
		{
			name:           "User has required scope",
			requiredScope:  "read",
			userScopes:     []string{"read", "write"},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "User missing required scope",
			requiredScope:  "admin",
			userScopes:     []string{"read", "write"},
			expectedStatus: http.StatusForbidden,
			expectedError:  apperror.ErrPermissionDenied,
		},
		{
			name:           "Empty user scopes",
			requiredScope:  "read",
			userScopes:     []string{},
			expectedStatus: http.StatusForbidden,
			expectedError:  apperror.ErrPermissionDenied,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			middleware := AuthorizationMiddleware(tt.requiredScope)
			wrappedHandler := middleware(handler)

			// Create request with claims in context
			req := httptest.NewRequest(http.MethodGet, "/test", nil)

			claims := &auth.Claims{
				UserID: "test-user",
				Scopes: tt.userScopes,
			}
			ctx := auth.SetClaimsInContext(req.Context(), claims)
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			wrappedHandler.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectedError != "" {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedError, errResp.Error.Code)
				assert.Contains(t, errResp.Error.Details["requiredScope"], tt.requiredScope)
			}
		})
	}
}

func TestAuthorizationMiddleware_NoClaimsInContext(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := AuthorizationMiddleware("read")
	wrappedHandler := middleware(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)

	var errResp apperror.ErrorResponse
	err := json.Unmarshal(rr.Body.Bytes(), &errResp)
	require.NoError(t, err)
	assert.Equal(t, apperror.ErrUnauthorized, errResp.Error.Code)
}

// Helper function to generate expired token for testing
func generateExpiredToken(t *testing.T) string {
	// Create a token manager with negative duration to generate expired token
	expiredTM := auth.NewTokenManager("test-secret", -time.Hour)
	token, err := expiredTM.GenerateToken("user1", "user", []string{"read"})
	require.NoError(t, err)
	return token
}
