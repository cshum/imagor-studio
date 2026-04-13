package imagorprovider

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage"
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
	return &registrystore.Registry{Key: key, Value: value, IsEncrypted: isEncrypted}, nil
}

func (m *mockRegistryStore) Get(ctx context.Context, ownerID, key string) (*registrystore.Registry, error) {
	if value, exists := m.data[key]; exists {
		return &registrystore.Registry{Key: key, Value: value}, nil
	}
	return nil, nil
}

func (m *mockRegistryStore) GetMulti(ctx context.Context, ownerID string, keys []string) ([]*registrystore.Registry, error) {
	var results []*registrystore.Registry
	for _, key := range keys {
		if value, exists := m.data[key]; exists {
			results = append(results, &registrystore.Registry{Key: key, Value: value})
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
		results = append(results, &registrystore.Registry{Key: key, Value: value})
	}
	return results, nil
}

func (m *mockRegistryStore) SetMulti(ctx context.Context, ownerID string, entries []*registrystore.Registry) ([]*registrystore.Registry, error) {
	var results []*registrystore.Registry
	for _, entry := range entries {
		m.data[entry.Key] = entry.Value
		results = append(results, &registrystore.Registry{Key: entry.Key, Value: entry.Value, IsEncrypted: entry.IsEncrypted})
	}
	return results, nil
}

// Test helper: create a provider with real storage
func setupTestProviderWithStorage(t *testing.T, cfg *config.Config) (*Provider, *mockRegistryStore) {
	t.Helper()
	logger := zap.NewNop()
	registryStore := newMockRegistryStore()

	if cfg == nil {
		cfg = &config.Config{JWTSecret: "test-jwt-secret"}
	}

	storageProvider := storageprovider.New(logger, registryStore, cfg)
	err := storageProvider.InitializeWithConfig(cfg)
	require.NoError(t, err)

	return New(logger, registryStore, cfg, NewStorageLoader(storageProvider)), registryStore
}

func TestNew(t *testing.T) {
	logger := zap.NewNop()
	store := newMockRegistryStore()
	cfg := &config.Config{}
	sp := &storageprovider.Provider{}

	provider := New(logger, store, cfg, NewStorageLoader(sp))
	assert.NotNil(t, provider)
	assert.NotNil(t, provider.logger)
	assert.NotNil(t, provider.registryStore)
	assert.NotNil(t, provider.config)
	assert.NotNil(t, provider.loader)
}

func TestInitialize_EmbeddedMode(t *testing.T) {
	provider, _ := setupTestProviderWithStorage(t, nil)

	err := provider.Initialize()
	require.NoError(t, err)

	cfg := provider.Config()
	require.NotNil(t, cfg)

	// Should default to JWT-secret fallback with sha256/32
	assert.Equal(t, "test-jwt-secret", cfg.Secret)
	assert.Equal(t, "sha256", cfg.SignerType)
	assert.Equal(t, 32, cfg.SignerTruncate)

	// Embedded mode always creates an imagor instance.
	assert.NotNil(t, provider.Imagor())
}

func TestInitialize_WithExplicitSecret(t *testing.T) {
	cfg := &config.Config{
		JWTSecret:    "jwt-secret",
		ImagorSecret: "custom-imagor-secret",
	}
	provider, registryStore := setupTestProviderWithStorage(t, cfg)

	// Put secret into registry (simulating what bootstrap/registry would do)
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "custom-imagor-secret", false)

	err := provider.Initialize()
	require.NoError(t, err)

	imagorCfg := provider.Config()
	require.NotNil(t, imagorCfg)
	assert.Equal(t, "custom-imagor-secret", imagorCfg.Secret)
	// When explicit secret is provided, default signer type is sha1
	assert.Equal(t, "sha1", imagorCfg.SignerType)
}

func TestBuildConfigFromRegistry_Defaults(t *testing.T) {
	store := newMockRegistryStore()
	cfg := &config.Config{JWTSecret: "my-jwt"}

	result, err := buildConfigFromRegistry(store, cfg)
	require.NoError(t, err)
	require.NotNil(t, result)

	// No explicit imagor_secret → falls back to JWT secret with sha256/32
	assert.Equal(t, "my-jwt", result.Secret)
	assert.Equal(t, "sha256", result.SignerType)
	assert.Equal(t, 32, result.SignerTruncate)
}

