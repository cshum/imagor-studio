package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// EmbeddedJWTClaims represents the JWT claims for embedded mode
type EmbeddedJWTClaims struct {
	Image       string   `json:"image"`       // Image path
	Permissions []string `json:"permissions"` // Optional permissions
	jwt.RegisteredClaims
}

// EmbeddedJWTMiddleware validates JWT tokens for embedded mode
func EmbeddedJWTMiddleware(jwtSecret string, logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get token from query parameter
			token := r.URL.Query().Get("token")
			if token == "" {
				writeEmbeddedError(w, "missing token parameter", http.StatusUnauthorized)
				return
			}

			// Parse and validate JWT
			claims := &EmbeddedJWTClaims{}
			parsedToken, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
				// Validate signing method
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(jwtSecret), nil
			})

			if err != nil {
				logger.Warn("Invalid JWT token", zap.Error(err))
				writeEmbeddedError(w, "invalid token", http.StatusUnauthorized)
				return
			}

			if !parsedToken.Valid {
				writeEmbeddedError(w, "invalid token", http.StatusUnauthorized)
				return
			}

			// Validate image path matches token claim
			imagePath := r.URL.Query().Get("image")
			if imagePath == "" {
				writeEmbeddedError(w, "missing image parameter", http.StatusBadRequest)
				return
			}

			if claims.Image != imagePath {
				logger.Warn("Image path mismatch",
					zap.String("token_image", claims.Image),
					zap.String("request_image", imagePath))
				writeEmbeddedError(w, "image path mismatch", http.StatusForbidden)
				return
			}

			// Add claims to request context
			ctx := context.WithValue(r.Context(), "embedded_claims", claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalEmbeddedJWTMiddleware validates JWT tokens if present, allows requests without tokens
func OptionalEmbeddedJWTMiddleware(jwtSecret string, logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get token from query parameter
			token := r.URL.Query().Get("token")
			if token == "" {
				// No token provided, continue without authentication
				next.ServeHTTP(w, r)
				return
			}

			// Token provided, validate it
			claims := &EmbeddedJWTClaims{}
			parsedToken, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(jwtSecret), nil
			})

			if err != nil || !parsedToken.Valid {
				logger.Warn("Invalid JWT token", zap.Error(err))
				writeEmbeddedError(w, "invalid token", http.StatusUnauthorized)
				return
			}

			// Validate image path if provided
			imagePath := r.URL.Query().Get("image")
			if imagePath != "" && claims.Image != imagePath {
				logger.Warn("Image path mismatch",
					zap.String("token_image", claims.Image),
					zap.String("request_image", imagePath))
				writeEmbeddedError(w, "image path mismatch", http.StatusForbidden)
				return
			}

			// Add claims to request context
			ctx := context.WithValue(r.Context(), "embedded_claims", claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetEmbeddedClaims extracts embedded JWT claims from request context
func GetEmbeddedClaims(r *http.Request) (*EmbeddedJWTClaims, bool) {
	claims, ok := r.Context().Value("embedded_claims").(*EmbeddedJWTClaims)
	return claims, ok
}

// writeEmbeddedError writes a JSON error response for embedded mode
func writeEmbeddedError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := map[string]interface{}{
		"error":     message,
		"timestamp": time.Now().Unix(),
	}

	json.NewEncoder(w).Encode(response)
}

// ValidateImagePath validates that the requested image path is allowed
func ValidateImagePath(imagePath, baseDir string) error {
	if imagePath == "" {
		return fmt.Errorf("image path is required")
	}

	// Basic path validation - ensure it doesn't contain dangerous patterns
	if strings.Contains(imagePath, "..") {
		return fmt.Errorf("invalid image path: contains '..'")
	}

	// Ensure path starts with / for absolute paths or is relative
	if !strings.HasPrefix(imagePath, "/") && !strings.HasPrefix(imagePath, baseDir) {
		return fmt.Errorf("invalid image path: must be absolute or within base directory")
	}

	return nil
}
