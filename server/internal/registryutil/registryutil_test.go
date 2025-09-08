package registryutil

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

// MockConfigProvider implements the ConfigProvider interface for testing
type MockConfigProvider struct {
	overrides map[string]string
}

func (m *MockConfigProvider) GetByRegistryKey(registryKey string) (effectiveValue string, exists bool) {
	if m.overrides == nil {
		return "", false
	}
	value, exists := m.overrides[registryKey]
	return value, exists
}

func TestGetEffectiveValue_ConfigOverride(t *testing.T) {
	// Mock config provider with override
	mockConfig := &MockConfigProvider{
		overrides: map[string]string{
			"config.storage_type": "s3",
		},
	}

	// Test that config override takes precedence
	ctx := context.Background()
	result := GetEffectiveValue(ctx, nil, mockConfig, "config.storage_type")

	assert.True(t, result.Exists)
	assert.Equal(t, "s3", result.Value)
	assert.True(t, result.IsOverriddenByConfig)
	assert.False(t, result.IsEncrypted) // Config overrides are never encrypted
	assert.Equal(t, "config.storage_type", result.Key)
}

func TestGetEffectiveValue_NoConfigProvider(t *testing.T) {
	// Test with nil config provider and nil registry store
	ctx := context.Background()
	result := GetEffectiveValue(ctx, nil, nil, "config.storage_type")

	assert.False(t, result.Exists)
	assert.Equal(t, "", result.Value)
	assert.False(t, result.IsOverriddenByConfig)
	assert.False(t, result.IsEncrypted)
	assert.Equal(t, "config.storage_type", result.Key)
}

func TestGetEffectiveValues_MultipleKeys(t *testing.T) {
	// Mock config provider with some overrides
	mockConfig := &MockConfigProvider{
		overrides: map[string]string{
			"config.storage_type": "s3",
			"config.s3_bucket":    "my-bucket",
		},
	}

	// Test multiple keys with variadic syntax
	ctx := context.Background()
	results := GetEffectiveValues(ctx, nil, mockConfig,
		"config.storage_type",
		"config.s3_bucket",
		"config.s3_region")

	assert.Len(t, results, 3)

	// First key - overridden by config
	assert.Equal(t, "config.storage_type", results[0].Key)
	assert.Equal(t, "s3", results[0].Value)
	assert.True(t, results[0].Exists)
	assert.True(t, results[0].IsOverriddenByConfig)
	assert.False(t, results[0].IsEncrypted) // Config overrides are never encrypted

	// Second key - overridden by config
	assert.Equal(t, "config.s3_bucket", results[1].Key)
	assert.Equal(t, "my-bucket", results[1].Value)
	assert.True(t, results[1].Exists)
	assert.True(t, results[1].IsOverriddenByConfig)
	assert.False(t, results[1].IsEncrypted) // Config overrides are never encrypted

	// Third key - not found
	assert.Equal(t, "config.s3_region", results[2].Key)
	assert.Equal(t, "", results[2].Value)
	assert.False(t, results[2].Exists)
	assert.False(t, results[2].IsOverriddenByConfig)
	assert.False(t, results[2].IsEncrypted)
}

func TestGetEffectiveValues_EmptyKeys(t *testing.T) {
	ctx := context.Background()
	results := GetEffectiveValues(ctx, nil, nil)
	assert.Empty(t, results)
}
