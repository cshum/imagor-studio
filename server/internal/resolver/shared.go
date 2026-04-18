package resolver

import (
	"context"

	sharedgql "github.com/cshum/imagor-studio/server/internal/generated/gql"
)

// SharedResolverRoot is the resolver root for the self-hosted schema surface.
// It intentionally excludes cloud-only schema fields so self-hosted composition
// can stay bound to `internal/generated/gql/selfhosted` adapters.
type SharedResolverRoot interface {
	Mutation() sharedgql.MutationResolver
	Query() sharedgql.QueryResolver
}

// SharedCapabilities collects self-hosted/runtime checks that should not depend on
// any cloud-only schema types.
type SharedCapabilities interface {
	HasSharedStorageAccess(ctx context.Context) bool
}

// IsCloudEnabled reports whether cloud-only stores are wired into the resolver.
func (r *Resolver) IsCloudEnabled() bool {
	return r.orgStore != nil || r.spaceStore != nil || r.spaceInviteStore != nil
}

// HasSharedStorageAccess is a small self-hosted/shared helper for schema gating.
func (r *Resolver) HasSharedStorageAccess(ctx context.Context) bool {
	return r.getStorage() != nil && ctx != nil
}
