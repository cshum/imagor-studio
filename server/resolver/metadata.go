package resolver

import (
	"context"
	"fmt"
	"time"

	"github.com/cshum/imagor-studio/server/gql"
)

// SetUserMetadata sets user-specific metadata
func (r *mutationResolver) SetUserMetadata(ctx context.Context, key string, value string, ownerID *string) (*gql.Metadata, error) {
	effectiveOwnerID, err := r.getEffectiveUserOwnerID(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	metadata, err := r.metadataStore.Set(ctx, effectiveOwnerID, key, value)
	if err != nil {
		return nil, fmt.Errorf("failed to set user metadata: %w", err)
	}

	return &gql.Metadata{
		Key:       metadata.Key,
		Value:     metadata.Value,
		OwnerID:   effectiveOwnerID,
		CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
		UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// DeleteUserMetadata deletes user-specific metadata
func (r *mutationResolver) DeleteUserMetadata(ctx context.Context, key string, ownerID *string) (bool, error) {
	effectiveOwnerID, err := r.getEffectiveUserOwnerID(ctx, ownerID)
	if err != nil {
		return false, err
	}

	err = r.metadataStore.Delete(ctx, effectiveOwnerID, key)
	if err != nil {
		return false, fmt.Errorf("failed to delete user metadata: %w", err)
	}

	return true, nil
}

// ListUserMetadata lists user-specific metadata
func (r *queryResolver) ListUserMetadata(ctx context.Context, prefix *string, ownerID *string) ([]*gql.Metadata, error) {
	effectiveOwnerID, err := r.getEffectiveUserOwnerIDForQuery(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	metadataList, err := r.metadataStore.List(ctx, effectiveOwnerID, prefix)
	if err != nil {
		return nil, fmt.Errorf("failed to list user metadata: %w", err)
	}

	result := make([]*gql.Metadata, len(metadataList))
	for i, metadata := range metadataList {
		result[i] = &gql.Metadata{
			Key:       metadata.Key,
			Value:     metadata.Value,
			OwnerID:   effectiveOwnerID,
			CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
			UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
		}
	}
	return result, nil
}

// GetUserMetadata gets specific user metadata
func (r *queryResolver) GetUserMetadata(ctx context.Context, key string, ownerID *string) (*gql.Metadata, error) {
	effectiveOwnerID, err := r.getEffectiveUserOwnerIDForQuery(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	metadata, err := r.metadataStore.Get(ctx, effectiveOwnerID, key)
	if err != nil {
		return nil, fmt.Errorf("failed to get user metadata: %w", err)
	}

	if metadata == nil {
		return nil, nil
	}

	return &gql.Metadata{
		Key:       metadata.Key,
		Value:     metadata.Value,
		OwnerID:   effectiveOwnerID,
		CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
		UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// SetSystemMetadata sets system-wide metadata (admin only)
func (r *mutationResolver) SetSystemMetadata(ctx context.Context, key string, value string) (*gql.Metadata, error) {
	// Only admins can write system metadata
	if err := requireAdminPermission(ctx); err != nil {
		return nil, fmt.Errorf("admin permission required for system metadata write: %w", err)
	}

	metadata, err := r.metadataStore.Set(ctx, SystemOwnerID, key, value)
	if err != nil {
		return nil, fmt.Errorf("failed to set system metadata: %w", err)
	}

	return &gql.Metadata{
		Key:       metadata.Key,
		Value:     metadata.Value,
		OwnerID:   SystemOwnerID,
		CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
		UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// DeleteSystemMetadata deletes system-wide metadata (admin only)
func (r *mutationResolver) DeleteSystemMetadata(ctx context.Context, key string) (bool, error) {
	// Only admins can delete system metadata
	if err := requireAdminPermission(ctx); err != nil {
		return false, fmt.Errorf("admin permission required for system metadata delete: %w", err)
	}

	err := r.metadataStore.Delete(ctx, SystemOwnerID, key)
	if err != nil {
		return false, fmt.Errorf("failed to delete system metadata: %w", err)
	}

	return true, nil
}

// ListSystemMetadata lists system-wide metadata (open read access)
func (r *queryResolver) ListSystemMetadata(ctx context.Context, prefix *string) ([]*gql.Metadata, error) {
	// All authenticated users can read system metadata
	// No additional permission check needed

	metadataList, err := r.metadataStore.List(ctx, SystemOwnerID, prefix)
	if err != nil {
		return nil, fmt.Errorf("failed to list system metadata: %w", err)
	}

	result := make([]*gql.Metadata, len(metadataList))
	for i, metadata := range metadataList {
		result[i] = &gql.Metadata{
			Key:       metadata.Key,
			Value:     metadata.Value,
			OwnerID:   SystemOwnerID,
			CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
			UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
		}
	}
	return result, nil
}

// GetSystemMetadata gets specific system metadata (open read access)
func (r *queryResolver) GetSystemMetadata(ctx context.Context, key string) (*gql.Metadata, error) {
	// All authenticated users can read system metadata
	// No additional permission check needed

	metadata, err := r.metadataStore.Get(ctx, SystemOwnerID, key)
	if err != nil {
		return nil, fmt.Errorf("failed to get system metadata: %w", err)
	}

	if metadata == nil {
		return nil, nil
	}

	return &gql.Metadata{
		Key:       metadata.Key,
		Value:     metadata.Value,
		OwnerID:   SystemOwnerID,
		CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
		UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
	}, nil
}
