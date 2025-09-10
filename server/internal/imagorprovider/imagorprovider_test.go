package imagorprovider

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor/imagorpath"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// mockRegistryStore implements a simple in-memory registry store for testing
type mockRegistryStore struct {
	data map[string]string
}

func newMockRegistryStore() *mockRegistryStore {
	return &mockRegistryStore{
		data: make(map[string]string),
	}
}

func (m *mockRegistryStore) Set(ctx context.Context, ownerID, key, value string, isEncrypted bool) (*registrystore.Registry, error) {
	m.data[key] = value
	return &registrystore.Registry{
		Key:         key,
		Value:       value,
		IsEncrypted: isEncrypted,
	}, nil
}

func (m *mockRegistryStore) Get(ctx context.Context, ownerID, key string) (*registrystore.Registry, error) {
	if value, exists := m.data[key]; exists {
		return &registrystore.Registry{
			Key:         key,
			Value:       value,
			IsEncrypted: false,
		}, nil
	}
	return nil, nil // Return nil instead of ErrRegistryNotFound
}

func (m *mockRegistryStore) GetMulti(ctx context.Context, ownerID string, keys []string) ([]*registrystore.Registry, error) {
	var results []*registrystore.Registry
	for _, key := range keys {
		if value, exists := m.data[key]; exists {
			results = append(results, &registrystore.Registry{
				Key:         key,
				Value:       value,
				IsEncrypted: false,
			})
		}
	}
	return results, nil
}

func (m *mockRegistryStore) Delete(ctx context.Context, ownerID, key string) error {
	delete(m.data, key)
	return nil
}

func (m *mockRegistryStore) DeleteMulti(ctx context.Context, ownerID string, keys []string) error {
	for _, key := range keys {
		delete(m.data, key)
	}
	return nil
}

func (m *mockRegistryStore) List(ctx context.Context, ownerID string, prefix *string) ([]*registrystore.Registry, error) {
	var results []*registrystore.Registry
	for key, value := range m.data {
		results = append(results, &registrystore.Registry{
			Key:         key,
			Value:       value,
			IsEncrypted: false,
		})
	}
	return results, nil
}

func (m *mockRegistryStore) SetMulti(ctx context.Context, ownerID string, entries []*registrystore.Registry) ([]*registrystore.Registry, error) {
	var results []*registrystore.Registry
	for _, entry := range entries {
		m.data[entry.Key] = entry.Value
		results = append(results, &registrystore.Registry{
			Key:         entry.Key,
			Value:       entry.Value,
			IsEncrypted: entry.IsEncrypted,
		})
	}
	return results, nil
}

func TestNew(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{} // Mock storage provider

	provider := New(logger, registryStore, cfg, storageProvider)

	assert.NotNil(t, provider)
	assert.Equal(t, ImagorStateDisabled, provider.imagorState)
	assert.NotNil(t, provider.logger)
	assert.NotNil(t, provider.registryStore)
	assert.NotNil(t, provider.config)
	assert.NotNil(t, provider.storageProvider)
}

func TestInitializeWithConfig_Disabled(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode: "disabled",
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)

	require.NoError(t, err)
	assert.Equal(t, ImagorStateDisabled, provider.imagorState)

	config := provider.GetConfig()
	require.NotNil(t, config)
	assert.Equal(t, "disabled", config.Mode)
}

func TestInitializeWithConfig_External(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode:   "external",
		ImagorURL:    "http://localhost:8000",
		ImagorSecret: "test-secret",
		ImagorUnsafe: false,
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)

	require.NoError(t, err)
	assert.Equal(t, ImagorStateConfigured, provider.imagorState)

	config := provider.GetConfig()
	require.NotNil(t, config)
	assert.Equal(t, "external", config.Mode)
	assert.Equal(t, "http://localhost:8000", config.BaseURL)
	assert.Equal(t, "test-secret", config.Secret)
	assert.False(t, config.Unsafe)
}

