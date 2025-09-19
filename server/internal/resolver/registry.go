package resolver

import (
	"context"
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
)

// SetUserRegistry sets user-specific registry (unified flexible API)
func (r *mutationResolver) SetUserRegistry(ctx context.Context, entry *gql.RegistryEntryInput, entries []*gql.RegistryEntryInput, ownerID *string) ([]*gql.UserRegistry, error) {
	// Validate input: exactly one of entry or entries must be provided
	if (entry != nil && len(entries) > 0) || (entry == nil && len(entries) == 0) {
		return nil, fmt.Errorf("exactly one of 'entry' or 'entries' must be provided")
	}

	effectiveUserID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	// Build namespaced owner ID
	effectiveOwnerID := registrystore.UserOwnerID(effectiveUserID)

	// Convert GraphQL input to registrystore entries
	var registryEntries []*registrystore.Registry

	if entry != nil {
		// Single entry operation
		registryEntries = []*registrystore.Registry{{
			Key:         entry.Key,
			Value:       entry.Value,
			IsEncrypted: entry.IsEncrypted,
		}}
	} else {
		// Multi entries operation
		for _, e := range entries {
			registryEntries = append(registryEntries, &registrystore.Registry{
				Key:         e.Key,
				Value:       e.Value,
				IsEncrypted: e.IsEncrypted,
			})
		}
	}

	// Use SetMulti for better performance
	registries, err := r.registryStore.SetMulti(ctx, effectiveOwnerID, registryEntries)
	if err != nil {
		return nil, fmt.Errorf("failed to set user registry: %w", err)
	}

	var result []*gql.UserRegistry
	for _, registry := range registries {
		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		result = append(result, &gql.UserRegistry{
			Key:         registry.Key,
			Value:       value,
			IsEncrypted: registry.IsEncrypted,
		})
	}

	return result, nil
}


// DeleteUserRegistry deletes user-specific registry (unified flexible API)
func (r *mutationResolver) DeleteUserRegistry(ctx context.Context, key *string, keys []string, ownerID *string) (bool, error) {
	// Validate input: exactly one of key or keys must be provided
	if (key != nil && len(keys) > 0) || (key == nil && len(keys) == 0) {
		return false, fmt.Errorf("exactly one of 'key' or 'keys' must be provided")
	}

	effectiveUserID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return false, err
	}

	// Build namespaced owner ID
	effectiveOwnerID := registrystore.UserOwnerID(effectiveUserID)

	if key != nil {
		// Single key operation
		err = r.registryStore.Delete(ctx, effectiveOwnerID, *key)
		if err != nil {
			return false, fmt.Errorf("failed to delete user registry: %w", err)
		}
	} else {
		// Multi key operation
		err = r.registryStore.DeleteMulti(ctx, effectiveOwnerID, keys)
		if err != nil {
			return false, fmt.Errorf("failed to delete user registries: %w", err)
		}
	}

	return true, nil
}

// ListUserRegistry lists user-specific registry
func (r *queryResolver) ListUserRegistry(ctx context.Context, prefix *string, ownerID *string) ([]*gql.UserRegistry, error) {
	effectiveUserID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	// Build namespaced owner ID
	effectiveOwnerID := registrystore.UserOwnerID(effectiveUserID)

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
			IsEncrypted: registry.IsEncrypted,
		}
	}
	return result, nil
}

// GetUserRegistry gets specific user registry (unified flexible API)
func (r *queryResolver) GetUserRegistry(ctx context.Context, key *string, keys []string, ownerID *string) ([]*gql.UserRegistry, error) {
	// Validate input: exactly one of key or keys must be provided
	if (key != nil && len(keys) > 0) || (key == nil && len(keys) == 0) {
		return nil, fmt.Errorf("exactly one of 'key' or 'keys' must be provided")
	}

	effectiveUserID, err := GetEffectiveTargetUserID(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	// Build namespaced owner ID
	effectiveOwnerID := registrystore.UserOwnerID(effectiveUserID)

	var registries []*registrystore.Registry

	if key != nil {
		// Single key operation
		registry, err := r.registryStore.Get(ctx, effectiveOwnerID, *key)
		if err != nil {
			return nil, fmt.Errorf("failed to get user registry: %w", err)
		}
		if registry != nil {
			registries = []*registrystore.Registry{registry}
		}
	} else {
		// Multi key operation
		var err error
		registries, err = r.registryStore.GetMulti(ctx, effectiveOwnerID, keys)
		if err != nil {
			return nil, fmt.Errorf("failed to get user registries: %w", err)
		}
	}

	var result []*gql.UserRegistry
	for _, registry := range registries {
		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		result = append(result, &gql.UserRegistry{
			Key:         registry.Key,
			Value:       value,
			IsEncrypted: registry.IsEncrypted,
		})
	}

	return result, nil
}

// SetSystemRegistry sets system-wide registry (unified flexible API)
func (r *mutationResolver) SetSystemRegistry(ctx context.Context, entry *gql.RegistryEntryInput, entries []*gql.RegistryEntryInput) ([]*gql.SystemRegistry, error) {
	// Validate input: exactly one of entry or entries must be provided
	if (entry != nil && len(entries) > 0) || (entry == nil && len(entries) == 0) {
		return nil, fmt.Errorf("exactly one of 'entry' or 'entries' must be provided")
	}

	// Only admins can write system registry
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, fmt.Errorf("admin permission required for system registry write: %w", err)
	}

	// Prepare entries for validation
	var allEntries []*gql.RegistryEntryInput
	if entry != nil {
		allEntries = []*gql.RegistryEntryInput{entry}
	} else {
		allEntries = entries
	}

	// Check all entries for config conflicts first
	for _, e := range allEntries {
		_, configExists := r.config.GetByRegistryKey(e.Key)
		if configExists {
			return nil, fmt.Errorf("cannot set registry key '%s': this configuration is managed by external config", e.Key)
		}
	}

	// Convert GraphQL input to registrystore entries
	var registryEntries []*registrystore.Registry
	for _, e := range allEntries {
		registryEntries = append(registryEntries, &registrystore.Registry{
			Key:         e.Key,
			Value:       e.Value,
			IsEncrypted: e.IsEncrypted,
		})
	}

	// Use SetMulti for better performance
	registries, err := r.registryStore.SetMulti(ctx, registrystore.SystemOwnerID, registryEntries)
	if err != nil {
		return nil, fmt.Errorf("failed to set system registry: %w", err)
	}

	var result []*gql.SystemRegistry
	for _, registry := range registries {
		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		// Check for config override
		configValue, configExists := r.config.GetByRegistryKey(registry.Key)
		var effectiveValue string
		if configExists {
			effectiveValue = configValue
		} else {
			effectiveValue = value
		}

		result = append(result, &gql.SystemRegistry{
			Key:                  registry.Key,
			Value:                effectiveValue,
			IsEncrypted:          registry.IsEncrypted,
			IsOverriddenByConfig: configExists,
		})
	}

	return result, nil
}

