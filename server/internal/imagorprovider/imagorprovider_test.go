package imagorprovider

import (
	"context"
	"fmt"
	"strings"
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
	assert.Equal(t, ImagorStateConfigured, provider.imagorState)
	assert.NotNil(t, provider.logger)
	assert.NotNil(t, provider.registryStore)
	assert.NotNil(t, provider.config)
	assert.NotNil(t, provider.storageProvider)
}

func TestInitializeWithConfig_DefaultToEmbedded(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		JWTSecret: "test-jwt-secret",
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
	assert.Equal(t, "test-jwt-secret", config.Secret)
	assert.False(t, config.Unsafe)
	assert.Equal(t, "sha256", config.SignerType)
	assert.Equal(t, 28, config.SignerTruncate)
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

func TestGenerateURL_EmbeddedDefault(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		JWTSecret: "test-jwt-secret",
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
		JWTSecret: "test-jwt-secret",
	}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)
	err = provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// No timestamp set, should not require restart
	assert.False(t, provider.IsRestartRequired())

	// Configure imagor to external mode
	cfg.ImagorMode = "external"
	cfg.ImagorURL = "http://localhost:8000"
	err = provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// Still no timestamp set, should not require restart
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
		JWTSecret: "test-jwt-secret",
	}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)
	err = provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// Initially defaults to embedded
	config := provider.GetConfig()
	assert.Equal(t, "embedded", config.Mode)

	// Set up registry configuration
	ctx := context.Background()
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
		JWTSecret: "test-jwt-secret",
	}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)
	err = provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// Reload from registry with no config
	err = provider.ReloadFromRegistry()
	require.NoError(t, err)

	// Should default to embedded mode
	config := provider.GetConfig()
	assert.Equal(t, "embedded", config.Mode)
}

func TestBuildConfigFromRegistry_MissingMode(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)

	// No mode set in registry
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

func TestGetHandler_EmbeddedDefault(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		JWTSecret: "test-jwt-secret",
	}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)
	err = provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// Embedded mode should have a handler
	handler := provider.GetHandler()
	assert.NotNil(t, handler)
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

func TestGetHashAlgorithm(t *testing.T) {
	tests := []struct {
		name       string
		signerType string
		expected   string
	}{
		{"SHA1 default", "sha1", "sha1"},
		{"SHA1 uppercase", "SHA1", "sha1"},
		{"SHA256", "sha256", "sha256"},
		{"SHA256 uppercase", "SHA256", "sha256"},
		{"SHA512", "sha512", "sha512"},
		{"SHA512 uppercase", "SHA512", "sha512"},
		{"Invalid type defaults to SHA1", "invalid", "sha1"},
		{"Empty string defaults to SHA1", "", "sha1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hashFunc := getHashAlgorithm(tt.signerType)
			hash := hashFunc()

			// Check the hash type by writing some data and checking the size
			hash.Write([]byte("test"))
			result := hash.Sum(nil)

			switch tt.expected {
			case "sha1":
				assert.Equal(t, 20, len(result), "SHA1 should produce 20-byte hash")
			case "sha256":
				assert.Equal(t, 32, len(result), "SHA256 should produce 32-byte hash")
			case "sha512":
				assert.Equal(t, 64, len(result), "SHA512 should produce 64-byte hash")
			}
		})
	}
}

func TestBuildConfigFromRegistry_SignerConfiguration(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{JWTSecret: "jwt-secret"}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)

	tests := []struct {
		name           string
		mode           string
		signerType     string
		signerTruncate string
		expectedType   string
		expectedTrunc  int
	}{
		// External mode tests (configurable)
		{"External default values", "external", "", "", "sha1", 0},
		{"External SHA256 with truncation", "external", "sha256", "28", "sha256", 28},
		{"External SHA512 with truncation", "external", "sha512", "32", "sha512", 32},
		{"External SHA1 explicit", "external", "sha1", "0", "sha1", 0},
		{"External invalid truncate value", "external", "sha256", "invalid", "sha256", 0},
		// Embedded mode tests (fixed)
		{"Embedded mode ignores signer config", "embedded", "sha512", "32", "sha256", 28},
		{"Embedded mode always SHA256+28", "embedded", "", "", "sha256", 28},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clear registry
			registryStore.data = make(map[string]string)

			// Set up basic configuration
			ctx := context.Background()
			registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", tt.mode, false)

			if tt.mode == "external" {
				registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_base_url", "http://test.example.com", false)
				registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "test-secret", false)
			}

			// Set signer configuration if provided
			if tt.signerType != "" {
				registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_signer_type", tt.signerType, false)
			}
			if tt.signerTruncate != "" {
				registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_signer_truncate", tt.signerTruncate, false)
			}

			config, err := provider.buildConfigFromRegistry()
			require.NoError(t, err)
			require.NotNil(t, config)

			assert.Equal(t, tt.expectedType, config.SignerType)
			assert.Equal(t, tt.expectedTrunc, config.SignerTruncate)
		})
	}
}

