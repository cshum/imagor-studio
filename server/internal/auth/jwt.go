package auth

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents JWT claims structure
type Claims struct {
	jwt.RegisteredClaims
	UserID     string   `json:"user_id"`
	Role       string   `json:"role"`
	Scopes     []string `json:"scopes"`
	PathPrefix string   `json:"path_prefix,omitempty"`
	IsEmbedded bool     `json:"is_embedded,omitempty"`
}

// TokenManager handles JWT operations
type TokenManager struct {
	secret        []byte
	tokenDuration time.Duration
}

// TokenDuration returns the token duration
func (tm *TokenManager) TokenDuration() time.Duration {
	return tm.tokenDuration
}

// NewTokenManager creates a new JWT token manager
func NewTokenManager(secret string, tokenDuration time.Duration) *TokenManager {
	return &TokenManager{
		secret:        []byte(secret),
		tokenDuration: tokenDuration,
	}
}

// GenerateToken creates a new JWT token
func (tm *TokenManager) GenerateToken(userID, role string, scopes []string, pathPrefix ...string) (string, error) {
	return tm.GenerateTokenWithOptions(userID, role, scopes, false, pathPrefix...)
}

// GenerateTokenWithOptions creates a new JWT token with embedded mode option
func (tm *TokenManager) GenerateTokenWithOptions(userID, role string, scopes []string, isEmbedded bool, pathPrefix ...string) (string, error) {
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.tokenDuration)),
			NotBefore: jwt.NewNumericDate(now),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		},
		UserID:     userID,
		Role:       role,
		Scopes:     scopes,
		IsEmbedded: isEmbedded,
	}

	// Set path prefix if provided
	if len(pathPrefix) > 0 && pathPrefix[0] != "" {
		claims.PathPrefix = pathPrefix[0]
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(tm.secret)
}

// ValidateToken validates and parses the JWT token
func (tm *TokenManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing algorithm
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return tm.secret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// RefreshToken creates a new token with extended expiration
func (tm *TokenManager) RefreshToken(claims *Claims) (string, error) {
	now := time.Now()

	// Create new claims with updated fields
	newClaims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   claims.Subject,
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.tokenDuration)),
			NotBefore: jwt.NewNumericDate(now),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        fmt.Sprintf("%d", now.UnixNano()),
		},
		UserID:     claims.UserID,
		Role:       claims.Role,
		Scopes:     claims.Scopes,
		PathPrefix: claims.PathPrefix,
		IsEmbedded: claims.IsEmbedded,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
	return token.SignedString(tm.secret)
}

// ExtractTokenFromHeader extracts the token from the Authorization header
func ExtractTokenFromHeader(authHeader string) (string, error) {
	if authHeader == "" {
		return "", fmt.Errorf("authorization header is required")
	}

	// Check if the header contains "Bearer " prefix
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return "", fmt.Errorf("invalid authorization header format")
	}

	// Check if token part is empty
	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", fmt.Errorf("token is empty")
	}

	return token, nil
}

// ContextKey type for context values
type ContextKey string

const (
	// ClaimsContextKey is the context key for JWT claims
	ClaimsContextKey ContextKey = "claims"
)

// GetClaimsFromContext extracts JWT claims from context
func GetClaimsFromContext(ctx context.Context) (*Claims, error) {
	claims, ok := ctx.Value(ClaimsContextKey).(*Claims)
	if !ok {
		return nil, fmt.Errorf("claims not found in context")
	}
	return claims, nil
}

// SetClaimsInContext sets JWT claims in context
func SetClaimsInContext(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, ClaimsContextKey, claims)
}
