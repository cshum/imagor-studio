package resolver

import (
	"context"
	"fmt"

	"github.com/cshum/imagor-studio/server/pkg/auth"
)

type contextKey string

const (
	OwnerIDContextKey contextKey = "ownerID"
)

// WithOwnerID adds owner ID to context
func WithOwnerID(ctx context.Context, ownerID string) context.Context {
	return context.WithValue(ctx, OwnerIDContextKey, ownerID)
}

// GetOwnerIDFromContext extracts the owner ID from the context
func GetOwnerIDFromContext(ctx context.Context) (string, error) {
	ownerID, ok := ctx.Value(OwnerIDContextKey).(string)
	if !ok {
		return "", fmt.Errorf("owner ID not found in context")
	}
	return ownerID, nil
}

func requirePermission(ctx context.Context, requiredScope string) error {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return fmt.Errorf("unauthorized")
	}

	hasScope := false
	for _, scope := range claims.Scopes {
		if scope == requiredScope {
			hasScope = true
			break
		}
	}
	if !hasScope {
		return fmt.Errorf("insufficient permission: %s access required", requiredScope)
	}
	return nil
}

// Helper function to check write permissions
func requireWritePermission(ctx context.Context) error {
	return requirePermission(ctx, "write")
}

// Helper function to check admin permissions
func requireAdminPermission(ctx context.Context) error {
	return requirePermission(ctx, "admin")
}

// Helper function to check if user is a guest
func isGuestUser(ctx context.Context) bool {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return false
	}
	return claims.Role == "guest"
}
