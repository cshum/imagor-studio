package license

import (
	"context"
	"strings"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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

func TestGenerateValidLicenseKey(t *testing.T) {
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
			// Generate a valid license key
			key := GenerateLicenseKey(tt.licenseType, tt.email)

			// Verify the key is not empty and has expected format
			assert.NotEmpty(t, key)
			assert.True(t, len(key) > 10, "License key should be reasonably long")

			// Verify the key can be validated
			isValid, licenseType, email := ValidateLicenseKey(key)
			assert.True(t, isValid, "Generated license key should be valid")
			assert.Equal(t, tt.licenseType, licenseType)
			assert.Equal(t, tt.email, email)
		})
	}
}

func TestValidateLicenseKey(t *testing.T) {
	tests := []struct {
		name        string
		key         string
		expectValid bool
		expectType  string
		expectEmail string
	}{
		{
			name:        "Valid personal license",
			key:         GenerateLicenseKey("personal", "test@example.com"),
			expectValid: true,
			expectType:  "personal",
			expectEmail: "test@example.com",
		},
		{
			name:        "Invalid key format",
			key:         "INVALID-KEY-123",
			expectValid: false,
			expectType:  "",
			expectEmail: "",
		},
		{
			name:        "Empty key",
			key:         "",
			expectValid: false,
			expectType:  "",
			expectEmail: "",
		},
		{
			name:        "Malformed key",
			key:         "IMGR-MALFORMED",
			expectValid: false,
			expectType:  "",
			expectEmail: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid, licenseType, email := ValidateLicenseKey(tt.key)
			assert.Equal(t, tt.expectValid, isValid)
			assert.Equal(t, tt.expectType, licenseType)
			assert.Equal(t, tt.expectEmail, email)
		})
	}
}

func TestLicenseService_GetLicenseStatus_Unlicensed(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	service := NewService(store)

	status, err := service.GetLicenseStatus(ctx)
	require.NoError(t, err)

	assert.False(t, status.IsLicensed)
	assert.Empty(t, status.LicenseType)
	assert.Empty(t, status.Email)
	assert.Equal(t, "No license found", status.Message)
	assert.Equal(t, "Support ongoing development with a license", *status.SupportMessage)
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
			assert.NotEmpty(t, payload.Features)
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
	service := NewService(store)

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
	assert.Equal(t, "commercial", *status.LicenseType)
	assert.Equal(t, "business@company.com", *status.Email)
	assert.Contains(t, status.Message, "activated successfully")

	// Test getting status after activation
	status, err = service.GetLicenseStatus(ctx)
	require.NoError(t, err)

	assert.True(t, status.IsLicensed)
	assert.Equal(t, "commercial", *status.LicenseType)
	assert.Equal(t, "business@company.com", *status.Email)
	assert.Equal(t, "Licensed", status.Message)
}

func TestLicenseService_InvalidSignedLicense(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	service := NewService(store)

	// Test with invalid license key
	status, err := service.ActivateLicense(ctx, "IMGR-invalid.license")
	require.NoError(t, err)

	assert.False(t, status.IsLicensed)
	assert.Contains(t, status.Message, "Invalid license key")
}

func TestLicenseService_ActivateLicense_Success(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	service := NewService(store)

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
	assert.Equal(t, "personal", *status.LicenseType)
	assert.Equal(t, "test@example.com", *status.Email)
	assert.Equal(t, "License activated successfully! Thank you for supporting development.", status.Message)
	assert.Empty(t, status.SupportMessage)

	// Verify license is stored in registry
	storedLicense, err := store.Get(ctx, registrystore.SystemOwnerID, "license.key")
	require.NoError(t, err)
	require.NotNil(t, storedLicense)
	assert.Equal(t, licenseKey, storedLicense.Value)
	assert.True(t, storedLicense.IsEncrypted)
}

func TestLicenseService_ActivateLicense_InvalidKey(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	service := NewService(store)

	status, err := service.ActivateLicense(ctx, "INVALID-KEY")
	require.NoError(t, err)

	assert.False(t, status.IsLicensed)
	assert.Empty(t, status.LicenseType)
	assert.Empty(t, status.Email)
	assert.Contains(t, status.Message, "Invalid license key")
	assert.Empty(t, status.SupportMessage)
}

func TestLicenseService_GetLicenseStatus_Licensed(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	service := NewService(store)

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
	status, err := service.GetLicenseStatus(ctx)
	require.NoError(t, err)

	assert.True(t, status.IsLicensed)
	assert.Equal(t, "commercial", *status.LicenseType)
	assert.Equal(t, "business@company.com", *status.Email)
	assert.Equal(t, "Licensed", status.Message)
	assert.Empty(t, status.SupportMessage)
}

func TestLicenseService_ActivateLicense_OverwriteExisting(t *testing.T) {
	ctx := context.Background()
	store := newMockRegistryStore()
	service := NewService(store)

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
	assert.Equal(t, "commercial", *status.LicenseType)
	assert.Equal(t, "second@example.com", *status.Email)

	// Verify the stored license is the second one
	storedLicense, err := store.Get(ctx, registrystore.SystemOwnerID, "license.key")
	require.NoError(t, err)
	require.NotNil(t, storedLicense)
	assert.Equal(t, secondKey, storedLicense.Value)
}

func TestLicenseKeyGeneration_Consistency(t *testing.T) {
	// Test that the same input generates the same key
	licenseType := "personal"
	email := "test@example.com"

	key1 := GenerateLicenseKey(licenseType, email)
	key2 := GenerateLicenseKey(licenseType, email)

	assert.Equal(t, key1, key2, "Same input should generate same license key")
}

func TestLicenseKeyGeneration_Uniqueness(t *testing.T) {
	// Test that different inputs generate different keys
	key1 := GenerateLicenseKey("personal", "user1@example.com")
	key2 := GenerateLicenseKey("personal", "user2@example.com")
	key3 := GenerateLicenseKey("commercial", "user1@example.com")

	assert.NotEqual(t, key1, key2, "Different emails should generate different keys")
	assert.NotEqual(t, key1, key3, "Different license types should generate different keys")
	assert.NotEqual(t, key2, key3, "Different combinations should generate different keys")
}
