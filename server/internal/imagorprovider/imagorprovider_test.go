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

// Test helper functions
func setupTestProvider(t *testing.T, cfg *config.Config) (*Provider, *mockRegistryStore) {
	t.Helper()
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	storageProvider := &storageprovider.Provider{}

	if cfg == nil {
		cfg = &config.Config{}
	}

	provider := New(logger, registryStore, cfg, storageProvider)
	return provider, registryStore
}

func setupTestProviderWithStorage(t *testing.T, cfg *config.Config) (*Provider, *mockRegistryStore) {
	t.Helper()
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()

	if cfg == nil {
		cfg = &config.Config{JWTSecret: "test-jwt-secret"}
	}

	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)
	return provider, registryStore
}

func setupRegistryConfig(t *testing.T, registryStore *mockRegistryStore, mode, baseURL, secret, unsafe string) {
	t.Helper()
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", mode, false)
	if baseURL != "" {
		registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_base_url", baseURL, false)
	}
	if secret != "" {
		registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", secret, false)
	}
	if unsafe != "" {
		registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_unsafe", unsafe, false)
	}
}

func TestNew(t *testing.T) {
	provider, _ := setupTestProvider(t, nil)

	assert.NotNil(t, provider)
	assert.NotNil(t, provider.logger)
	assert.NotNil(t, provider.registryStore)
	assert.NotNil(t, provider.config)
	assert.NotNil(t, provider.storageProvider)
}

