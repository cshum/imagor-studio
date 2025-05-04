package resolver

import (
	"context"
	"fmt"
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
