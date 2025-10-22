package resolver

import (
	"context"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/stretchr/testify/assert"
)

func TestWithUserID(t *testing.T) {
	ctx := context.Background()
	userID := "test-user-123"

	newCtx := WithUserID(ctx, userID)

	// Verify the user ID was set correctly
	retrievedUserID, err := GetUserIDFromContext(newCtx)
	assert.NoError(t, err)
	assert.Equal(t, userID, retrievedUserID)
}

func TestGetUserIDFromContext(t *testing.T) {
	tests := []struct {
		name        string
		setupCtx    func() context.Context
		expectError bool
		expectedID  string
	}{
		{
			name: "Valid owner ID in context",
			setupCtx: func() context.Context {
				return context.WithValue(context.Background(), UserIDContextKey, "test-user-123")
			},
			expectError: false,
			expectedID:  "test-user-123",
		},
		{
			name: "No owner ID in context",
			setupCtx: func() context.Context {
				return context.Background()
			},
			expectError: true,
			expectedID:  "",
		},
		{
			name: "Wrong type in context",
			setupCtx: func() context.Context {
				return context.WithValue(context.Background(), UserIDContextKey, 123)
			},
			expectError: true,
			expectedID:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := tt.setupCtx()
			userID, err := GetUserIDFromContext(ctx)

			if tt.expectError {
				assert.Error(t, err)
				assert.Empty(t, userID)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedID, userID)
			}
		})
	}
}