func TestBuildConfigFromRegistry_ExplicitSecret(t *testing.T) {
	store := newMockRegistryStore()
	cfg := &config.Config{JWTSecret: "my-jwt"}

	ctx := context.Background()
	store.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "explicit-secret", false)

	result, err := buildConfigFromRegistry(store, cfg)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "explicit-secret", result.Secret)
	assert.Equal(t, "sha1", result.SignerType) // default when explicit secret (no JWT fallback)
	assert.Equal(t, 0, result.SignerTruncate)
}

func TestBuildConfigFromRegistry_SignerOverrides(t *testing.T) {
	tests := []struct {
		name          string
		registryData  map[string]string
		expectedType  string
		expectedTrunc int
		description   string
	}{
		{
			name: "SHA256 with truncate 28",
			registryData: map[string]string{
				"config.imagor_secret":          "test-secret",
				"config.imagor_signer_type":     "sha256",
				"config.imagor_signer_truncate": "28",
			},
			expectedType:  "sha256",
			expectedTrunc: 28,
			description:   "Should use sha256 with explicit truncate",
		},
		{
			name: "SHA512 with truncate 32",
			registryData: map[string]string{
				"config.imagor_secret":          "test-secret",
				"config.imagor_signer_type":     "sha512",
				"config.imagor_signer_truncate": "32",
			},
			expectedType:  "sha512",
			expectedTrunc: 32,
			description:   "Should use sha512 with explicit truncate",
		},
		{
			name: "Default signer when no override",
			registryData: map[string]string{
				"config.imagor_secret": "test-secret",
			},
			expectedType:  "sha1",
			expectedTrunc: 0,
			description:   "Should use sha1/0 defaults when explicit secret provided without signer config",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newMockRegistryStore()
			cfg := &config.Config{JWTSecret: "jwt-fallback"}

			ctx := context.Background()
			for key, value := range tt.registryData {
				store.Set(ctx, registrystore.SystemOwnerID, key, value, false)
			}

			result, err := buildConfigFromRegistry(store, cfg)
			require.NoError(t, err, tt.description)

			assert.Equal(t, tt.expectedType, result.SignerType, tt.description)
			assert.Equal(t, tt.expectedTrunc, result.SignerTruncate, tt.description)
		})
	}
}

func TestGenerateURL_Signed(t *testing.T) {
	provider, _ := setupTestProviderWithStorage(t, &config.Config{
		JWTSecret: "test-secret",
	})
	err := provider.Initialize()
	require.NoError(t, err)

	url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
		Width:  300,
		Height: 200,
	})

	require.NoError(t, err)
	assert.Contains(t, url, "300x200")
	assert.Contains(t, url, "test/image.jpg")
	// Signed URL: starts with /signature/
	assert.Regexp(t, `^/[a-zA-Z0-9_=/-]+/`, url)
	assert.NotContains(t, url, "/unsafe/")
}

func TestGenerateURL_NoConfig(t *testing.T) {
	logger := zap.NewNop()
	store := newMockRegistryStore()
	cfg := &config.Config{}

	provider := New(logger, store, cfg, nil)
	// No currentConfig set

	_, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "configuration not available")
}

func TestGenerateURL_SignerVariants(t *testing.T) {
	tests := []struct {
		name           string
		signerType     string
		signerTruncate int
		secret         string
	}{
		{"SHA1 no truncate", "sha1", 0, "test-secret"},
		{"SHA256 truncate 28", "sha256", 28, "test-secret"},
		{"SHA512 truncate 32", "sha512", 32, "test-secret"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := zap.NewNop()
			store := newMockRegistryStore()
			cfg := &config.Config{}

			provider := New(logger, store, cfg, nil)
			provider.cfg = &ImagorConfig{
				Secret:         tt.secret,
				SignerType:     tt.signerType,
				SignerTruncate: tt.signerTruncate,
			}

			url, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{
				Width: 300, Height: 200,
			})

			require.NoError(t, err)
			assert.Contains(t, url, "300x200")
			assert.Contains(t, url, "test/image.jpg")
			// Should be a signed URL (not /unsafe/)
			assert.Regexp(t, `^/[a-zA-Z0-9_=/-]+/`, url)
			assert.NotContains(t, url, "/unsafe/")
		})
	}
}

