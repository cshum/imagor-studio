package graphqlmode

import (
	"github.com/99designs/gqlgen/graphql"
	sharedgql "github.com/cshum/imagor-studio/server/internal/generated/gql"
	cloudgql "github.com/cshum/imagor-studio/server/internal/generated/gql/cloud"
	"github.com/cshum/imagor-studio/server/internal/resolver"
)

// newCloudExecutableSchema keeps cloud mode on the shared schema until cloud-specific
// adapters are split out completely. Self-hosted mode can still move independently.
func newCloudExecutableSchema(r *resolver.Resolver) graphql.ExecutableSchema {
	return sharedgql.NewExecutableSchema(sharedgql.Config{Resolvers: r})
}

var _ = cloudgql.NewExecutableSchema
