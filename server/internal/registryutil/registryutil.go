package registryutil

import (
	"context"

	"github.com/cshum/imagor-studio/server/internal/registrystore"
)

// ConfigProvider interface for configuration methods
type ConfigProvider interface {
	GetByRegistryKey(registryKey string) (effectiveValue string, exists bool)
}

// EffectiveValueResult represents the result of a registry value lookup
type EffectiveValueResult struct {
	Key                  string
	Value                string
	Exists               bool
	IsOverriddenByConfig bool
	IsEncrypted          bool
}

// GetEffectiveValue returns the effective value for a single key
// This is a convenience function that returns the first result from GetEffectiveValues
func GetEffectiveValue(ctx context.Context, registryStore registrystore.Store, cfg ConfigProvider, key string) EffectiveValueResult {
	results := GetEffectiveValues(ctx, registryStore, cfg, key)
	if len(results) > 0 {
		return results[0]
	}
	// This should never happen since we pass exactly one key, but handle it gracefully
	return EffectiveValueResult{
		Key:                  key,
		Value:                "",
		Exists:               false,
		IsOverriddenByConfig: false,
	}
}

// GetEffectiveValues returns effective values for multiple keys using batch operations
// Uses variadic parameters for clean syntax
func GetEffectiveValues(ctx context.Context, registryStore registrystore.Store, cfg ConfigProvider, keys ...string) []EffectiveValueResult {
	if len(keys) == 0 {
		return []EffectiveValueResult{}
	}

	results := make([]EffectiveValueResult, len(keys))

	// First, check config overrides for all keys
	configOverrides := make(map[string]string)
	if cfg != nil {
		for _, key := range keys {
			if configValue, configExists := cfg.GetByRegistryKey(key); configExists {
				configOverrides[key] = configValue
			}
		}
	}

	// Collect keys that need registry lookup (not overridden by config)
	var registryKeys []string
	for _, key := range keys {
		if _, isOverridden := configOverrides[key]; !isOverridden {
			registryKeys = append(registryKeys, key)
		}
	}

	// Batch fetch from registry for non-overridden keys
	var registryEntries []*registrystore.Registry
	if registryStore != nil && len(registryKeys) > 0 {
		var err error
		registryEntries, err = registryStore.GetMulti(ctx, registrystore.SystemOwnerID, registryKeys)
		if err != nil {
			// On error, treat as if no registry entries found
			registryEntries = []*registrystore.Registry{}
		}
	}

	// Create a map for quick registry lookup with encryption info
	type registryInfo struct {
		Value       string
		IsEncrypted bool
	}
	registryMap := make(map[string]registryInfo)
	for _, entry := range registryEntries {
		registryMap[entry.Key] = registryInfo{
			Value:       entry.Value,
			IsEncrypted: entry.IsEncrypted,
		}
	}

	// Build results in the same order as input keys
	for i, key := range keys {
		if configValue, isOverridden := configOverrides[key]; isOverridden {
			results[i] = EffectiveValueResult{
				Key:                  key,
				Value:                configValue,
				Exists:               true,
				IsOverriddenByConfig: true,
				IsEncrypted:          false, // Config overrides are never encrypted
			}
		} else if registryInfo, exists := registryMap[key]; exists {
			results[i] = EffectiveValueResult{
				Key:                  key,
				Value:                registryInfo.Value,
				Exists:               true,
				IsOverriddenByConfig: false,
				IsEncrypted:          registryInfo.IsEncrypted,
			}
		} else {
			results[i] = EffectiveValueResult{
				Key:                  key,
				Value:                "",
				Exists:               false,
				IsOverriddenByConfig: false,
				IsEncrypted:          false,
			}
		}
	}

	return results
}
