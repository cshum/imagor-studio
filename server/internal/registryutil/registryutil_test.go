package registryutil

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
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
	logger := zap.NewNop()

	// Mock config provider with override
	mockConfig := &MockConfigProvider{
		overrides: map[string]string{
			"config.storage_type": "s3",
		},
	}

	// Test that config override takes precedence
	value, exists := GetEffectiveValue(nil, mockConfig, "config.storage_type", logger)

	assert.True(t, exists)
	assert.Equal(t, "s3", value)
}

func TestGetEffectiveValue_NoConfigProvider(t *testing.T) {
	logger := zap.NewNop()

	// Test with nil config provider and nil registry store
	value, exists := GetEffectiveValue(nil, nil, "config.storage_type", logger)

	assert.False(t, exists)
	assert.Equal(t, "", value)
}

func TestGetEffectiveValueWithDefault(t *testing.T) {
	logger := zap.NewNop()

	// Test with no config or registry - should return default
	value := GetEffectiveValueWithDefault(nil, nil, "config.storage_type", "file", logger)

	assert.Equal(t, "file", value)
}

func TestGetEffectiveValueWithDefault_ConfigOverride(t *testing.T) {
	logger := zap.NewNop()

	// Mock config provider with override
	mockConfig := &MockConfigProvider{
		overrides: map[string]string{
			"config.storage_type": "s3",
		},
	}

	// Test that config override is returned instead of default
	value := GetEffectiveValueWithDefault(nil, mockConfig, "config.storage_type", "file", logger)

	assert.Equal(t, "s3", value)
}
