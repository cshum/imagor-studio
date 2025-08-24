package middleware

import (
	"net/http"
	"strings"

	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/resolver"
)

// JWTMiddleware creates a JWT authentication middleware
func JWTMiddleware(tokenManager *auth.TokenManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract token from Authorization header
			authHeader := r.Header.Get("Authorization")

			token, err := auth.ExtractTokenFromHeader(authHeader)
			if err != nil {
				apperror.WriteErrorResponse(w, http.StatusUnauthorized,
					apperror.ErrInvalidToken,
					"Authorization header is missing or invalid",
					map[string]interface{}{
						"error": err.Error(),
					})
				return
			}

			// Validate token
			claims, err := tokenManager.ValidateToken(token)
			if err != nil {
				// Check if it's a token expired error
				if strings.Contains(err.Error(), "token is expired") {
					apperror.WriteErrorResponse(w, http.StatusUnauthorized,
						apperror.ErrTokenExpired,
						"Token has expired",
						nil)
					return
				}

				apperror.WriteErrorResponse(w, http.StatusUnauthorized,
					apperror.ErrInvalidToken,
					"Invalid or expired token",
					map[string]interface{}{
						"error": err.Error(),
					})
				return
			}

			// Add claims to context
			ctx := auth.SetClaimsInContext(r.Context(), claims)

			// Add owner ID to context (using user ID from claims)
			ctx = resolver.WithUserID(ctx, claims.UserID)

			// Pass the request with the new context
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// AuthorizationMiddleware checks if the user has the required scope
func AuthorizationMiddleware(requiredScope string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := auth.GetClaimsFromContext(r.Context())
			if err != nil {
				apperror.WriteErrorResponse(w, http.StatusUnauthorized,
					apperror.ErrUnauthorized,
					"Unauthorized access",
					nil)
				return
			}

			// Check if user has the required scope
			hasScope := false
			for _, scope := range claims.Scopes {
				if scope == requiredScope {
					hasScope = true
					break
				}
			}

			if !hasScope {
				apperror.WriteErrorResponse(w, http.StatusForbidden,
					apperror.ErrPermissionDenied,
					"insufficient permission",
					map[string]interface{}{
						"requiredScope": requiredScope,
						"userScopes":    claims.Scopes,
					})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