func TestGenerateURL_External_ConfigurableSigner(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	tests := []struct {
		name           string
		signerType     string
		signerTruncate int
		secret         string
		expectError    bool
	}{
		{"SHA1 default", "sha1", 0, "test-secret", false},
		{"SHA1 with truncation", "sha1", 28, "test-secret", false},
		{"SHA256 default", "sha256", 0, "test-secret", false},
		{"SHA256 with truncation", "sha256", 28, "test-secret", false},
		{"SHA512 default", "sha512", 0, "test-secret", false},
		{"SHA512 with truncation", "sha512", 32, "test-secret", false},
		{"No secret should error", "sha256", 28, "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider := New(logger, registryStore, cfg, storageProvider)

			// Set up configuration
			imagorConfig := &ImagorConfig{
				Mode:           "external",
				BaseURL:        "http://localhost:8000",
				Secret:         tt.secret,
				Unsafe:         false,
				SignerType:     tt.signerType,
				SignerTruncate: tt.signerTruncate,
			}

			provider.currentConfig = imagorConfig
			provider.imagorState = ImagorStateConfigured

			url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
				Width:  300,
				Height: 200,
			})

			if tt.expectError {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Contains(t, url, "http://localhost:8000")
			assert.Contains(t, url, "300x200")
			assert.Contains(t, url, "test/image.jpg")

			// Verify URL contains signature (should start with base URL + signature)
			assert.Regexp(t, `^http://localhost:8000/[a-zA-Z0-9_=/-]+/`, url)
		})
	}
}

func TestGenerateURL_External_SignerTruncation(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)

	// Test that truncation actually affects the signature length
	params := imagorpath.Params{
		Width:  300,
		Height: 200,
		Image:  "test/image.jpg",
	}

	// Generate URL with no truncation
	configNoTrunc := &ImagorConfig{
		Mode:           "external",
		BaseURL:        "http://localhost:8000",
		Secret:         "test-secret",
		SignerType:     "sha256",
		SignerTruncate: 0,
	}
	provider.currentConfig = configNoTrunc
	provider.imagorState = ImagorStateConfigured

	urlNoTrunc, err := provider.GenerateURL("test/image.jpg", params)
	require.NoError(t, err)

	// Generate URL with truncation
	configTrunc := &ImagorConfig{
		Mode:           "external",
		BaseURL:        "http://localhost:8000",
		Secret:         "test-secret",
		SignerType:     "sha256",
		SignerTruncate: 28,
	}
	provider.currentConfig = configTrunc

	urlTrunc, err := provider.GenerateURL("test/image.jpg", params)
	require.NoError(t, err)

	// Extract signatures (part between base URL and path)
	baseURL := "http://localhost:8000/"
	sigNoTrunc := urlNoTrunc[len(baseURL) : strings.Index(urlNoTrunc[len(baseURL):], "/")+len(baseURL)]
	sigTrunc := urlTrunc[len(baseURL) : strings.Index(urlTrunc[len(baseURL):], "/")+len(baseURL)]

	// Truncated signature should be shorter
	assert.True(t, len(sigTrunc) < len(sigNoTrunc),
		"Truncated signature (%d chars) should be shorter than non-truncated (%d chars)",
		len(sigTrunc), len(sigNoTrunc))

	// Truncated signature should be exactly 28 characters (plus padding)
	assert.True(t, len(sigTrunc) <= 28+4, // Allow for base64 padding
		"Truncated signature should be around 28 characters, got %d", len(sigTrunc))
}

