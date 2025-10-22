package resolver

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/cshum/imagor-studio/server/internal/auth"
)

type contextKey string

const (
	UserIDContextKey contextKey = "userID"
)

// WithUserID adds owner ID to context
func WithUserID(ctx context.Context, ownerID string) context.Context {
	return context.WithValue(ctx, UserIDContextKey, ownerID)
}

// GetUserIDFromContext extracts the owner ID from the context
func GetUserIDFromContext(ctx context.Context) (string, error) {
	ownerID, ok := ctx.Value(UserIDContextKey).(string)
	if !ok {
		return "", fmt.Errorf("user ID not found in context")
	}
	return ownerID, nil
}

func RequirePermission(ctx context.Context, requiredScopes ...string) error {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return fmt.Errorf("unauthorized")
	}

	// Check if user has ANY of the required scopes
	for _, userScope := range claims.Scopes {
		for _, requiredScope := range requiredScopes {
			if userScope == requiredScope {
				return nil
			}
		}
	}

	if len(requiredScopes) == 1 {
		return fmt.Errorf("insufficient permission: %s access required", requiredScopes[0])
	}
	return fmt.Errorf("insufficient permission: one of %s access required", strings.Join(requiredScopes, ", "))
}

// RequireWritePermission to check write permissions with optional path validation
func RequireWritePermission(ctx context.Context, path ...string) error {
	if err := RequirePermission(ctx, "write"); err != nil {
		return err
	}

	// If path is provided and not empty, validate path access
	if len(path) > 0 && path[0] != "" {
		return ValidatePathAccess(ctx, path[0])
	}

	return nil
}

// RequireEditPermission to check edit permissions with optional path validation
func RequireEditPermission(ctx context.Context, path ...string) error {
	if err := RequirePermission(ctx, "edit", "write"); err != nil {
		return err
	}

	// If path is provided and not empty, validate path access
	if len(path) > 0 && path[0] != "" {
		return ValidatePathAccess(ctx, path[0])
	}

	return nil
}

// RequireReadPermission to check read permissions with optional path validation
func RequireReadPermission(ctx context.Context, path ...string) error {
	if err := RequirePermission(ctx, "read"); err != nil {
		return err
	}

	// If path is provided and not empty, validate path access
	if len(path) > 0 && path[0] != "" {
		return ValidatePathAccess(ctx, path[0])
	}

	return nil
}

// RequireAdminPermission to check admin permissions
func RequireAdminPermission(ctx context.Context) error {
	return RequirePermission(ctx, "admin")
}

// IsGuestUser to check if user is a guest
func IsGuestUser(ctx context.Context) bool {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false
	}
	return claims.Role == "guest"
}

// GetEffectiveTargetUserID to determine effective owner ID for user metadata operations
func GetEffectiveTargetUserID(ctx context.Context, providedUserID *string) (string, error) {
	currentUserID, err := GetUserIDFromContext(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get current user ID: %w", err)
	}

	// Check guest permissions
	if IsGuestUser(ctx) {
		return "", fmt.Errorf("cannot update a guest user")
	}

	// If no ownerID provided, use current user
	if providedUserID == nil {
		return currentUserID, nil
	}

	targetUserID := *providedUserID

	// Users can only access their own metadata, admins can access any user's metadata
	if targetUserID != currentUserID {
		if err := RequireAdminPermission(ctx); err != nil {
			return "", fmt.Errorf("admin permission required to access other user's metadata: %w", err)
		}
	}

	return targetUserID, nil
}

// ValidatePathAccess checks if the requested path is within the allowed path prefix
func ValidatePathAccess(ctx context.Context, requestedPath string) error {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return fmt.Errorf("unauthorized")
	}

	// If no path prefix is set, allow all paths (backward compatibility)
	if claims.PathPrefix == "" {
		return nil
	}

	// Normalize paths for comparison
	normalizedRequested := filepath.Clean("/" + strings.TrimPrefix(requestedPath, "/"))
	normalizedPrefix := filepath.Clean("/" + strings.TrimPrefix(claims.PathPrefix, "/"))

	// Ensure the normalized prefix doesn't end with / unless it's root
	if normalizedPrefix != "/" && strings.HasSuffix(normalizedPrefix, "/") {
		normalizedPrefix = strings.TrimSuffix(normalizedPrefix, "/")
	}

	// Check if requested path is within allowed prefix
	if normalizedPrefix == "/" {
		// Root prefix allows access to all paths
		return nil
	}

	// Check if the requested path starts with the allowed prefix
	if !strings.HasPrefix(normalizedRequested, normalizedPrefix) {
		return fmt.Errorf("path access denied: %s not within allowed prefix %s", requestedPath, claims.PathPrefix)
	}

	// Additional check: ensure the path doesn't escape the prefix using path traversal
	if strings.Contains(requestedPath, "..") {
		return fmt.Errorf("path access denied: path traversal not allowed")
	}

	return nil
}

// RequirePathPermission checks both scope and path access permissions
func RequirePathPermission(ctx context.Context, requestedPath string, requiredScopes ...string) error {
	// First check normal scope permissions
	if err := RequirePermission(ctx, requiredScopes...); err != nil {
		return err
	}

	// Then check path access permissions
	return ValidatePathAccess(ctx, requestedPath)
}
