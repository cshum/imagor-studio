package resolver

import (
	"context"
	"fmt"
	"time"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
)

// SetUserRegistry sets user-specific registry (supports multiple values)
func (r *mutationResolver) SetUserRegistry(ctx context.Context, entries []*gql.RegistryEntryInput, ownerID *string) ([]*gql.UserRegistry, error) {
	effectiveOwnerID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	var result []*gql.UserRegistry

	// Handle entries
	for _, entry := range entries {
		registry, err := r.registryStore.Set(ctx, effectiveOwnerID, entry.Key, entry.Value, entry.IsEncrypted)
		if err != nil {
			return nil, fmt.Errorf("failed to set user registry for key %s: %w", entry.Key, err)
		}

		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		result = append(result, &gql.UserRegistry{
			Key:         registry.Key,
			Value:       value,
			OwnerID:     effectiveOwnerID,
			IsEncrypted: registry.IsEncrypted,
			CreatedAt:   registry.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   registry.UpdatedAt.Format(time.RFC3339),
		})
	}

	return result, nil
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
func (r *queryResolver) ListUserRegistry(ctx context.Context, prefix *string, ownerID *string) ([]*gql.UserRegistry, error) {
	effectiveOwnerID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	registryList, err := r.registryStore.List(ctx, effectiveOwnerID, prefix)
	if err != nil {
		return nil, fmt.Errorf("failed to list user registry: %w", err)
	}

	result := make([]*gql.UserRegistry, len(registryList))
	for i, registry := range registryList {
		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		result[i] = &gql.UserRegistry{
			Key:         registry.Key,
			Value:       value,
			OwnerID:     effectiveOwnerID,
			IsEncrypted: registry.IsEncrypted,
			CreatedAt:   registry.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   registry.UpdatedAt.Format(time.RFC3339),
		}
	}
	return result, nil
}

// GetUserRegistry gets specific user registry
func (r *queryResolver) GetUserRegistry(ctx context.Context, key string, ownerID *string) (*gql.UserRegistry, error) {
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

	// Hide encrypted values in GraphQL responses
	value := registry.Value
	if registry.IsEncrypted {
		value = ""
	}

	return &gql.UserRegistry{
		Key:         registry.Key,
		Value:       value,
		OwnerID:     effectiveOwnerID,
		IsEncrypted: registry.IsEncrypted,
		CreatedAt:   registry.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   registry.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// SetSystemRegistry sets system-wide registry (admin only, supports multiple values)
func (r *mutationResolver) SetSystemRegistry(ctx context.Context, entries []*gql.RegistryEntryInput) ([]*gql.SystemRegistry, error) {
	// Only admins can write system registry
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, fmt.Errorf("admin permission required for system registry write: %w", err)
	}

	var result []*gql.SystemRegistry

	// Handle entries
	for _, entry := range entries {
		registry, err := r.registryStore.Set(ctx, SystemOwnerID, entry.Key, entry.Value, entry.IsEncrypted)
		if err != nil {
			return nil, fmt.Errorf("failed to set system registry for key %s: %w", entry.Key, err)
		}

		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		// Check for config override
		effectiveValue, exists := r.config.GetEffectiveValueByRegistryKey(registry.Key)
		isOverridden := exists && effectiveValue != value
		if !exists {
			effectiveValue = value
		}

		result = append(result, &gql.SystemRegistry{
			Key:                  registry.Key,
			Value:                effectiveValue,
			OwnerID:              SystemOwnerID,
			IsEncrypted:          registry.IsEncrypted,
			IsOverriddenByConfig: isOverridden,
			CreatedAt:            registry.CreatedAt.Format(time.RFC3339),
			UpdatedAt:            registry.UpdatedAt.Format(time.RFC3339),
		})
	}

	return result, nil
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
func (r *queryResolver) ListSystemRegistry(ctx context.Context, prefix *string) ([]*gql.SystemRegistry, error) {
	// All authenticated users can read system registry
	// No additional permission check needed

	registryList, err := r.registryStore.List(ctx, SystemOwnerID, prefix)
	if err != nil {
		return nil, fmt.Errorf("failed to list system registry: %w", err)
	}

	result := make([]*gql.SystemRegistry, len(registryList))
	for i, registry := range registryList {
		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		// Check for config override
		effectiveValue, exists := r.config.GetEffectiveValueByRegistryKey(registry.Key)
		isOverridden := exists && effectiveValue != value
		if !exists {
			effectiveValue = value
		}

		result[i] = &gql.SystemRegistry{
			Key:                  registry.Key,
			Value:                effectiveValue,
			OwnerID:              SystemOwnerID,
			IsEncrypted:          registry.IsEncrypted,
			IsOverriddenByConfig: isOverridden,
			CreatedAt:            registry.CreatedAt.Format(time.RFC3339),
			UpdatedAt:            registry.UpdatedAt.Format(time.RFC3339),
		}
	}
	return result, nil
}

// GetSystemRegistry gets specific system registry (open read access)
func (r *queryResolver) GetSystemRegistry(ctx context.Context, key string) (*gql.SystemRegistry, error) {
	// All authenticated users can read system registry
	// No additional permission check needed

	registry, err := r.registryStore.Get(ctx, SystemOwnerID, key)
	if err != nil {
		return nil, fmt.Errorf("failed to get system registry: %w", err)
	}

	if registry == nil {
		return nil, nil
	}

	// Hide encrypted values in GraphQL responses
	value := registry.Value
	if registry.IsEncrypted {
		value = ""
	}

	// Check for config override
	effectiveValue, exists := r.config.GetEffectiveValueByRegistryKey(registry.Key)
	isOverridden := exists && effectiveValue != value
	if !exists {
		effectiveValue = value
	}

	return &gql.SystemRegistry{
		Key:                  registry.Key,
		Value:                effectiveValue,
		OwnerID:              SystemOwnerID,
		IsEncrypted:          registry.IsEncrypted,
		IsOverriddenByConfig: isOverridden,
		CreatedAt:            registry.CreatedAt.Format(time.RFC3339),
		UpdatedAt:            registry.UpdatedAt.Format(time.RFC3339),
	}, nil
}
