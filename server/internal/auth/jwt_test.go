package auth

import (
	"context"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTokenManager(t *testing.T) {
	secret := "test-secret"
	duration := time.Hour
	tm := NewTokenManager(secret, duration)

	assert.NotNil(t, tm)
	assert.Equal(t, []byte(secret), tm.secret)
	assert.Equal(t, duration, tm.tokenDuration)
}

func TestTokenDuration(t *testing.T) {
	duration := time.Hour * 2
	tm := NewTokenManager("test-secret", duration)

	assert.Equal(t, duration, tm.TokenDuration())
}

func TestGenerateToken(t *testing.T) {
	tm := NewTokenManager("test-secret", time.Hour)

	userID := "test-user-id"
	role := "admin"
	scopes := []string{"read", "write"}

	token, err := tm.GenerateToken(userID, role, scopes, "")
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Parse the token to verify its contents
	parsedToken, err := jwt.ParseWithClaims(token, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return tm.secret, nil
	})
	require.NoError(t, err)
	assert.True(t, parsedToken.Valid)

	claims, ok := parsedToken.Claims.(*Claims)
	require.True(t, ok)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, role, claims.Role)
	assert.Equal(t, scopes, claims.Scopes)
	assert.Equal(t, userID, claims.Subject)
	assert.NotNil(t, claims.ExpiresAt)
	assert.NotNil(t, claims.IssuedAt)
	assert.NotNil(t, claims.NotBefore)
}

func TestValidateToken(t *testing.T) {
	tm := NewTokenManager("test-secret", time.Hour)

	userID := "test-user-id"
	role := "admin"
	scopes := []string{"read", "write"}

	// Generate a valid token
	token, err := tm.GenerateToken(userID, role, scopes, "")
	require.NoError(t, err)

	// Validate the token
	claims, err := tm.ValidateToken(token)
	require.NoError(t, err)
	assert.NotNil(t, claims)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, role, claims.Role)
	assert.Equal(t, scopes, claims.Scopes)
}

func TestValidateToken_InvalidToken(t *testing.T) {
	tm := NewTokenManager("test-secret", time.Hour)

	// Test with invalid token
	_, err := tm.ValidateToken("invalid.token.here")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse token")
}

func TestValidateToken_WrongSecret(t *testing.T) {
	tm1 := NewTokenManager("secret1", time.Hour)
	tm2 := NewTokenManager("secret2", time.Hour)

	// Generate token with first secret
	token, err := tm1.GenerateToken("user1", "user", []string{"read"}, "")
	require.NoError(t, err)

	// Try to validate with different secret
	_, err = tm2.ValidateToken(token)
	assert.Error(t, err)
}

func TestValidateToken_ExpiredToken(t *testing.T) {
	tm := NewTokenManager("test-secret", -time.Hour) // Negative duration for immediate expiration

	// Generate an expired token
	token, err := tm.GenerateToken("user1", "user", []string{"read"}, "")
	require.NoError(t, err)

	// Wait a moment to ensure token is expired
	time.Sleep(time.Millisecond * 100)

	// Try to validate expired token
	_, err = tm.ValidateToken(token)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse token")
}

func TestRefreshToken(t *testing.T) {
	tm := NewTokenManager("test-secret", time.Hour)

	// Create original token with timestamps in the past
	pastTime := time.Now().Add(-time.Minute)
	originalClaims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user1",
			ExpiresAt: jwt.NewNumericDate(pastTime.Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(pastTime),
			ID:        "original-test-id",
		},
		UserID: "user1",
		Role:   "user",
		Scopes: []string{"read"},
	}

	// Refresh the token
	refreshedToken, err := tm.RefreshToken(originalClaims)
	require.NoError(t, err)
	assert.NotEmpty(t, refreshedToken)

	// Validate refreshed token
	refreshedClaims, err := tm.ValidateToken(refreshedToken)
	require.NoError(t, err)
	assert.Equal(t, originalClaims.UserID, refreshedClaims.UserID)
	assert.Equal(t, originalClaims.Role, refreshedClaims.Role)
	assert.Equal(t, originalClaims.Scopes, refreshedClaims.Scopes)

	// Check that ID is different
	assert.NotEqual(t, originalClaims.ID, refreshedClaims.ID)
	assert.NotEqual(t, "original-test-id", refreshedClaims.ID)

	// Verify that the new ID is in the correct format (timestamp-based)
	assert.Regexp(t, `^\d+$`, refreshedClaims.ID, "ID should be a timestamp")

	// Check that expiration is extended
	originalExp := originalClaims.ExpiresAt.Time
	refreshedExp := refreshedClaims.ExpiresAt.Time
	assert.True(t, refreshedExp.After(originalExp), "Expiration time should be extended")

	// Check that IssuedAt is updated
	originalIat := originalClaims.IssuedAt.Time
	refreshedIat := refreshedClaims.IssuedAt.Time
	assert.True(t, refreshedIat.After(originalIat), "IssuedAt should be updated")

	// Verify the new token was issued recently (within last second)
	assert.WithinDuration(t, time.Now(), refreshedIat, time.Second, "Token should be issued recently")
}

func TestExtractTokenFromHeader(t *testing.T) {
	tests := []struct {
		name        string
		authHeader  string
		expectToken string
		expectError bool
	}{
		{
			name:        "Valid Bearer token",
			authHeader:  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expectToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expectError: false,
		},
		{
			name:        "Valid Bearer token with lowercase",
			authHeader:  "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expectToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expectError: false,
		},
		{
			name:        "Empty auth header",
			authHeader:  "",
			expectToken: "",
			expectError: true,
		},
		{
			name:        "Invalid format - no Bearer prefix",
			authHeader:  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expectToken: "",
			expectError: true,
		},
		{
			name:        "Invalid format - wrong prefix",
			authHeader:  "Basic eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			expectToken: "",
			expectError: true,
		},
		{
			name:        "Invalid format - Bearer without token",
			authHeader:  "Bearer",
			expectToken: "",
			expectError: true,
		},
		{
			name:        "Invalid format - Bearer with empty token",
			authHeader:  "Bearer ",
			expectToken: "",
			expectError: true, // This should be an error
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := ExtractTokenFromHeader(tt.authHeader)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectToken, token)
			}
		})
	}
}

func TestClaimsContext(t *testing.T) {
	claims := &Claims{
		UserID: "user1",
		Role:   "admin",
		Scopes: []string{"read", "write"},
	}

	// Test setting claims in context
	ctx := context.Background()
	ctxWithClaims := SetClaimsInContext(ctx, claims)

	// Test getting claims from context
	retrievedClaims, err := GetClaimsFromContext(ctxWithClaims)
	require.NoError(t, err)
	assert.Equal(t, claims, retrievedClaims)
}

func TestGetClaimsFromContext_NotFound(t *testing.T) {
	ctx := context.Background()
	_, err := GetClaimsFromContext(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "claims not found in context")
}

func TestGetClaimsFromContext_WrongType(t *testing.T) {
	ctx := context.WithValue(context.Background(), ClaimsContextKey, "not-claims")
	_, err := GetClaimsFromContext(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "claims not found in context")
}
