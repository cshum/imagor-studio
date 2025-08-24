package resolver

import (
	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/pkg/metadatastore"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/userstore"
	"go.uber.org/zap"
)

const SystemOwnerID = "system"

type Resolver struct {
	storage       storage.Storage
	metadataStore metadatastore.Store
	userStore     userstore.Store
	logger        *zap.Logger
}

func NewResolver(storage storage.Storage, metadataStore metadatastore.Store, userStore userstore.Store, logger *zap.Logger) *Resolver {
	return &Resolver{
		storage:       storage,
		metadataStore: metadataStore,
		userStore:     userStore,
		logger:        logger,
	}
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() gql.MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() gql.QueryResolver { return &queryResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
