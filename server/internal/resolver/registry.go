package resolver

import (
	"context"
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
)

// licenseRequiredRegistryKeys contains registry keys that require a valid license.
// Writes are rejected for unlicensed instances; config-override values in read
// responses are suppressed so they cannot bypass the frontend license gate.
var licenseRequiredRegistryKeys = map[string]bool{
	"config.app_title": true,
	"config.app_url":   true,
}

// checkLicensed returns true if the instance is licensed.
// Returns true when licenseService is nil (test / embedded-dev mode).
func (r *Resolver) checkLicensed(ctx context.Context) bool {
	if r.licenseService == nil {
		return true
	}
	status, err := r.licenseService.GetLicenseStatus(ctx, false)
	if err != nil {
		return false
	}
	return status.IsLicensed
}

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

// formatLicenseTypeForDisplay converts license type to display-friendly format
func formatLicenseTypeForDisplay(licenseType string) string {
	switch licenseType {
	case "early_bird":
		return "Early Bird Licensed"
	case "commercial":
		return "Commercial Licensed"
	case "enterprise":
		return "Enterprise Licensed"
	default:
		return "Licensed"
	}
}

// LicenseStatus gets license status information for admin users
func (r *queryResolver) LicenseStatus(ctx context.Context) (*gql.LicenseStatus, error) {
	// Only admins can access detailed license information
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, fmt.Errorf("admin permission required for license information: %w", err)
	}

	// Use the unified method with includeDetails=true for admin access
	status, err := r.licenseService.GetLicenseStatus(ctx, true)
	if err != nil {
		return nil, fmt.Errorf("failed to get license info: %w", err)
	}

	return &gql.LicenseStatus{
		IsLicensed:           status.IsLicensed,
		LicenseType:          status.LicenseType,
		Email:                status.Email,
		Message:              status.Message,
		IsOverriddenByConfig: status.IsOverriddenByConfig,
		SupportMessage:       status.SupportMessage,
		MaskedLicenseKey:     status.MaskedLicenseKey,
		ActivatedAt:          status.ActivatedAt,
	}, nil
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

	// Reject writes for license-required keys when the instance is unlicensed
	for _, e := range allEntries {
		if licenseRequiredRegistryKeys[e.Key] {
			if !r.checkLicensed(ctx) {
				return nil, fmt.Errorf("a valid license is required to set '%s'", e.Key)
			}
			break // license only needs to be verified once
		}
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

	var registryList []*registrystore.Registry

	// Only access database if NOT in embedded mode
	if !r.config.IsEmbeddedMode() {
		var err error
		registryList, err = r.registryStore.List(ctx, registrystore.SystemOwnerID, prefix)
		if err != nil {
			return nil, fmt.Errorf("failed to list system registry: %w", err)
		}
	}
	// If embedded mode, registryList stays empty []

	var result []*gql.SystemRegistry

	// Lazily evaluate license status — called at most once per request, only when needed.
	var licenseChecked, licensed bool
	getLicensed := func() bool {
		if !licenseChecked {
			licenseChecked = true
			licensed = r.checkLicensed(ctx)
		}
		return licensed
	}

	// Process database results (if any)
	for _, registry := range registryList {
		// Skip license-required keys entirely when unlicensed.
		// This covers both DB-stored values and env/flag overrides.
		if licenseRequiredRegistryKeys[registry.Key] && !getLicensed() {
			continue
		}

		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		// Check for config override (env/flag takes priority over DB)
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

	// In embedded mode, we could potentially list all config keys with "config." prefix
	// but since this is a list operation and we don't have a way to enumerate all config keys,
	// we'll just return the empty result. Config values will be available via GetSystemRegistry
	// when specifically requested.

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

	// Only access database if NOT in embedded mode
	if !r.config.IsEmbeddedMode() {
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
	}
	// If embedded mode, registries stays empty []

	// Determine which keys to check for config overrides
	var keysToCheck []string
	if key != nil {
		keysToCheck = []string{*key}
	} else {
		keysToCheck = keys
	}

	var result []*gql.SystemRegistry

	// Lazily evaluate license status — called at most once per request, only when needed.
	var licenseChecked, licensed bool
	getLicensed := func() bool {
		if !licenseChecked {
			licenseChecked = true
			licensed = r.checkLicensed(ctx)
		}
		return licensed
	}

	// Process database results (if any)
	for _, registry := range registries {
		// Skip license-required keys entirely when unlicensed.
		// This covers both DB-stored values and env/flag overrides.
		if licenseRequiredRegistryKeys[registry.Key] && !getLicensed() {
			continue
		}

		// Hide encrypted values in GraphQL responses
		value := registry.Value
		if registry.IsEncrypted {
			value = ""
		}

		// Check for config override (env/flag takes priority over DB)
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

	// In embedded mode, also check for config-only values that weren't in database
	if r.config.IsEmbeddedMode() {
		for _, k := range keysToCheck {
			// Skip license-required keys if not licensed (suppress env/flag values)
			if licenseRequiredRegistryKeys[k] && !getLicensed() {
				continue
			}
			configValue, configExists := r.config.GetByRegistryKey(k)
			if configExists {
				// Check if we already added this key from database results
				found := false
				for _, existing := range result {
					if existing.Key == k {
						found = true
						break
					}
				}
				if !found {
					result = append(result, &gql.SystemRegistry{
						Key:                  k,
						Value:                configValue,
						IsEncrypted:          false, // Config values are never encrypted
						IsOverriddenByConfig: true,
					})
				}
			}
		}
	}

	return result, nil
}
