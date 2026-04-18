package resolver

import (
	"context"

	sharedgql "github.com/cshum/imagor-studio/server/internal/generated/gql"
)

// SharedResolverRoot is the resolver root for the shared/self-hosted schema surface.
// Cloud-only schema fields are intentionally excluded from this interface so the next
// step can wire a separate cloud resolver root without duplicating shared logic.
type SharedResolverRoot interface {
	Mutation() sharedgql.MutationResolver
	Query() sharedgql.QueryResolver
}

// SharedCapabilities collects shared/self-hosted runtime checks that should not depend
// on any cloud-only schema types.
type SharedCapabilities interface {
	HasSharedStorageAccess(ctx context.Context) bool
}

// IsCloudEnabled reports whether cloud-only stores are wired into the resolver.
func (r *Resolver) IsCloudEnabled() bool {
	return r.orgStore != nil || r.spaceStore != nil || r.spaceInviteStore != nil
}

// HasSharedStorageAccess is a small shared-mode helper for future schema gating.
func (r *Resolver) HasSharedStorageAccess(ctx context.Context) bool {
	return r.getStorage() != nil && ctx != nil
}