func TestValidatePathAccess(t *testing.T) {
	tests := []struct {
		name          string
		pathPrefix    string
		requestedPath string
		expectError   bool
		errorContains string
	}{
		{
			name:          "No path prefix - allows all paths",
			pathPrefix:    "",
			requestedPath: "/any/path/file.jpg",
			expectError:   false,
		},
		{
			name:          "Root prefix - allows all paths",
			pathPrefix:    "/",
			requestedPath: "/any/path/file.jpg",
			expectError:   false,
		},
		{
			name:          "Valid path within prefix",
			pathPrefix:    "/user123/images",
			requestedPath: "/user123/images/photo.jpg",
			expectError:   false,
		},
		{
			name:          "Valid nested path within prefix",
			pathPrefix:    "/user123/images",
			requestedPath: "/user123/images/subfolder/photo.jpg",
			expectError:   false,
		},
		{
			name:          "Path outside prefix - denied",
			pathPrefix:    "/user123/images",
			requestedPath: "/other-user/images/photo.jpg",
			expectError:   true,
			errorContains: "path access denied",
		},
		{
			name:          "Path traversal attempt - denied",
			pathPrefix:    "/user123/images",
			requestedPath: "/user123/images/../../../etc/passwd",
			expectError:   true,
			errorContains: "path access denied", // After normalization, this becomes /etc/passwd which is outside the prefix
		},
		{
			name:          "Exact prefix match",
			pathPrefix:    "/user123/images",
			requestedPath: "/user123/images",
			expectError:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create context with claims
			claims := &auth.Claims{
				UserID:     "test-user",
				Role:       "user",
				Scopes:     []string{"read"},
				PathPrefix: tt.pathPrefix,
			}
			ctx := auth.SetClaimsInContext(context.Background(), claims)

			err := ValidatePathAccess(ctx, tt.requestedPath)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRequireReadPermissionWithPath(t *testing.T) {
	tests := []struct {
		name          string
		scopes        []string
		pathPrefix    string
		requestedPath string
		expectError   bool
		errorContains string
	}{
		{
			name:          "Read permission with valid path",
			scopes:        []string{"read"},
			pathPrefix:    "/user123/images",
			requestedPath: "/user123/images/photo.jpg",
			expectError:   false,
		},
		{
			name:          "No read permission",
			scopes:        []string{"write"},
			pathPrefix:    "/user123/images",
			requestedPath: "/user123/images/photo.jpg",
			expectError:   true,
			errorContains: "insufficient permission: read access required",
		},
		{
			name:          "Read permission but invalid path",
			scopes:        []string{"read"},
			pathPrefix:    "/user123/images",
			requestedPath: "/other-user/images/photo.jpg",
			expectError:   true,
			errorContains: "path access denied",
		},
		{
			name:          "Read permission with no path validation",
			scopes:        []string{"read"},
			pathPrefix:    "/user123/images",
			requestedPath: "", // Empty path skips validation
			expectError:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create context with claims
			claims := &auth.Claims{
				UserID:     "test-user",
				Role:       "user",
				Scopes:     tt.scopes,
				PathPrefix: tt.pathPrefix,
			}
			ctx := auth.SetClaimsInContext(context.Background(), claims)

			err := RequireReadPermission(ctx, tt.requestedPath)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRequireWritePermissionWithPath(t *testing.T) {
	tests := []struct {
		name          string
		scopes        []string
		pathPrefix    string
		requestedPath string
		expectError   bool
		errorContains string
	}{
		{
			name:          "Write permission with valid path",
			scopes:        []string{"write"},
			pathPrefix:    "/user123/images",
			requestedPath: "/user123/images/photo.jpg",
			expectError:   false,
		},
		{
			name:          "No write permission",
			scopes:        []string{"read"},
			pathPrefix:    "/user123/images",
			requestedPath: "/user123/images/photo.jpg",
			expectError:   true,
			errorContains: "insufficient permission: write access required",
		},
		{
			name:          "Write permission but invalid path",
			scopes:        []string{"write"},
			pathPrefix:    "/user123/images",
			requestedPath: "/other-user/images/photo.jpg",
			expectError:   true,
			errorContains: "path access denied",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create context with claims
			claims := &auth.Claims{
				UserID:     "test-user",
				Role:       "user",
				Scopes:     tt.scopes,
				PathPrefix: tt.pathPrefix,
			}
			ctx := auth.SetClaimsInContext(context.Background(), claims)

			err := RequireWritePermission(ctx, tt.requestedPath)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestIsEmbeddedMode(t *testing.T) {
	tests := []struct {
		name       string
		isEmbedded bool
		expected   bool
	}{
		{
			name:       "Embedded mode enabled",
			isEmbedded: true,
			expected:   true,
		},
		{
			name:       "Embedded mode disabled",
			isEmbedded: false,
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create context with claims
			claims := &auth.Claims{
				UserID:     "test-user",
				Role:       "guest",
				Scopes:     []string{"read", "edit"},
				PathPrefix: "/user123/images",
				IsEmbedded: tt.isEmbedded,
			}
			ctx := auth.SetClaimsInContext(context.Background(), claims)

			result := IsEmbeddedMode(ctx)

			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestEmbeddedModeWithPathValidation(t *testing.T) {
	tests := []struct {
		name          string
		pathPrefix    string
		requestedPath string
		expectError   bool
		errorContains string
	}{
		{
			name:          "Embedded user can access files within path prefix",
			pathPrefix:    "/user123/images",
			requestedPath: "/user123/images/photo.jpg",
			expectError:   false,
		},
		{
			name:          "Embedded user cannot access files outside path prefix",
			pathPrefix:    "/user123/images",
			requestedPath: "/other-user/images/photo.jpg",
			expectError:   true,
			errorContains: "path access denied",
		},
		{
			name:          "Embedded user with root prefix can access all paths",
			pathPrefix:    "/",
			requestedPath: "/any/path/photo.jpg",
			expectError:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create embedded context
			claims := &auth.Claims{
				UserID:     "embedded-guest",
				Role:       "guest",
				Scopes:     []string{"read", "edit"},
				PathPrefix: tt.pathPrefix,
				IsEmbedded: true,
			}
			ctx := auth.SetClaimsInContext(context.Background(), claims)

			// Test that embedded mode is detected
			assert.True(t, IsEmbeddedMode(ctx))

			// Test path validation for edit permission (which embedded users have)
			err := RequireEditPermission(ctx, tt.requestedPath)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
