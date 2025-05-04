package resolver

import (
	"context"
	"fmt"
	"github.com/cshum/imagor-studio/server/gql"
	"time"
)

// SetMetadata is the resolver for the setMetadata field.
func (r *mutationResolver) SetMetadata(ctx context.Context, key string, value string) (*gql.Metadata, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	metadata, err := r.metadataStore.Set(ctx, ownerID, key, value)
	if err != nil {
		return nil, err
	}

	return &gql.Metadata{
		Key:       metadata.Key,
		Value:     metadata.Value,
		CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
		UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// DeleteMetadata is the resolver for the deleteMetadata field.
func (r *mutationResolver) DeleteMetadata(ctx context.Context, key string) (bool, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to get owner ID: %w", err)
	}

	err = r.metadataStore.Delete(ctx, ownerID, key)
	if err != nil {
		return false, err
	}
	return true, nil
}

// ListMetadata is the resolver for the listMetadata field.
func (r *queryResolver) ListMetadata(ctx context.Context, prefix *string) ([]*gql.Metadata, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	metadataList, err := r.metadataStore.List(ctx, ownerID, prefix)
	if err != nil {
		return nil, err
	}

	result := make([]*gql.Metadata, len(metadataList))
	for i, metadata := range metadataList {
		result[i] = &gql.Metadata{
			Key:       metadata.Key,
			Value:     metadata.Value,
			CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
			UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
		}
	}
	return result, nil
}

// GetMetadata is the resolver for the getMetadata field.
func (r *queryResolver) GetMetadata(ctx context.Context, key string) (*gql.Metadata, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	metadata, err := r.metadataStore.Get(ctx, ownerID, key)
	if err != nil {
		return nil, err
	}
	if metadata == nil {
		return nil, nil
	}
	return &gql.Metadata{
		Key:       metadata.Key,
		Value:     metadata.Value,
		CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
		UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
	}, nil
}