func TestGetHashAlgorithm(t *testing.T) {
	tests := []struct {
		signerType   string
		expectedSize int
	}{
		{"sha1", 20},
		{"SHA1", 20},
		{"sha256", 32},
		{"SHA256", 32},
		{"sha512", 64},
		{"SHA512", 64},
		{"invalid", 20}, // defaults to sha1
		{"", 20},        // defaults to sha1
	}

	for _, tt := range tests {
		t.Run(tt.signerType, func(t *testing.T) {
			hashFunc := getHashAlgorithm(tt.signerType)
			h := hashFunc()
			h.Write([]byte("test"))
			assert.Equal(t, tt.expectedSize, len(h.Sum(nil)))
		})
	}
}

func TestSync(t *testing.T) {
	provider, registryStore := setupTestProviderWithStorage(t, &config.Config{
		JWTSecret: "initial-jwt",
	})

	err := provider.Initialize()
	require.NoError(t, err)

	// Initially uses JWT fallback
	cfg := provider.Config()
	assert.Equal(t, "initial-jwt", cfg.Secret)

	// Update registry with a new explicit secret
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "new-secret", false)

	err = provider.Sync()
	require.NoError(t, err)

	// Should now use the new registry secret
	cfg = provider.Config()
	assert.Equal(t, "new-secret", cfg.Secret)
	assert.Equal(t, "sha1", cfg.SignerType) // explicit secret → sha1 default
}

func TestSync_UpdatesDynSigner(t *testing.T) {
	provider, registryStore := setupTestProviderWithStorage(t, &config.Config{
		JWTSecret: "initial-jwt",
	})

	err := provider.Initialize()
	require.NoError(t, err)

	// Capture URL before sync
	urlBefore, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{Width: 300, Height: 200})
	require.NoError(t, err)

	// Update registry with a different secret
	ctx := context.Background()
	registryStore.Set(ctx, registrystore.SystemOwnerID, "config.imagor_secret", "rotated-secret", false)

	err = provider.Sync()
	require.NoError(t, err)

	// URL after sync uses the new signer → different signature for same path
	urlAfter, err := provider.GenerateURL("test/image.jpg", imagorpath.Params{Width: 300, Height: 200})
	require.NoError(t, err)

	assert.NotEqual(t, urlBefore, urlAfter, "URL signature must change after signer rotation via Sync()")

	// dynSigner was also updated — verify it now signs with the new key
	require.NotNil(t, provider.dynSigner)
	newSigner := signerFromConfig(&ImagorConfig{Secret: "rotated-secret", SignerType: "sha1"})
	path := "300x200/test/image.jpg"
	assert.Equal(t, newSigner.Sign(path), provider.dynSigner.Sign(path))
}

// --- StorageLoader tests ---

// mockStorageSource implements storageSource for testing StorageLoader.
type mockStorageSource struct {
	stor storage.Storage
}

func (m *mockStorageSource) GetStorage() storage.Storage { return m.stor }

// mockReadStorage is a minimal storage.Storage implementation for StorageLoader tests.
// Only Get() is exercised; all other methods panic if called.
type mockReadStorage struct {
	data map[string][]byte
	err  error // if set, Get always returns this error
}

func newMockReadStorage() *mockReadStorage {
	return &mockReadStorage{data: make(map[string][]byte)}
}

func (m *mockReadStorage) Get(_ context.Context, key string) (io.ReadCloser, error) {
	if m.err != nil {
		return nil, m.err
	}
	data, ok := m.data[key]
	if !ok {
		return nil, fmt.Errorf("not found: %s", key)
	}
	return io.NopCloser(bytes.NewReader(data)), nil
}