func TestInitializeWithConfig(t *testing.T) {
	tests := []struct {
		name           string
		cliArgs        []string
		registryConfig map[string]string
		needsStorage   bool
		expectedMode   ImagorMode
		expectedURL    string
		expectedSecret string
		expectedUnsafe bool
		hasHandler     bool
		description    string
	}{
		{
			name: "External mode via CLI args",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://localhost:8000",
				"--imagor-secret", "test-secret",
				"--jwt-secret", "jwt-secret",
			},
			expectedMode:   ImagorModeExternal,
			expectedURL:    "http://localhost:8000",
			expectedSecret: "test-secret",
			expectedUnsafe: false,
			hasHandler:     false,
			description:    "External mode should be configured via CLI arguments",
		},
		{
			name: "Embedded mode via CLI args",
			cliArgs: []string{
				"--imagor-mode", "embedded",
				"--imagor-secret", "test-secret",
				"--imagor-unsafe",
				"--jwt-secret", "jwt-secret",
			},
			needsStorage:   true,
			expectedMode:   ImagorModeEmbedded,
			expectedURL:    "/imagor",
			expectedSecret: "test-secret",
			expectedUnsafe: true,
			hasHandler:     true,
			description:    "Embedded mode should be configured via CLI arguments",
		},
		{
			name: "Default embedded with minimal CLI args",
			cliArgs: []string{
				"--jwt-secret", "test-jwt-secret",
			},
			needsStorage:   true,
			expectedMode:   ImagorModeEmbedded,
			expectedURL:    "/imagor",
			expectedSecret: "test-jwt-secret",
			expectedUnsafe: false,
			hasHandler:     true,
			description:    "Should default to embedded mode with JWT secret fallback",
		},
		{
			name: "CLI args with registry overrides",
			cliArgs: []string{
				"--imagor-mode", "embedded", // CLI sets embedded
				"--jwt-secret", "jwt-secret",
			},
			registryConfig: map[string]string{
				"config.imagor_mode":     "external",                    // Registry tries to override
				"config.imagor_base_url": "http://registry.example.com", // Registry provides base URL
				"config.imagor_secret":   "registry-secret",             // Registry provides secret
				"config.imagor_unsafe":   "false",
			},
			needsStorage:   true, // CLI wins with embedded
			expectedMode:   ImagorModeEmbedded,
			expectedURL:    "/imagor",
			expectedSecret: "registry-secret", // Registry secret is used since no CLI override
			expectedUnsafe: false,
			hasHandler:     true,
			description:    "CLI args should take priority over registry values",
		},
		{
			name: "Registry configuration with minimal CLI",
			cliArgs: []string{
				"--jwt-secret", "jwt-secret",
			},
			registryConfig: map[string]string{
				"config.imagor_mode":     "external",
				"config.imagor_base_url": "http://registry.example.com",
				"config.imagor_secret":   "registry-secret",
				"config.imagor_unsafe":   "false",
			},
			expectedMode:   ImagorModeExternal,
			expectedURL:    "http://registry.example.com",
			expectedSecret: "registry-secret",
			expectedUnsafe: false,
			hasHandler:     false,
			description:    "Registry values should be used when no CLI override exists",
		},
		{
			name: "Complex signer configuration via CLI",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://localhost:8000",
				"--imagor-secret", "custom-secret",
				"--imagor-signer-type", "sha256",
				"--imagor-signer-truncate", "28",
				"--jwt-secret", "jwt-secret",
			},
			expectedMode:   ImagorModeExternal,
			expectedURL:    "http://localhost:8000",
			expectedSecret: "custom-secret",
			expectedUnsafe: false,
			hasHandler:     false,
			description:    "Complex signer configuration should work via CLI args",
		},
		{
			name: "Mixed CLI and registry signer config",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://localhost:8000",
				"--imagor-signer-type", "sha512", // CLI sets signer type
				"--jwt-secret", "jwt-secret",
			},
			registryConfig: map[string]string{
				"config.imagor_secret":          "registry-secret",
				"config.imagor_signer_type":     "sha256", // Registry tries to override
				"config.imagor_signer_truncate": "32",     // Registry sets truncate
				"config.imagor_unsafe":          "false",
			},
			expectedMode:   ImagorModeExternal,
			expectedURL:    "http://localhost:8000",
			expectedSecret: "registry-secret", // From registry (no CLI override)
			expectedUnsafe: false,
			hasHandler:     false,
			description:    "CLI signer type should override registry, but registry truncate should be used",
		},
		{
			name: "Imagor Unsafe config via cli",
			cliArgs: []string{
				"--imagor-mode", "embedded",
				"--imagor-unsafe",
				"--jwt-secret", "env-jwt-secret",
			},
			needsStorage:   true,
			expectedMode:   ImagorModeEmbedded,
			expectedURL:    "/imagor",
			expectedSecret: "",
			expectedUnsafe: true,
			hasHandler:     true,
			description:    "Should handle environment-like configuration via CLI args",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock registry store
			registryStore := newMockRegistryStore()

			// Set up registry configuration if provided
			if tt.registryConfig != nil {
				ctx := context.Background()
				for key, value := range tt.registryConfig {
					registryStore.Set(ctx, registrystore.SystemOwnerID, key, value, false)
				}
			}

			// Load config using CLI args and registry store (realistic approach)
			cfg, err := config.Load(tt.cliArgs, registryStore)
			require.NoError(t, err, tt.description)
			require.NotNil(t, cfg, tt.description)

			// Create provider with realistic setup
			logger := zap.NewNop()
			var provider *Provider

			if tt.needsStorage {
				// Create a properly initialized storage provider
				storageProvider := storageprovider.New(logger, registryStore, cfg)
				err := storageProvider.InitializeWithConfig(cfg)
				require.NoError(t, err, tt.description)
				provider = New(logger, registryStore, cfg, storageProvider)
			} else {
				storageProvider := &storageprovider.Provider{}
				provider = New(logger, registryStore, cfg, storageProvider)
			}

			// Initialize the provider
			err = provider.Initialize()
			require.NoError(t, err, tt.description)

			// Verify the configuration
			config := provider.GetConfig()
			require.NotNil(t, config, tt.description)
			assert.Equal(t, tt.expectedMode, config.Mode, tt.description)
			assert.Equal(t, tt.expectedURL, config.BaseURL, tt.description)
			assert.Equal(t, tt.expectedSecret, config.Secret, tt.description)
			assert.Equal(t, tt.expectedUnsafe, config.Unsafe, tt.description)

			// Check handler presence
			handler := provider.GetHandler()
			if tt.hasHandler {
				assert.NotNil(t, handler, "Expected handler to be present: %s", tt.description)
			} else {
				assert.Nil(t, handler, "Expected no handler: %s", tt.description)
			}
		})
	}
}

func TestBuildConfigFromRegistry_MissingMode(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)

	// No mode set in registry - should use sensible default
	config, err := provider.buildConfigFromRegistry()
	require.NoError(t, err)
	require.NotNil(t, config)
	assert.Equal(t, ImagorModeEmbedded, config.Mode) // Should default to embedded
}

