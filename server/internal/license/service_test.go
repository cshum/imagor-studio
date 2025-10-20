package license

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"fmt"
	"strings"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// GenerateKeyPair generates a new Ed25519 key pair for license signing
// This should only be used during testing
func GenerateKeyPair() (ed25519.PublicKey, ed25519.PrivateKey, error) {
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate key pair: %w", err)
	}
	return publicKey, privateKey, nil
}

// Mock registry store for testing
type mockRegistryStore struct {
	data map[string]map[string]*registrystore.Registry
}

func newMockRegistryStore() *mockRegistryStore {
	return &mockRegistryStore{
		data: make(map[string]map[string]*registrystore.Registry),
	}
}

func (m *mockRegistryStore) Get(ctx context.Context, ownerID, key string) (*registrystore.Registry, error) {
	if owner, exists := m.data[ownerID]; exists {
		if registry, exists := owner[key]; exists {
			return registry, nil
		}
	}
	return nil, nil
}

func (m *mockRegistryStore) Set(ctx context.Context, ownerID, key, value string, isEncrypted bool) (*registrystore.Registry, error) {
	if m.data[ownerID] == nil {
		m.data[ownerID] = make(map[string]*registrystore.Registry)
	}
	registry := &registrystore.Registry{
		Key:         key,
		Value:       value,
		IsEncrypted: isEncrypted,
	}
	m.data[ownerID][key] = registry
	return registry, nil
}

func (m *mockRegistryStore) Delete(ctx context.Context, ownerID, key string) error {
	if owner, exists := m.data[ownerID]; exists {
		delete(owner, key)
	}
	return nil
}

func (m *mockRegistryStore) List(ctx context.Context, ownerID string, prefix *string) ([]*registrystore.Registry, error) {
	var result []*registrystore.Registry
	if owner, exists := m.data[ownerID]; exists {
		for _, registry := range owner {
			if prefix == nil || len(*prefix) == 0 {
				result = append(result, registry)
			} else {
				// Simple prefix matching for test
				if len(registry.Key) >= len(*prefix) && registry.Key[:len(*prefix)] == *prefix {
					result = append(result, registry)
				}
			}
		}
	}
	return result, nil
}

func (m *mockRegistryStore) GetMulti(ctx context.Context, ownerID string, keys []string) ([]*registrystore.Registry, error) {
	var result []*registrystore.Registry
	for _, key := range keys {
		if registry, err := m.Get(ctx, ownerID, key); err == nil && registry != nil {
			result = append(result, registry)
		}
	}
	return result, nil
}

func (m *mockRegistryStore) SetMulti(ctx context.Context, ownerID string, registries []*registrystore.Registry) ([]*registrystore.Registry, error) {
	var result []*registrystore.Registry
	for _, registry := range registries {
		if saved, err := m.Set(ctx, ownerID, registry.Key, registry.Value, registry.IsEncrypted); err == nil {
			result = append(result, saved)
		}
	}
	return result, nil
}

func (m *mockRegistryStore) DeleteMulti(ctx context.Context, ownerID string, keys []string) error {
	for _, key := range keys {
		m.Delete(ctx, ownerID, key)
	}
	return nil
}

// Mock config provider for testing
type mockConfigProvider struct {
	configValue  string
	configExists bool
}

func newMockConfigProvider() *mockConfigProvider {
	return &mockConfigProvider{
		configExists: false,
	}
}

func (m *mockConfigProvider) GetByRegistryKey(registryKey string) (effectiveValue string, exists bool) {
	return m.configValue, m.configExists
}

func (m *mockConfigProvider) IsEmbeddedMode() bool {
	return false // Default to non-embedded mode for license tests
}

func (m *mockConfigProvider) setConfigOverride(key, value string) {
	if key == "config.license_key" {
		m.configValue = value
		m.configExists = true
	}
}

func (m *mockConfigProvider) clearConfigOverride() {
	m.configExists = false
	m.configValue = ""
}

func TestLicenseService_GetLicenseStatus_Unlicensed(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	config := newMockConfigProvider()
	service := NewService(store, config)

	status, err := service.GetLicenseStatus(ctx, true)
	require.NoError(t, err)

	assert.False(t, status.IsLicensed)
	assert.Empty(t, status.LicenseType)
	assert.Empty(t, status.Email)
	assert.Equal(t, "No license key found", status.Message)
	assert.False(t, status.IsOverriddenByConfig)
}