func (m *mockReadStorage) Put(_ context.Context, _ string, _ io.Reader) error { return nil }
func (m *mockReadStorage) Delete(_ context.Context, _ string) error           { return nil }
func (m *mockReadStorage) CreateFolder(_ context.Context, _ string) error     { return nil }
func (m *mockReadStorage) Stat(_ context.Context, _ string) (storage.FileInfo, error) {
	return storage.FileInfo{}, nil
}
func (m *mockReadStorage) Copy(_ context.Context, _, _ string) error { return nil }
func (m *mockReadStorage) Move(_ context.Context, _, _ string) error { return nil }
func (m *mockReadStorage) List(_ context.Context, _ string, _ storage.ListOptions) (storage.ListResult, error) {
	return storage.ListResult{}, nil
}

func TestStorageLoader_Get_Success(t *testing.T) {
	stor := newMockReadStorage()
	stor.data["images/gopher.png"] = []byte("fake-png-data")

	loader := &StorageLoader{source: &mockStorageSource{stor: stor}}

	req := httptest.NewRequest("GET", "/", nil)
	blob, err := loader.Get(req, "images/gopher.png")

	require.NoError(t, err)
	require.NotNil(t, blob)

	// Verify the blob's content using ReadAll (handles imagor's internal fanout correctly)
	data, err := blob.ReadAll()
	require.NoError(t, err)
	assert.Equal(t, []byte("fake-png-data"), data)
}

func TestStorageLoader_Get_NotFound(t *testing.T) {
	stor := newMockReadStorage() // empty — no files

	loader := &StorageLoader{source: &mockStorageSource{stor: stor}}

	req := httptest.NewRequest("GET", "/", nil)
	blob, err := loader.Get(req, "missing/image.jpg")

	// Matches imagor's filestorage pattern: returns (blob, err) with err != nil.
	// The error is surfaced immediately so imagor treats missing files as 4xx.
	require.Error(t, err)
	assert.Contains(t, err.Error(), "missing/image.jpg")
	// blob is non-nil (same as filestorage) but its internal Err() is set
	require.NotNil(t, blob)
	assert.Error(t, blob.Err())
}

func TestStorageLoader_Get_DelegatesCurrentStorage(t *testing.T) {
	// Start with empty storage
	stor := newMockReadStorage()
	source := &mockStorageSource{stor: stor}
	loader := &StorageLoader{source: source}

	req := httptest.NewRequest("GET", "/", nil)

	// First call — file does not exist yet
	_, err := loader.Get(req, "dynamic.jpg")
	assert.Error(t, err, "expected not-found before file is added")

	// Add the file to the (same) underlying storage
	stor.data["dynamic.jpg"] = []byte("dynamic-content")

	// Second call via the same loader — should now find it
	blob, err := loader.Get(req, "dynamic.jpg")
	require.NoError(t, err, "expected success after file is added")
	assert.NotNil(t, blob)

	data, err := blob.ReadAll()
	require.NoError(t, err)
	assert.Equal(t, []byte("dynamic-content"), data)
}

func TestStorageLoader_Get_StorageError(t *testing.T) {
	stor := newMockReadStorage()
	stor.err = fmt.Errorf("connection refused")

	loader := &StorageLoader{source: &mockStorageSource{stor: stor}}

	req := httptest.NewRequest("GET", "/", nil)
	blob, err := loader.Get(req, "any/image.jpg")

	// Matches imagor's filestorage pattern: returns (blob, err) with err != nil.
	require.Error(t, err)
	assert.Contains(t, err.Error(), "connection refused")
	require.NotNil(t, blob)
	assert.Error(t, blob.Err())
}

// Compile-time check: mockStorageSource satisfies the storageSource interface.
var _ storageSource = (*mockStorageSource)(nil)

// Compile-time check: StorageLoader satisfies imagor.Loader.
var _ interface {
	Get(*http.Request, string) (*imagor.Blob, error)
} = (*StorageLoader)(nil)

// Ensure mockReadStorage satisfies storage.Storage
var _ storage.Storage = (*mockReadStorage)(nil)

// Compile-time check: storageprovider.Provider satisfies storageSource (used by StorageLoader/NewStorageLoader).
var _ storageSource = (*storageprovider.Provider)(nil)

// Dummy to keep time import used across older test helpers.
var _ = time.Second