func TestBuildConfigFromRegistry_SignerConfiguration(t *testing.T) {
	tests := []struct {
		name           string
		cliArgs        []string
		registryConfig map[string]string
		expectedSecret string
		expectedType   string
		expectedTrunc  int
		description    string
	}{
		{
			name: "External with explicit config via CLI",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://test.example.com",
				"--imagor-secret", "test-secret",
				"--imagor-signer-type", "sha256",
				"--imagor-signer-truncate", "28",
				"--jwt-secret", "jwt-secret",
			},
			expectedSecret: "test-secret",
			expectedType:   "sha256",
			expectedTrunc:  28,
			description:    "CLI args should set explicit signer configuration",
		},
		{
			name: "External with defaults via CLI",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://test.example.com",
				"--jwt-secret", "jwt-secret",
			},
			expectedSecret: "jwt-secret",
			expectedType:   "sha256",
			expectedTrunc:  32,
			description:    "Should fall back to JWT secret with SHA256+32 defaults",
		},
		{
			name: "External unsafe mode via CLI",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://test.example.com",
				"--imagor-unsafe",
				"--jwt-secret", "jwt-secret",
			},
			expectedSecret: "",
			expectedType:   "sha1",
			expectedTrunc:  0,
			description:    "Unsafe mode doesn't need secret or special signer config",
		},
		{
			name: "Embedded with explicit config via CLI",
			cliArgs: []string{
				"--imagor-mode", "embedded",
				"--imagor-secret", "test-secret",
				"--imagor-signer-type", "sha512",
				"--imagor-signer-truncate", "40",
				"--jwt-secret", "jwt-secret",
			},
			expectedSecret: "test-secret",
			expectedType:   "sha512",
			expectedTrunc:  40,
			description:    "Embedded mode should respect explicit signer configuration",
		},
		{
			name: "Embedded with defaults via CLI",
			cliArgs: []string{
				"--imagor-mode", "embedded",
				"--jwt-secret", "jwt-secret",
			},
			expectedSecret: "jwt-secret",
			expectedType:   "sha256",
			expectedTrunc:  32,
			description:    "Should fall back to JWT secret with SHA256+32 defaults",
		},
		{
			name: "Embedded unsafe mode via CLI",
			cliArgs: []string{
				"--imagor-mode", "embedded",
				"--imagor-unsafe",
				"--jwt-secret", "jwt-secret",
			},
			expectedSecret: "",
			expectedType:   "sha1",
			expectedTrunc:  0,
			description:    "Unsafe mode doesn't need secret or special signer config",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock registry store
			registryStore := newMockRegistryStore()

			// Set up registry configuration if provided
			if tt.registryConfig != nil {
				ctx := context.Background()
				for key, value := range tt.registryConfig {
					registryStore.Set(ctx, registrystore.SystemOwnerID, key, value, false)
				}
			}

			// Load config using CLI args and registry store
			cfg, err := config.Load(tt.cliArgs, registryStore)
			require.NoError(t, err, tt.description)
			require.NotNil(t, cfg, tt.description)

			// Create provider with loaded config
			logger := zap.NewNop()
			storageProvider := &storageprovider.Provider{}
			provider := New(logger, registryStore, cfg, storageProvider)

			// Build config from registry
			config, err := provider.buildConfigFromRegistry()
			require.NoError(t, err, tt.description)
			require.NotNil(t, config, tt.description)

			assert.Equal(t, tt.expectedSecret, config.Secret, tt.description)
			assert.Equal(t, tt.expectedType, config.SignerType, tt.description)
			assert.Equal(t, tt.expectedTrunc, config.SignerTruncate, tt.description)
		})
	}
}

