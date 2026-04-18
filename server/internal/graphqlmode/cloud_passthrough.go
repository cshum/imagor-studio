package graphqlmode

import (
	"github.com/99designs/gqlgen/graphql"
	cloudgql "github.com/cshum/imagor-studio/server/internal/generated/gql/cloud"
	"github.com/cshum/imagor-studio/server/internal/resolver"
)

// newCloudExecutableSchema builds the cloud schema from the mode-specific generated package.
func newCloudExecutableSchema(r *resolver.Resolver) graphql.ExecutableSchema {
	return cloudgql.NewExecutableSchema(cloudgql.Config{Resolvers: cloudRootAdapter{Resolver: r}})
}

var _ = cloudgql.NewExecutableSchema
