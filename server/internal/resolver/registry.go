package resolver

import (
	"context"
	"fmt"
	"time"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
)

// SetUserRegistry sets user-specific registry
func (r *mutationResolver) SetUserRegistry(ctx context.Context, key string, value string, ownerID *string) (*gql.Registry, error) {
	effectiveOwnerID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	registry, err := r.registryStore.Set(ctx, effectiveOwnerID, key, value)
	if err != nil {
		return nil, fmt.Errorf("failed to set user registry: %w", err)
	}

	return &gql.Registry{
		Key:       registry.Key,
		Value:     registry.Value,
		OwnerID:   effectiveOwnerID,
		CreatedAt: registry.CreatedAt.Format(time.RFC3339),
		UpdatedAt: registry.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// DeleteUserRegistry deletes user-specific registry
func (r *mutationResolver) DeleteUserRegistry(ctx context.Context, key string, ownerID *string) (bool, error) {
	effectiveOwnerID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return false, err
	}

	err = r.registryStore.Delete(ctx, effectiveOwnerID, key)
	if err != nil {
		return false, fmt.Errorf("failed to delete user registry: %w", err)
	}

	return true, nil
}

// ListUserRegistry lists user-specific registry
func (r *queryResolver) ListUserRegistry(ctx context.Context, prefix *string, ownerID *string) ([]*gql.Registry, error) {
	effectiveOwnerID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	registryList, err := r.registryStore.List(ctx, effectiveOwnerID, prefix)
	if err != nil {
		return nil, fmt.Errorf("failed to list user registry: %w", err)
	}

	result := make([]*gql.Registry, len(registryList))
	for i, registry := range registryList {
		result[i] = &gql.Registry{
			Key:       registry.Key,
			Value:     registry.Value,
			OwnerID:   effectiveOwnerID,
			CreatedAt: registry.CreatedAt.Format(time.RFC3339),
			UpdatedAt: registry.UpdatedAt.Format(time.RFC3339),
		}
	}
	return result, nil
}

// GetUserRegistry gets specific user registry
func (r *queryResolver) GetUserRegistry(ctx context.Context, key string, ownerID *string) (*gql.Registry, error) {
	effectiveOwnerID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	registry, err := r.registryStore.Get(ctx, effectiveOwnerID, key)
	if err != nil {
		return nil, fmt.Errorf("failed to get user registry: %w", err)
	}

	if registry == nil {
		return nil, nil
	}

	return &gql.Registry{
		Key:       registry.Key,
		Value:     registry.Value,
		OwnerID:   effectiveOwnerID,
		CreatedAt: registry.CreatedAt.Format(time.RFC3339),
		UpdatedAt: registry.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// SetSystemRegistry sets system-wide registry (admin only)
func (r *mutationResolver) SetSystemRegistry(ctx context.Context, key string, value string) (*gql.Registry, error) {
	// Only admins can write system registry
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, fmt.Errorf("admin permission required for system registry write: %w", err)
	}

	registry, err := r.registryStore.Set(ctx, SystemOwnerID, key, value)
	if err != nil {
		return nil, fmt.Errorf("failed to set system registry: %w", err)
	}

	return &gql.Registry{
		Key:       registry.Key,
		Value:     registry.Value,
		OwnerID:   SystemOwnerID,
		CreatedAt: registry.CreatedAt.Format(time.RFC3339),
		UpdatedAt: registry.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// DeleteSystemRegistry deletes system-wide registry (admin only)
func (r *mutationResolver) DeleteSystemRegistry(ctx context.Context, key string) (bool, error) {
	// Only admins can delete system registry
	if err := RequireAdminPermission(ctx); err != nil {
		return false, fmt.Errorf("admin permission required for system registry delete: %w", err)
	}

	err := r.registryStore.Delete(ctx, SystemOwnerID, key)
	if err != nil {
		return false, fmt.Errorf("failed to delete system registry: %w", err)
	}

	return true, nil
}

// ListSystemRegistry lists system-wide registry (open read access)
func (r *queryResolver) ListSystemRegistry(ctx context.Context, prefix *string) ([]*gql.Registry, error) {
	// All authenticated users can read system registry
	// No additional permission check needed

	registryList, err := r.registryStore.List(ctx, SystemOwnerID, prefix)
	if err != nil {
		return nil, fmt.Errorf("failed to list system registry: %w", err)
	}

	result := make([]*gql.Registry, len(registryList))
	for i, registry := range registryList {
		result[i] = &gql.Registry{
			Key:       registry.Key,
			Value:     registry.Value,
			OwnerID:   SystemOwnerID,
			CreatedAt: registry.CreatedAt.Format(time.RFC3339),
			UpdatedAt: registry.UpdatedAt.Format(time.RFC3339),
		}
	}
	return result, nil
}

// GetSystemRegistry gets specific system registry (open read access)
func (r *queryResolver) GetSystemRegistry(ctx context.Context, key string) (*gql.Registry, error) {
	// All authenticated users can read system registry
	// No additional permission check needed

	registry, err := r.registryStore.Get(ctx, SystemOwnerID, key)
	if err != nil {
		return nil, fmt.Errorf("failed to get system registry: %w", err)
	}

	if registry == nil {
		return nil, nil
	}

	return &gql.Registry{
		Key:       registry.Key,
		Value:     registry.Value,
		OwnerID:   SystemOwnerID,
		CreatedAt: registry.CreatedAt.Format(time.RFC3339),
		UpdatedAt: registry.UpdatedAt.Format(time.RFC3339),
	}, nil
}
