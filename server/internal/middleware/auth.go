package middleware

import (
	"context"
	"github.com/cshum/imagor-studio/server/resolver"
	"net/http"
)

// AuthMiddleware injects owner ID into the request context
// For now, it uses a default owner ID (UUID)
// In the future, this will extract the owner ID from a JWT token
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// TODO: Extract owner ID from JWT token in the Authorization header
		// For now, use a default owner ID for development/testing
		ownerID := "00000000-0000-0000-0000-000000000001"

		// Add owner ID to the context
		ctx = context.WithValue(ctx, resolver.OwnerIDContextKey, ownerID)

		// Pass the request with the new context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
