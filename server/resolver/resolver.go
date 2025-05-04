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

type contextKey string

const (
	OwnerIDContextKey contextKey = "ownerID"
)

// GetOwnerIDFromContext extracts the owner ID from the context
func GetOwnerIDFromContext(ctx context.Context) (string, error) {
	ownerID, ok := ctx.Value(OwnerIDContextKey).(string)
	if !ok {
		// For development/testing, return a default owner ID (UUID)
		// In production, this should return an error
		return "00000000-0000-0000-0000-000000000001", nil
	}
	return ownerID, nil
}

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
