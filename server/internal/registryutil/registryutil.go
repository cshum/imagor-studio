package registryutil

import (
	"context"

	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"go.uber.org/zap"
)

// ConfigProvider interface for configuration methods
type ConfigProvider interface {
	GetByRegistryKey(registryKey string) (effectiveValue string, exists bool)
}

// GetEffectiveValue returns the effective value for a registry key, considering config overrides
// Priority: 1. Environment/CLI config override, 2. Registry value
func GetEffectiveValue(registryStore registrystore.Store, cfg ConfigProvider, key string, logger *zap.Logger) (string, bool) {
	// First check if this key is overridden by environment/CLI config
	if cfg != nil {
		if configValue, configExists := cfg.GetByRegistryKey(key); configExists {
			return configValue, true
		}
	}

	// Fall back to registry value if registry store is available
	if registryStore == nil {
		if logger != nil {
			logger.Debug("registryStore is nil in GetEffectiveValue, no registry fallback available")
		}
		return "", false
	}

	ctx := context.Background()
	entry, err := registryStore.Get(ctx, registrystore.SystemOwnerID, key)
	if err != nil {
		if logger != nil {
			logger.Error("Failed to get registry value", zap.String("key", key), zap.Error(err))
		}
		return "", false
	}

	// Handle case where entry is nil (key not found)
	if entry == nil {
		return "", false
	}

	return entry.Value, true
}

// GetEffectiveValueWithDefault returns the effective value or a default if not found
func GetEffectiveValueWithDefault(registryStore registrystore.Store, cfg ConfigProvider, key string, defaultValue string, logger *zap.Logger) string {
	if value, exists := GetEffectiveValue(registryStore, cfg, key, logger); exists {
		return value
	}
	return defaultValue
}