func TestGenerateURL_BasicScenarios(t *testing.T) {
	tests := []struct {
		name          string
		cliArgs       []string
		needsStorage  bool
		expectError   bool
		expectedURL   string
		expectedRegex string
		errorContains string
		description   string
	}{
		{
			name: "External with secret",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://localhost:8000",
				"--imagor-secret", "test-secret",
				"--jwt-secret", "jwt-secret",
			},
			expectedURL:   "http://localhost:8000",
			expectedRegex: `^http://localhost:8000/[a-zA-Z0-9_=/-]+/`,
			description:   "External mode with secret should generate signed URLs",
		},
		{
			name: "External unsafe mode",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://localhost:8000",
				"--imagor-unsafe",
				"--jwt-secret", "jwt-secret",
			},
			expectedURL: "http://localhost:8000",
			description: "External unsafe mode should generate unsigned URLs",
		},
		{
			name: "External no secret",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://localhost:8000",
				// No jwt-secret and no imagor-secret and not unsafe
			},
			expectError: false,
			description: "External mode without any secret",
		},
		{
			name: "Embedded with secret",
			cliArgs: []string{
				"--imagor-mode", "embedded",
				"--imagor-secret", "test-secret",
				"--jwt-secret", "jwt-secret",
			},
			needsStorage:  true,
			expectedURL:   "/imagor/",
			expectedRegex: `^/imagor/[a-zA-Z0-9_=/-]+/`,
			description:   "Embedded mode with secret should generate signed URLs",
		},
		{
			name: "Embedded unsafe mode",
			cliArgs: []string{
				"--imagor-mode", "embedded",
				"--imagor-unsafe",
				"--jwt-secret", "jwt-secret",
			},
			needsStorage: true,
			expectedURL:  "/imagor/unsafe/",
			description:  "Embedded unsafe mode should generate unsigned URLs",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock registry store
			registryStore := newMockRegistryStore()

			// Load config using CLI args
			cfg, err := config.Load(tt.cliArgs, registryStore)
			require.NoError(t, err, tt.description)
			require.NotNil(t, cfg, tt.description)

			// Create provider with loaded config
			logger := zap.NewNop()
			var provider *Provider

			if tt.needsStorage {
				// Create a properly initialized storage provider
				storageProvider := storageprovider.New(logger, registryStore, cfg)
				err := storageProvider.InitializeWithConfig(cfg)
				require.NoError(t, err, tt.description)
				provider = New(logger, registryStore, cfg, storageProvider)
			} else {
				storageProvider := &storageprovider.Provider{}
				provider = New(logger, registryStore, cfg, storageProvider)
			}

			err = provider.Initialize()
			require.NoError(t, err, tt.description)

			url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
				Width:  300,
				Height: 200,
			})

			if tt.expectError {
				require.Error(t, err, tt.description)
				assert.Contains(t, err.Error(), tt.errorContains, tt.description)
				return
			}

			require.NoError(t, err, tt.description)
			assert.Contains(t, url, tt.expectedURL, tt.description)
			assert.Contains(t, url, "300x200", tt.description)
			assert.Contains(t, url, "test/image.jpg", tt.description)

			if tt.expectedRegex != "" {
				assert.Regexp(t, tt.expectedRegex, url, tt.description)
			}
		})
	}
}

func TestGenerateURL_ConfigurableSigners(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{}
	storageProvider := &storageprovider.Provider{}

	tests := []struct {
		name           string
		mode           string
		baseURL        string
		signerType     string
		signerTruncate int
		secret         string
	}{
		{"External SHA1", "external", "http://localhost:8000", "sha1", 0, "test-secret"},
		{"External SHA256", "external", "http://localhost:8000", "sha256", 28, "test-secret"},
		{"External SHA512", "external", "http://localhost:8000", "sha512", 32, "test-secret"},
		{"Embedded SHA1", "embedded", "/imagor", "sha1", 0, "test-secret"},
		{"Embedded SHA256", "embedded", "/imagor", "sha256", 28, "test-secret"},
		{"Embedded SHA512", "embedded", "/imagor", "sha512", 32, "test-secret"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider := New(logger, registryStore, cfg, storageProvider)

			// Set up configuration directly
			imagorConfig := &ImagorConfig{
				Mode:           ImagorMode(tt.mode),
				BaseURL:        tt.baseURL,
				Secret:         tt.secret,
				Unsafe:         false,
				SignerType:     tt.signerType,
				SignerTruncate: tt.signerTruncate,
			}

			provider.currentConfig = imagorConfig

			url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
				Width:  300,
				Height: 200,
			})

			require.NoError(t, err)
			assert.Contains(t, url, tt.baseURL)
			assert.Contains(t, url, "300x200")
			assert.Contains(t, url, "test/image.jpg")

			// Verify URL contains signature
			if tt.mode == "external" {
				assert.Regexp(t, `^http://localhost:8000/[a-zA-Z0-9_=/-]+/`, url)
			} else {
				assert.Regexp(t, `^/imagor/[a-zA-Z0-9_=/-]+/`, url)
			}
		})
	}
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

