package resolver

import (
	"context"
	"fmt"
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

// RequireWritePermission to check write permissions
func RequireWritePermission(ctx context.Context) error {
	return RequirePermission(ctx, "write")
}

// RequireEditPermission to check edit permissions
func RequireEditPermission(ctx context.Context) error {
	return RequirePermission(ctx, "edit", "write")
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
