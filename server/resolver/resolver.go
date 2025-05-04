package resolver

import (
	"context"
	"fmt"
	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/pkg/metadatastore"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/storageconfigstore"
	"go.uber.org/zap"
)

type Resolver struct {
	storageConfigStore storageconfigstore.Store
	metadataStore      metadatastore.Store
	logger             *zap.Logger
}

func NewResolver(storageConfigStore storageconfigstore.Store, metadataStore metadatastore.Store, logger *zap.Logger) *Resolver {
	return &Resolver{
		storageConfigStore: storageConfigStore,
		metadataStore:      metadataStore,
		logger:             logger,
	}
}

func (r *Resolver) getStorage(ctx context.Context, storageKey *string) (storage.Storage, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	if storageKey == nil {
		return r.storageConfigStore.DefaultStorage(ownerID)
	}
	return r.storageConfigStore.Storage(ownerID, *storageKey)
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() gql.MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() gql.QueryResolver { return &queryResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