func TestBuildConfig_CLIFallback(t *testing.T) {
	tests := []struct {
		name           string
		cliArgs        []string
		expectedSecret string
		expectedUnsafe bool
		expectedType   string
		expectedTrunc  int
		expectedMode   ImagorMode
		expectedURL    string
		description    string
	}{
		{
			name: "Default embedded when no mode specified",
			cliArgs: []string{
				"--jwt-secret", "jwt-secret",
			},
			expectedSecret: "jwt-secret",
			expectedUnsafe: false,
			expectedType:   "sha256", // JWT fallback uses SHA256
			expectedTrunc:  32,       // JWT fallback uses 32
			expectedMode:   ImagorModeEmbedded,
			expectedURL:    "/imagor",
			description:    "Should default to embedded mode with JWT fallback",
		},
		{
			name: "CLI config for embedded mode",
			cliArgs: []string{
				"--imagor-mode", "embedded",
				"--jwt-secret", "jwt-secret",
				"--imagor-secret", "custom-secret",
				"--imagor-unsafe",
				"--imagor-signer-type", "sha1",
				"--imagor-signer-truncate", "28",
			},
			expectedSecret: "custom-secret",
			expectedUnsafe: true,
			expectedType:   "sha1",
			expectedTrunc:  28,
			expectedMode:   ImagorModeEmbedded,
			expectedURL:    "/imagor",
			description:    "Should use explicit CLI configuration for embedded mode",
		},
		{
			name: "CLI config for external mode",
			cliArgs: []string{
				"--imagor-mode", "external",
				"--imagor-base-url", "http://test.example.com",
				"--jwt-secret", "jwt-secret",
				// No imagor-secret, should fall back to JWT
				"--imagor-signer-type", "sha512",
				"--imagor-signer-truncate", "40",
			},
			expectedSecret: "jwt-secret", // Should fall back
			expectedUnsafe: false,
			expectedType:   "sha256", // JWT fallback overrides CLI signer type
			expectedTrunc:  32,       // JWT fallback overrides CLI signer truncate
			expectedMode:   ImagorModeExternal,
			expectedURL:    "http://test.example.com",
			description:    "Should use JWT fallback when no imagor secret provided",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock registry store
			registryStore := newMockRegistryStore()

			// Load config using CLI args
			cfg, err := config.Load(tt.cliArgs, registryStore)
			require.NoError(t, err, tt.description)
			require.NotNil(t, cfg, tt.description)

			// Create provider with loaded config
			logger := zap.NewNop()
			storageProvider := &storageprovider.Provider{}
			provider := New(logger, registryStore, cfg, storageProvider)

			result, err := provider.buildConfig()
			require.NoError(t, err, tt.description)

			assert.Equal(t, tt.expectedMode, result.Mode, tt.description)
			assert.Equal(t, tt.expectedURL, result.BaseURL, tt.description)
			assert.Equal(t, tt.expectedSecret, result.Secret, tt.description)
			assert.Equal(t, tt.expectedUnsafe, result.Unsafe, tt.description)
			assert.Equal(t, tt.expectedType, result.SignerType, tt.description)
			assert.Equal(t, tt.expectedTrunc, result.SignerTruncate, tt.description)
		})
	}
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
	err = provider.Initialize()
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
		JWTSecret: "test-jwt-secret",
	}
	// Create a properly initialized storage provider
	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	provider := New(logger, registryStore, cfg, storageProvider)
	err = provider.Initialize()
	require.NoError(t, err)

	// Initially defaults to embedded
	config := provider.GetConfig()
	assert.Equal(t, ImagorModeEmbedded, config.Mode)

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
	assert.Equal(t, ImagorModeExternal, config.Mode)
	assert.Equal(t, "http://new.example.com", config.BaseURL)
	assert.Equal(t, "new-secret", config.Secret)
}

