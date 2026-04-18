package graphqlmode

import (
	"github.com/99designs/gqlgen/graphql"
	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	selfhostedgql "github.com/cshum/imagor-studio/server/internal/generated/gql/selfhosted"
	"github.com/cshum/imagor-studio/server/internal/resolver"
)

const (
	GeneratedPackageShared     = "internal/generated/gql"
	GeneratedPackageSelfHosted = "internal/generated/gql/selfhosted"
	GeneratedPackageCloud      = "internal/generated/gql/cloud"
)

// NewExecutableSchema returns the currently wired executable schema for the given mode.
// For now this preserves the existing shared generated package while introducing a single
// composition point that can switch to mode-specific generated packages as they are adopted.
func NewExecutableSchema(mode bootstrap.Mode, r *resolver.Resolver) graphql.ExecutableSchema {
	switch mode {
	case bootstrap.ModeCloud:
		var _ resolver.CloudCapabilities = r
		return newCloudExecutableSchema(r)
	default:
		var _ resolver.SharedResolverRoot = r
		var _ resolver.SharedCapabilities = r
		return selfhostedgql.NewExecutableSchema(selfhostedgql.Config{Resolvers: selfHostedRootAdapter{Resolver: r}})
	}
}