func TestGenerateURL_External_DifferentHashAlgorithms(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)

	params := imagorpath.Params{
		Width:  300,
		Height: 200,
		Image:  "test/image.jpg",
	}

	algorithms := []string{"sha1", "sha256", "sha512"}
	urls := make(map[string]string)

	// Generate URLs with different algorithms
	for _, alg := range algorithms {
		config := &ImagorConfig{
			Mode:           "external",
			BaseURL:        "http://localhost:8000",
			Secret:         "test-secret",
			SignerType:     alg,
			SignerTruncate: 0,
		}
		provider.currentConfig = config
		provider.imagorState = ImagorStateConfigured

		url, err := provider.GenerateURL("test/image.jpg", params)
		require.NoError(t, err)
		urls[alg] = url
	}

	// All URLs should be different (different signatures)
	assert.NotEqual(t, urls["sha1"], urls["sha256"], "SHA1 and SHA256 should produce different signatures")
	assert.NotEqual(t, urls["sha256"], urls["sha512"], "SHA256 and SHA512 should produce different signatures")
	assert.NotEqual(t, urls["sha1"], urls["sha512"], "SHA1 and SHA512 should produce different signatures")

	// All should contain the same base URL and parameters
	for alg, url := range urls {
		assert.Contains(t, url, "http://localhost:8000", "Algorithm %s URL should contain base URL", alg)
		assert.Contains(t, url, "300x200", "Algorithm %s URL should contain dimensions", alg)
		assert.Contains(t, url, "test/image.jpg", "Algorithm %s URL should contain image path", alg)
	}
}

func TestInitializeWithConfig_FromRegistry_WithSignerConfig(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	// Set up registry configuration with signer options
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", "external", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_base_url", "http://registry.example.com", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "registry-secret", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_unsafe", "false", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_signer_type", "sha256", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_signer_truncate", "28", false)

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.InitializeWithConfig(cfg)

	require.NoError(t, err)
	assert.Equal(t, ImagorStateConfigured, provider.imagorState)

	config := provider.GetConfig()
	require.NotNil(t, config)
	assert.Equal(t, "external", config.Mode)
	assert.Equal(t, "http://registry.example.com", config.BaseURL)
	assert.Equal(t, "registry-secret", config.Secret)
	assert.False(t, config.Unsafe)
	assert.Equal(t, "sha256", config.SignerType)
	assert.Equal(t, 28, config.SignerTruncate)
}

func TestReloadFromRegistry_WithSignerConfig(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		JWTSecret: "test-jwt-secret",
	}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)
	err = provider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	// Initially defaults to embedded
	config := provider.GetConfig()
	assert.Equal(t, "embedded", config.Mode)

	// Set up registry configuration with signer options
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", "external", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_base_url", "http://new.example.com", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "new-secret", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_signer_type", "sha512", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_signer_truncate", "32", false)

	// Reload from registry
	err = provider.ReloadFromRegistry()
	require.NoError(t, err)

	// Should now be configured from registry with signer options
	config = provider.GetConfig()
	assert.Equal(t, "external", config.Mode)
	assert.Equal(t, "http://new.example.com", config.BaseURL)
	assert.Equal(t, "new-secret", config.Secret)
	assert.Equal(t, "sha512", config.SignerType)
	assert.Equal(t, 32, config.SignerTruncate)
}

func TestGenerateURL_EmbeddedVsExternal_SignerComparison(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{
		JWTSecret: "jwt-secret",
	}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)

	params := imagorpath.Params{
		Width:  300,
		Height: 200,
		Image:  "test/image.jpg",
	}

	// Test embedded mode (uses JWT secret with SHA256 + 28-char truncation)
	embeddedConfig := &ImagorConfig{
		Mode:           "embedded",
		BaseURL:        "/imagor",
		Secret:         "jwt-secret", // Use same secret as JWT secret
		SignerType:     "sha256",     // Explicitly set to match external
		SignerTruncate: 28,           // Explicitly set to match external
	}
	provider.currentConfig = embeddedConfig
	provider.imagorState = ImagorStateConfigured

	embeddedURL, err := provider.GenerateURL("test/image.jpg", params)
	require.NoError(t, err)

	// Test external mode with same configuration as embedded (SHA256 + 28-char truncation)
	externalConfig := &ImagorConfig{
		Mode:           "external",
		BaseURL:        "http://localhost:8000",
		Secret:         "jwt-secret", // Same as JWT secret
		SignerType:     "sha256",
		SignerTruncate: 28,
	}
	provider.currentConfig = externalConfig

	externalURL, err := provider.GenerateURL("test/image.jpg", params)
	require.NoError(t, err)

	// Extract signatures
	embeddedSig := embeddedURL[strings.Index(embeddedURL, "/imagor/")+8 : strings.LastIndex(embeddedURL, "/")]
	externalSig := externalURL[strings.Index(externalURL, "8000/")+5 : strings.LastIndex(externalURL, "/")]

	// Signatures should be identical when using same secret, algorithm, and truncation
	assert.Equal(t, embeddedSig, externalSig,
		"Embedded and external modes should produce identical signatures with same configuration")
}