func TestGetHandler(t *testing.T) {
	t.Run("External mode has no handler", func(t *testing.T) {
		// Create mock registry store
		registryStore := newMockRegistryStore()

		// Load config using CLI args for external mode
		cliArgs := []string{
			"--imagor-mode", "external",
			"--imagor-base-url", "http://localhost:8000",
			"--jwt-secret", "test-jwt-secret",
		}

		cfg, err := config.Load(cliArgs, registryStore)
		require.NoError(t, err)
		require.NotNil(t, cfg)

		// Create provider with loaded config
		logger := zap.NewNop()
		storageProvider := &storageprovider.Provider{}
		provider := New(logger, registryStore, cfg, storageProvider)

		err = provider.Initialize()
		require.NoError(t, err)

		// External mode should not have a handler
		handler := provider.GetHandler()
		assert.Nil(t, handler)
	})

	t.Run("Embedded mode has handler", func(t *testing.T) {
		// Create mock registry store
		registryStore := newMockRegistryStore()

		// Load config using CLI args for embedded mode (default)
		cliArgs := []string{
			"--jwt-secret", "test-jwt-secret",
		}

		cfg, err := config.Load(cliArgs, registryStore)
		require.NoError(t, err)
		require.NotNil(t, cfg)

		// Create provider with loaded config and proper storage
		logger := zap.NewNop()
		storageProvider := storageprovider.New(logger, registryStore, cfg)
		err = storageProvider.InitializeWithConfig(cfg)
		require.NoError(t, err)

		provider := New(logger, registryStore, cfg, storageProvider)
		err = provider.Initialize()
		require.NoError(t, err)

		// Embedded mode should have a handler
		handler := provider.GetHandler()
		assert.NotNil(t, handler)
	})
}

func TestBuildConfigFromRegistry_JWTSecretFallback(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{JWTSecret: "jwt-secret-123"}
	storageProvider := &storageprovider.Provider{}

	provider := New(logger, registryStore, cfg, storageProvider)

	tests := []struct {
		name                string
		mode                string
		hasImagorSecret     bool
		imagorSecret        string
		unsafe              string
		expectedSecret      string
		expectedSignerType  string
		expectedSignerTrunc int
		description         string
	}{
		{
			name:                "External mode no secret not unsafe - should use JWT fallback",
			mode:                "external",
			hasImagorSecret:     false,
			unsafe:              "false",
			expectedSecret:      "jwt-secret-123",
			expectedSignerType:  "sha256",
			expectedSignerTrunc: 32,
			description:         "When no imagor_secret exists and not unsafe, should fall back to JWT secret with SHA256+32",
		},
		{
			name:                "Embedded mode no secret not unsafe - should use JWT fallback",
			mode:                "embedded",
			hasImagorSecret:     false,
			unsafe:              "false",
			expectedSecret:      "jwt-secret-123",
			expectedSignerType:  "sha256",
			expectedSignerTrunc: 32,
			description:         "When no imagor_secret exists and not unsafe, should fall back to JWT secret with SHA256+32",
		},
		{
			name:                "External mode with secret - should use provided secret",
			mode:                "external",
			hasImagorSecret:     true,
			imagorSecret:        "custom-secret",
			unsafe:              "false",
			expectedSecret:      "custom-secret",
			expectedSignerType:  "sha1", // Default when not specified
			expectedSignerTrunc: 0,      // Default when not specified
			description:         "When imagor_secret exists, should use it instead of JWT fallback",
		},
		{
			name:                "External mode unsafe - no secret needed",
			mode:                "external",
			hasImagorSecret:     false,
			unsafe:              "true",
			expectedSecret:      "",     // Unsafe mode doesn't need secret
			expectedSignerType:  "sha1", // Default signer type
			expectedSignerTrunc: 0,      // Default truncate
			description:         "When unsafe mode, doesn't need secret or special signer config",
		},
		{
			name:                "Embedded mode unsafe - no secret needed",
			mode:                "embedded",
			hasImagorSecret:     false,
			unsafe:              "true",
			expectedSecret:      "",     // Unsafe mode doesn't need secret
			expectedSignerType:  "sha1", // Default signer type
			expectedSignerTrunc: 0,      // Default truncate
			description:         "When unsafe mode, doesn't need secret or special signer config",
		},
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
			}

			// Set imagor_secret if specified
			if tt.hasImagorSecret {
				registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", tt.imagorSecret, false)
			}

			// Set unsafe mode if specified
			if tt.unsafe != "" {
				registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_unsafe", tt.unsafe, false)
			}

			config, err := provider.buildConfigFromRegistry()
			require.NoError(t, err, tt.description)
			require.NotNil(t, config, tt.description)

			assert.Equal(t, tt.expectedSecret, config.Secret, tt.description)
			assert.Equal(t, tt.expectedSignerType, config.SignerType, tt.description)
			assert.Equal(t, tt.expectedSignerTrunc, config.SignerTruncate, tt.description)
		})
	}
}