func TestInitializeWithConfig_Embedded(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode:   "embedded",
		ImagorSecret: "test-secret",
		ImagorUnsafe: true,
	}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)
	err = provider.InitializeWithConfig(cfg)

	require.NoError(t, err)
	assert.Equal(t, ImagorStateConfigured, provider.imagorState)

	config := provider.GetConfig()
	require.NotNil(t, config)
	assert.Equal(t, "embedded", config.Mode)
	assert.Equal(t, "/imagor", config.BaseURL)
	assert.Equal(t, "test-secret", config.Secret)
	assert.True(t, config.Unsafe)

	// Should have an embedded handler
	handler := provider.GetHandler()
	assert.NotNil(t, handler)
}

func TestInitializeWithConfig_FromRegistry(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	// Set up registry configuration
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_configured", "true", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", "external", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_base_url", "http://registry.example.com", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "registry-secret", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_unsafe", "true", false)

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)

	require.NoError(t, err)
	assert.Equal(t, ImagorStateConfigured, provider.imagorState)

	config := provider.GetConfig()
	require.NotNil(t, config)
	assert.Equal(t, "external", config.Mode)
	assert.Equal(t, "http://registry.example.com", config.BaseURL)
	assert.Equal(t, "registry-secret", config.Secret)
	assert.True(t, config.Unsafe)
}

func TestGenerateURL_Disabled(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode: "disabled",
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
		Width:  300,
		Height: 200,
	})

	require.NoError(t, err)
	assert.Equal(t, "/api/file/test%2Fimage.jpg", url)
}

func TestGenerateURL_External_Unsafe(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode:   "external",
		ImagorURL:    "http://localhost:8000",
		ImagorUnsafe: true,
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
		Width:  300,
		Height: 200,
	})

	require.NoError(t, err)
	assert.Contains(t, url, "http://localhost:8000")
	assert.Contains(t, url, "300x200")
	assert.Contains(t, url, "test/image.jpg")
}

func TestGenerateURL_External_Signed(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode:   "external",
		ImagorURL:    "http://localhost:8000",
		ImagorSecret: "test-secret",
		ImagorUnsafe: false,
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
		Width:  300,
		Height: 200,
	})

	require.NoError(t, err)
	assert.Contains(t, url, "http://localhost:8000")
	assert.Contains(t, url, "300x200")
	assert.Contains(t, url, "test/image.jpg")
	// Should contain signature
	assert.Regexp(t, `^http://localhost:8000/[a-zA-Z0-9_=/-]+/`, url)
}

func TestGenerateURL_External_NoSecret(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode:   "external",
		ImagorURL:    "http://localhost:8000",
		ImagorSecret: "",
		ImagorUnsafe: false,
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	_, err = provider.GenerateURL("test/image.jpg", imagorpath.Params{
		Width:  300,
		Height: 200,
	})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "imagor secret is required for signed URLs")
}

func TestGenerateURL_Embedded(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode:   "embedded",
		ImagorSecret: "test-secret",
		ImagorUnsafe: true,
	}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)
	err = provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
		Width:  300,
		Height: 200,
	})

	require.NoError(t, err)
	assert.Contains(t, url, "/imagor/")
	assert.Contains(t, url, "300x200")
	assert.Contains(t, url, "test/image.jpg")
}

func TestGenerateURL_WithFilters(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode:   "external",
		ImagorURL:    "http://localhost:8000",
		ImagorUnsafe: true,
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
		Width:  300,
		Height: 200,
		Filters: imagorpath.Filters{
			{Name: "quality", Args: "85"},
			{Name: "format", Args: "webp"},
		},
	})

	require.NoError(t, err)
	assert.Contains(t, url, "http://localhost:8000")
	assert.Contains(t, url, "300x200")
	assert.Contains(t, url, "test/image.jpg")
	assert.Contains(t, url, "quality(85)")
	assert.Contains(t, url, "format(webp)")
}