// DeleteSystemRegistry deletes system-wide registry (unified flexible API, admin only)
func (r *mutationResolver) DeleteSystemRegistry(ctx context.Context, key *string, keys []string) (bool, error) {
	// Validate input: exactly one of key or keys must be provided
	if (key != nil && len(keys) > 0) || (key == nil && len(keys) == 0) {
		return false, fmt.Errorf("exactly one of 'key' or 'keys' must be provided")
	}

	// Only admins can delete system registry
	if err := RequireAdminPermission(ctx); err != nil {
		return false, fmt.Errorf("admin permission required for system registry delete: %w", err)
	}

	if key != nil {
		// Single key operation
		err := r.registryStore.Delete(ctx, registrystore.SystemOwnerID, *key)
		if err != nil {
			return false, fmt.Errorf("failed to delete system registry: %w", err)
		}
	} else {
		// Multi key operation
		err := r.registryStore.DeleteMulti(ctx, registrystore.SystemOwnerID, keys)
		if err != nil {
			return false, fmt.Errorf("failed to delete system registries: %w", err)
		}
	}

	return true, nil
}

// ListSystemRegistry lists system-wide registry (open read access)
func (r *queryResolver) ListSystemRegistry(ctx context.Context, prefix *string) ([]*gql.SystemRegistry, error) {
	// All authenticated users can read system registry
	// No additional permission check needed

	registryList, err := r.registryStore.List(ctx, registrystore.SystemOwnerID, prefix)
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
		configValue, configExists := r.config.GetByRegistryKey(registry.Key)
		var effectiveValue string
		if configExists {
			effectiveValue = configValue
		} else {
			effectiveValue = value
		}

		result[i] = &gql.SystemRegistry{
			Key:                  registry.Key,
			Value:                effectiveValue,
			IsEncrypted:          registry.IsEncrypted,
			IsOverriddenByConfig: configExists,
		}
	}
	return result, nil
}

// GetSystemRegistry gets specific system registry (unified flexible API)
func (r *queryResolver) GetSystemRegistry(ctx context.Context, key *string, keys []string) ([]*gql.SystemRegistry, error) {
	// Validate input: exactly one of key or keys must be provided
	if (key != nil && len(keys) > 0) || (key == nil && len(keys) == 0) {
		return nil, fmt.Errorf("exactly one of 'key' or 'keys' must be provided")
	}

	// All authenticated users can read system registry
	// No additional permission check needed

	var registries []*registrystore.Registry

	if key != nil {
		// Single key operation
		registry, err := r.registryStore.Get(ctx, registrystore.SystemOwnerID, *key)
		if err != nil {
			return nil, fmt.Errorf("failed to get system registry: %w", err)
		}
		if registry != nil {
			registries = []*registrystore.Registry{registry}
		}
	} else {
		// Multi key operation
		var err error
		registries, err = r.registryStore.GetMulti(ctx, registrystore.SystemOwnerID, keys)
		if err != nil {
			return nil, fmt.Errorf("failed to get system registries: %w", err)
		}
	}

	var result []*gql.SystemRegistry
	for _, registry := range registries {
		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		// Check for config override
		configValue, configExists := r.config.GetByRegistryKey(registry.Key)
		var effectiveValue string
		if configExists {
			effectiveValue = configValue
		} else {
			effectiveValue = value
		}

		result = append(result, &gql.SystemRegistry{
			Key:                  registry.Key,
			Value:                effectiveValue,
			IsEncrypted:          registry.IsEncrypted,
			IsOverriddenByConfig: configExists,
		})
	}

	return result, nil
}