func TestBuildConfigFromRegistry_CLIVsRegistryPriority(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	storageProvider := &storageprovider.Provider{}

	tests := []struct {
		name                string
		cliArgs             []string
		registrySecret      string
		registrySignerType  string
		registryTruncate    string
		expectedSecret      string
		expectedSignerType  string
		expectedSignerTrunc int
		description         string
	}{
		{
			name: "CLI secret overrides registry secret",
			cliArgs: []string{
				"--imagor-secret", "cli-secret",
				"--jwt-secret", "jwt-secret",
			},
			registrySecret:      "registry-secret",
			expectedSecret:      "cli-secret",
			expectedSignerType:  "sha1", // Default
			expectedSignerTrunc: 0,      // Default
			description:         "CLI/ENV config should take priority over registry values",
		},
		{
			name: "CLI signer config overrides registry signer config",
			cliArgs: []string{
				"--imagor-secret", "cli-secret",
				"--imagor-signer-type", "sha512",
				"--imagor-signer-truncate", "40",
				"--jwt-secret", "jwt-secret",
			},
			registrySecret:      "registry-secret",
			registrySignerType:  "sha256",
			registryTruncate:    "28",
			expectedSecret:      "cli-secret",
			expectedSignerType:  "sha512", // From CLI
			expectedSignerTrunc: 40,       // From CLI
			description:         "CLI signer configuration should override registry signer configuration",
		},
		{
			name: "Registry values used when no CLI override",
			cliArgs: []string{
				"--jwt-secret", "jwt-secret",
			},
			registrySecret:      "registry-secret",
			registrySignerType:  "sha256",
			registryTruncate:    "28",
			expectedSecret:      "registry-secret",
			expectedSignerType:  "sha256",
			expectedSignerTrunc: 28,
			description:         "Registry values should be used when no CLI override exists",
		},
		{
			name: "Mixed CLI and registry - CLI takes priority where present",
			cliArgs: []string{
				"--imagor-secret", "cli-secret",
				"--imagor-signer-type", "sha512",
				"--jwt-secret", "jwt-secret",
				// imagor-signer-truncate not in CLI args
			},
			registrySecret:      "registry-secret",
			registrySignerType:  "sha256",
			registryTruncate:    "28",
			expectedSecret:      "cli-secret", // From CLI
			expectedSignerType:  "sha512",     // From CLI
			expectedSignerTrunc: 28,           // From registry (no CLI override)
			description:         "Should use CLI values where present, registry values where CLI not set",
		},
		{
			name: "No CLI, no registry - JWT fallback",
			cliArgs: []string{
				"--jwt-secret", "jwt-secret",
			},
			// No registry values set
			expectedSecret:      "jwt-secret",
			expectedSignerType:  "sha256",
			expectedSignerTrunc: 32,
			description:         "Should fall back to JWT secret with SHA256+32 when no CLI or registry values",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clear registry
			registryStore.data = make(map[string]string)

			// Set up basic configuration
			ctx := context.Background()
			registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", "external", false)
			registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_base_url", "http://test.example.com", false)
			registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_unsafe", "false", false)

			// Set registry values if provided
			if tt.registrySecret != "" {
				registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", tt.registrySecret, false)
			}
			if tt.registrySignerType != "" {
				registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_signer_type", tt.registrySignerType, false)
			}
			if tt.registryTruncate != "" {
				registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_signer_truncate", tt.registryTruncate, false)
			}

			// Load config using the real config system with CLI args
			cfg, err := config.Load(tt.cliArgs, registryStore)
			require.NoError(t, err, tt.description)
			require.NotNil(t, cfg, tt.description)

			// Create provider with the loaded config
			provider := New(logger, registryStore, cfg, storageProvider)
			imagorConfig, err := provider.buildConfigFromRegistry()
			require.NoError(t, err, tt.description)
			require.NotNil(t, imagorConfig, tt.description)

			assert.Equal(t, tt.expectedSecret, imagorConfig.Secret, tt.description)
			assert.Equal(t, tt.expectedSignerType, imagorConfig.SignerType, tt.description)
			assert.Equal(t, tt.expectedSignerTrunc, imagorConfig.SignerTruncate, tt.description)
		})
	}
}