func TestLicenseService_GetLicenseStatus_ConfigOverride(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	config := newMockConfigProvider()

	// Set config override
	config.setConfigOverride("config.license_key", "IMGR-from-env")

	service := NewService(store, config)

	status, err := service.GetLicenseStatus(ctx, true)
	require.NoError(t, err)

	assert.False(t, status.IsLicensed) // Invalid license key
	assert.True(t, status.IsOverriddenByConfig)
	assert.Contains(t, status.Message, "Invalid license")
}

func TestLicenseService_ActivateLicense_ConfigOverride(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	config := newMockConfigProvider()

	// Set config override
	config.setConfigOverride("config.license_key", "IMGR-from-env")

	service := NewService(store, config)

	status, err := service.ActivateLicense(ctx, "IMGR-new-key")
	require.NoError(t, err)

	assert.False(t, status.IsLicensed)
	assert.Equal(t, "Cannot set license key: this configuration is managed by external config", status.Message)
}

func TestGenerateSignedLicense(t *testing.T) {
	// Generate a test key pair
	publicKey, privateKey, err := GenerateKeyPair()
	require.NoError(t, err)

	tests := []struct {
		name        string
		licenseType string
		email       string
	}{
		{
			name:        "Personal license",
			licenseType: "personal",
			email:       "user@example.com",
		},
		{
			name:        "Commercial license",
			licenseType: "commercial",
			email:       "business@company.com",
		},
		{
			name:        "Enterprise license",
			licenseType: "enterprise",
			email:       "admin@enterprise.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Generate signed license
			licenseKey, err := GenerateSignedLicense(privateKey, tt.licenseType, tt.email)
			require.NoError(t, err)
			assert.NotEmpty(t, licenseKey)
			assert.True(t, strings.HasPrefix(licenseKey, "IMGR-"))
			assert.Contains(t, licenseKey, ".")

			// Verify the license
			payload, err := VerifySignedLicense(publicKey, licenseKey)
			require.NoError(t, err)
			assert.Equal(t, tt.licenseType, payload.Type)
			assert.Equal(t, tt.email, payload.Email)
			assert.Greater(t, payload.IssuedAt, int64(0))
		})
	}
}

func TestVerifySignedLicense_InvalidCases(t *testing.T) {
	publicKey, privateKey, err := GenerateKeyPair()
	require.NoError(t, err)

	// Generate a valid license for comparison
	validLicense, err := GenerateSignedLicense(privateKey, "personal", "test@example.com")
	require.NoError(t, err)

	tests := []struct {
		name        string
		licenseKey  string
		expectError bool
	}{
		{
			name:        "Valid license",
			licenseKey:  validLicense,
			expectError: false,
		},
		{
			name:        "Invalid format - no IMGR prefix",
			licenseKey:  "INVALID-key",
			expectError: true,
		},
		{
			name:        "Invalid format - no dot separator",
			licenseKey:  "IMGR-invalidkey",
			expectError: true,
		},
		{
			name:        "Invalid base64 payload",
			licenseKey:  "IMGR-invalid!@#.validSignature",
			expectError: true,
		},
		{
			name:        "Invalid signature",
			licenseKey:  "IMGR-" + strings.Split(validLicense[5:], ".")[0] + ".invalidSignature",
			expectError: true,
		},
		{
			name:        "Empty license key",
			licenseKey:  "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload, err := VerifySignedLicense(publicKey, tt.licenseKey)
			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, payload)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, payload)
			}
		})
	}
}

func TestLicenseService_RealCryptography(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	config := newMockConfigProvider()
	service := NewService(store, config)

	// Generate a test key pair
	publicKey, privateKey, err := GenerateKeyPair()
	require.NoError(t, err)

	// Temporarily replace the service's public key for testing
	service.publicKey = publicKey

	// Generate a valid signed license
	licenseKey, err := GenerateSignedLicense(privateKey, "commercial", "business@company.com")
	require.NoError(t, err)

	// Test activation
	status, err := service.ActivateLicense(ctx, licenseKey)
	require.NoError(t, err)

	assert.True(t, status.IsLicensed)
	assert.Equal(t, "commercial", status.LicenseType)
	assert.Equal(t, "business@company.com", status.Email)
	assert.Contains(t, status.Message, "activated successfully")

	// Test getting status after activation
	status, err = service.GetLicenseStatus(ctx, true)
	require.NoError(t, err)

	assert.True(t, status.IsLicensed)
	assert.Equal(t, "commercial", status.LicenseType)
	assert.Equal(t, "business@company.com", status.Email)
	assert.Equal(t, "Licensed", status.Message)
	assert.False(t, status.IsOverriddenByConfig)
}