func TestIsRestartRequired(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode: "disabled",
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// Disabled state should not require restart
	assert.False(t, provider.IsRestartRequired())

	// Configure imagor
	cfg.ImagorMode = "external"
	cfg.ImagorURL = "http://localhost:8000"
	err = provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// No timestamp set, should not require restart
	assert.False(t, provider.IsRestartRequired())

	// Set a future timestamp
	ctx := context.Background()
	futureTime := time.Now().Add(time.Hour).UnixMilli()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_config_updated_at",
		fmt.Sprintf("%d", futureTime), false)

	// Should require restart
	assert.True(t, provider.IsRestartRequired())
}

func TestReloadFromRegistry(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode: "disabled",
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// Initially disabled
	config := provider.GetConfig()
	assert.Equal(t, "disabled", config.Mode)

	// Set up registry configuration
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_configured", "true", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", "external", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_base_url", "http://new.example.com", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "new-secret", false)

	// Reload from registry
	err = provider.ReloadFromRegistry()
	require.NoError(t, err)

	// Should now be configured from registry
	config = provider.GetConfig()
	assert.Equal(t, "external", config.Mode)
	assert.Equal(t, "http://new.example.com", config.BaseURL)
	assert.Equal(t, "new-secret", config.Secret)
}

func TestReloadFromRegistry_NoConfig(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode: "disabled",
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// Reload from registry with no config
	err = provider.ReloadFromRegistry()
	require.NoError(t, err)

	// Should remain disabled
	config := provider.GetConfig()
	assert.Equal(t, "disabled", config.Mode)
}

func TestBuildConfigFromRegistry_MissingMode(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)

	// Set configured but no mode
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_configured", "true", false)

	config, err := provider.buildConfigFromRegistry()
	require.Error(t, err)
	assert.Nil(t, config)
	assert.Contains(t, err.Error(), "imagor mode not found in registry")
}

func TestBuildConfigFromRegistry_EmbeddedMode(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)

	// Set up embedded mode configuration
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_configured", "true", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", "embedded", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "embedded-secret", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_unsafe", "false", false)

	config, err := provider.buildConfigFromRegistry()
	require.NoError(t, err)
	require.NotNil(t, config)

	assert.Equal(t, "embedded", config.Mode)
	assert.Equal(t, "/imagor", config.BaseURL) // Should be set to /imagor for embedded
	assert.Equal(t, "embedded-secret", config.Secret)
	assert.False(t, config.Unsafe)
	assert.Equal(t, ".imagor-cache", config.CachePath) // Should have default cache path
}

func TestBuildConfigFromRegistry_ExternalModeDefaults(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)

	// Set up external mode with minimal configuration
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_configured", "true", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", "external", false)

	config, err := provider.buildConfigFromRegistry()
	require.NoError(t, err)
	require.NotNil(t, config)

	assert.Equal(t, "external", config.Mode)
	assert.Equal(t, "http://localhost:8000", config.BaseURL) // Default for external
	assert.Equal(t, "", config.Secret)                       // Not set
	assert.False(t, config.Unsafe)                           // Default
}

func TestGetHandler_External(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode: "external",
		ImagorURL:  "http://localhost:8000",
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// External mode should not have a handler
	handler := provider.GetHandler()
	assert.Nil(t, handler)
}

func TestGetHandler_Disabled(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		ImagorMode: "disabled",
	}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// Disabled mode should not have a handler
	handler := provider.GetHandler()
	assert.Nil(t, handler)
}

func TestCreateEmbeddedHandler(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)

	// Test with unsafe mode
	imagorConfig := &ImagorConfig{
		Mode:   "embedded",
		Unsafe: true,
	}

	handler, err := provider.createEmbeddedHandler(imagorConfig)
	require.NoError(t, err)
	assert.NotNil(t, handler)

	// Test with secret
	imagorConfig = &ImagorConfig{
		Mode:   "embedded",
		Secret: "test-secret",
		Unsafe: false,
	}

	handler, err = provider.createEmbeddedHandler(imagorConfig)
	require.NoError(t, err)
	assert.NotNil(t, handler)
}