func TestGenerateURL_JWTSecretFallback(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{JWTSecret: "jwt-secret-for-url-test"}
	storageProvider := &storageprovider.Provider{}

	tests := []struct {
		name        string
		mode        string
		baseURL     string
		description string
	}{
		{
			name:        "External mode with JWT secret fallback",
			mode:        "external",
			baseURL:     "http://localhost:8000",
			description: "External mode should generate valid URLs using JWT secret fallback with SHA256+32",
		},
		{
			name:        "Embedded mode with JWT secret fallback",
			mode:        "embedded",
			baseURL:     "/imagor",
			description: "Embedded mode should generate valid URLs using JWT secret fallback with SHA256+32",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			provider := New(logger, registryStore, cfg, storageProvider)

			// Set up configuration with JWT secret fallback (SHA256 + 32-char truncation)
			imagorConfig := &ImagorConfig{
				Mode:           ImagorMode(tt.mode),
				BaseURL:        tt.baseURL,
				Secret:         "jwt-secret-for-url-test", // JWT secret
				Unsafe:         false,
				SignerType:     "sha256", // Fallback default
				SignerTruncate: 32,       // Fallback default
			}

			provider.currentConfig = imagorConfig

			url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
				Width:  300,
				Height: 200,
			})

			require.NoError(t, err, tt.description)
			assert.Contains(t, url, tt.baseURL, tt.description)
			assert.Contains(t, url, "300x200", tt.description)
			assert.Contains(t, url, "test/image.jpg", tt.description)

			// Verify URL contains signature (not unsafe)
			if tt.mode == "external" {
				assert.Regexp(t, `^http://localhost:8000/[a-zA-Z0-9_=/-]+/`, url, tt.description)
			} else {
				assert.Regexp(t, `^/imagor/[a-zA-Z0-9_=/-]+/`, url, tt.description)
			}

			// Generate another URL with different parameters to ensure consistency
			url2, err := provider.GenerateURL("another/test.png", imagorpath.Params{
				Width:  150,
				Height: 100,
			})

			require.NoError(t, err, tt.description)
			assert.Contains(t, url2, tt.baseURL, tt.description)
			assert.Contains(t, url2, "150x100", tt.description)
			assert.Contains(t, url2, "another/test.png", tt.description)

			// URLs should be different (different images/params should produce different signatures)
			assert.NotEqual(t, url, url2, "Different images should produce different URLs")
		})
	}
}

func TestInitializeWithConfig_JWTSecretFallbackIntegration(t *testing.T) {
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()
	cfg := &config.Config{JWTSecret: "integration-jwt-secret"}
	storageProvider := &storageprovider.Provider{}

	// Set up registry with mode but no imagor_secret (should trigger JWT fallback)
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_mode", "external", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_base_url", "http://fallback.example.com", false)
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_unsafe", "false", false)
	// Intentionally NOT setting config.imagor_secret to test fallback

	provider := New(logger, registryStore, cfg, storageProvider)
	err := provider.Initialize()

	require.NoError(t, err)

	config := provider.GetConfig()
	require.NotNil(t, config)
	assert.Equal(t, ImagorModeExternal, config.Mode)
	assert.Equal(t, "http://fallback.example.com", config.BaseURL)
	assert.Equal(t, "integration-jwt-secret", config.Secret) // Should use JWT secret
	assert.Equal(t, "sha256", config.SignerType)             // Should use fallback default
	assert.Equal(t, 32, config.SignerTruncate)               // Should use fallback default
	assert.False(t, config.Unsafe)

	// Test that URL generation works with the fallback configuration
	url, err := provider.GenerateURL("fallback/test.jpg", imagorpath.Params{
		Width:  400,
		Height: 300,
	})

	require.NoError(t, err)
	assert.Contains(t, url, "http://fallback.example.com")
	assert.Contains(t, url, "400x300")
	assert.Contains(t, url, "fallback/test.jpg")
	assert.Regexp(t, `^http://fallback.example.com/[a-zA-Z0-9_=/-]+/`, url)
}