func TestLicenseService_InvalidSignedLicense(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	config := newMockConfigProvider()
	service := NewService(store, config)

	// Test with invalid license key
	status, err := service.ActivateLicense(ctx, "IMGR-invalid.license")
	require.NoError(t, err)

	assert.False(t, status.IsLicensed)
	assert.Contains(t, status.Message, "invalid license key")
}

func TestLicenseService_ActivateLicense_Success(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	config := newMockConfigProvider()
	service := NewService(store, config)

	// Generate a test key pair
	publicKey, privateKey, err := GenerateKeyPair()
	require.NoError(t, err)

	// Temporarily replace the service's public key for testing
	service.publicKey = publicKey

	// Generate a valid signed license key
	licenseKey, err := GenerateSignedLicense(privateKey, "personal", "test@example.com")
	require.NoError(t, err)

	status, err := service.ActivateLicense(ctx, licenseKey)
	require.NoError(t, err)

	assert.True(t, status.IsLicensed)
	assert.Equal(t, "personal", status.LicenseType)
	assert.Equal(t, "test@example.com", status.Email)
	assert.Equal(t, "License activated successfully", status.Message)

	// Verify license is stored in registry with new key format
	storedLicense, err := store.Get(ctx, registrystore.SystemOwnerID, "config.license_key")
	require.NoError(t, err)
	require.NotNil(t, storedLicense)
	assert.Equal(t, licenseKey, storedLicense.Value)
	assert.True(t, storedLicense.IsEncrypted)
}

func TestLicenseService_ActivateLicense_InvalidKey(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	config := newMockConfigProvider()
	service := NewService(store, config)

	status, err := service.ActivateLicense(ctx, "INVALID-KEY")
	require.NoError(t, err)

	assert.False(t, status.IsLicensed)
	assert.Empty(t, status.LicenseType)
	assert.Empty(t, status.Email)
	assert.Contains(t, status.Message, "invalid license key")
}

func TestLicenseService_GetLicenseStatus_Licensed(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	config := newMockConfigProvider()
	service := NewService(store, config)

	// Generate a test key pair
	publicKey, privateKey, err := GenerateKeyPair()
	require.NoError(t, err)

	// Temporarily replace the service's public key for testing
	service.publicKey = publicKey

	// First activate a license
	licenseKey, err := GenerateSignedLicense(privateKey, "commercial", "business@company.com")
	require.NoError(t, err)

	_, err = service.ActivateLicense(ctx, licenseKey)
	require.NoError(t, err)

	// Then check status
	status, err := service.GetLicenseStatus(ctx, true)
	require.NoError(t, err)

	assert.True(t, status.IsLicensed)
	assert.Equal(t, "commercial", status.LicenseType)
	assert.Equal(t, "business@company.com", status.Email)
	assert.Equal(t, "Licensed", status.Message)
	assert.False(t, status.IsOverriddenByConfig)
}

func TestLicenseService_ActivateLicense_OverwriteExisting(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	config := newMockConfigProvider()
	service := NewService(store, config)

	// Generate a test key pair
	publicKey, privateKey, err := GenerateKeyPair()
	require.NoError(t, err)

	// Temporarily replace the service's public key for testing
	service.publicKey = publicKey

	// Activate first license
	firstKey, err := GenerateSignedLicense(privateKey, "personal", "first@example.com")
	require.NoError(t, err)
	_, err = service.ActivateLicense(ctx, firstKey)
	require.NoError(t, err)

	// Activate second license (should overwrite)
	secondKey, err := GenerateSignedLicense(privateKey, "commercial", "second@example.com")
	require.NoError(t, err)
	status, err := service.ActivateLicense(ctx, secondKey)
	require.NoError(t, err)

	assert.True(t, status.IsLicensed)
	assert.Equal(t, "commercial", status.LicenseType)
	assert.Equal(t, "second@example.com", status.Email)

	// Verify the stored license is the second one
	storedLicense, err := store.Get(ctx, registrystore.SystemOwnerID, "config.license_key")
	require.NoError(t, err)
	require.NotNil(t, storedLicense)
	assert.Equal(t, secondKey, storedLicense.Value)
}
