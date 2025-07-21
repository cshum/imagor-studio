package resolver

import (
	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/pkg/metadatastore"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"go.uber.org/zap"
)

type Resolver struct {
	storage       storage.Storage
	metadataStore metadatastore.Store
	logger        *zap.Logger
}

func NewResolver(storage storage.Storage, metadataStore metadatastore.Store, logger *zap.Logger) *Resolver {
	return &Resolver{
		storage:       storage,
		metadataStore: metadataStore,
		logger:        logger,
	}
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() gql.MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() gql.QueryResolver { return &queryResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
