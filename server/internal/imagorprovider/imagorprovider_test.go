package imagorprovider

import (
	"strings"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/noop"
	"github.com/cshum/imagor/imagorpath"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestGenerateURL_Base64Encoding(t *testing.T) {
	tests := []struct {
		name         string
		imagePath    string
		shouldUseB64 bool
		description  string
	}{
		{
			name:         "normal path without spaces",
			imagePath:    "my-image.jpg",
			shouldUseB64: false,
			description:  "Regular filename should not use base64",
		},
		{
			name:         "path with single space",
			imagePath:    "my image.jpg",
			shouldUseB64: true,
			description:  "Filename with space should use base64",
		},
		{
			name:         "path with multiple spaces",
			imagePath:    "my test image file.jpg",
			shouldUseB64: true,
			description:  "Filename with multiple spaces should use base64",
		},
		{
			name:         "path with question mark",
			imagePath:    "image.jpg?version=1",
			shouldUseB64: true,
			description:  "Filename with ? should use base64",
		},
		{
			name:         "path with hash",
			imagePath:    "image.jpg#anchor",
			shouldUseB64: true,
			description:  "Filename with # should use base64",
		},
		{
			name:         "path with ampersand",
			imagePath:    "image.jpg&param=value",
			shouldUseB64: true,
			description:  "Filename with & should use base64",
		},
		{
			name:         "path with multiple special chars",
			imagePath:    "my image.jpg?v=1#test",
			shouldUseB64: true,
			description:  "Filename with multiple special chars should use base64",
		},
		{
			name:         "gallery path with spaces",
			imagePath:    "my gallery/my image.jpg",
			shouldUseB64: true,
			description:  "Gallery path with spaces should use base64",
		},
		{
			name:         "normal gallery path",
			imagePath:    "gallery/image.jpg",
			shouldUseB64: false,
			description:  "Normal gallery path should not use base64",
		},
		{
			name:         "unicode filename",
			imagePath:    "图片.jpg",
			shouldUseB64: false,
			description:  "Unicode filename without special chars should not use base64",
		},
		{
			name:         "unicode with spaces",
			imagePath:    "我的 图片.jpg",
			shouldUseB64: true,
			description:  "Unicode filename with spaces should use base64",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create provider with test configuration
			logger := zap.NewNop()
			cfg := &config.Config{
				JWTSecret: "test-secret",
			}
			registryStore := noop.NewRegistryStore()

			provider := New(logger, registryStore, cfg, nil)

			// Initialize with embedded mode
			provider.currentConfig = &ImagorConfig{
				Mode:           ImagorModeEmbedded,
				BaseURL:        "/imagor",
				Secret:         "test-secret",
				Unsafe:         true, // Use unsafe for easier testing
				SignerType:     "sha256",
				SignerTruncate: 32,
			}

			// Generate URL
			params := imagorpath.Params{
				Width:  300,
				Height: 200,
			}

			url, err := provider.GenerateURL(tt.imagePath, params)
			require.NoError(t, err, tt.description)

			// Check if URL contains b64: prefix
			hasB64Prefix := strings.Contains(url, "/b64:")

			assert.Equal(t, tt.shouldUseB64, hasB64Prefix,
				"%s: expected base64=%v, got base64=%v for path '%s'\nGenerated URL: %s",
				tt.description, tt.shouldUseB64, hasB64Prefix, tt.imagePath, url)

			// If base64 is used, verify it's properly encoded
			if tt.shouldUseB64 {
				assert.Contains(t, url, "/b64:", "URL should contain b64: prefix")
				// The base64 encoded part should not contain the original special characters
				parts := strings.Split(url, "/b64:")
				if len(parts) > 1 {
					encodedPart := parts[1]
					assert.NotContains(t, encodedPart, " ", "Encoded part should not contain spaces")
					assert.NotContains(t, encodedPart, "?", "Encoded part should not contain ?")
					assert.NotContains(t, encodedPart, "#", "Encoded part should not contain #")
					assert.NotContains(t, encodedPart, "&", "Encoded part should not contain &")
				}
			}
		})
	}
}

func TestGenerateURL_Base64EncodingWithFilters(t *testing.T) {
	logger := zap.NewNop()
	cfg := &config.Config{
		JWTSecret: "test-secret",
	}
	registryStore := noop.NewRegistryStore()

	provider := New(logger, registryStore, cfg, nil)
	provider.currentConfig = &ImagorConfig{
		Mode:           ImagorModeEmbedded,
		BaseURL:        "/imagor",
		Secret:         "test-secret",
		Unsafe:         true,
		SignerType:     "sha256",
		SignerTruncate: 32,
	}

	// Test with filters and spaces in path
	params := imagorpath.Params{
		Width:  300,
		Height: 200,
		Filters: imagorpath.Filters{
			{Name: "quality", Args: "80"},
			{Name: "format", Args: "webp"},
		},
	}

	url, err := provider.GenerateURL("my image file.jpg", params)
	require.NoError(t, err)

	// Should use base64 due to spaces
	assert.Contains(t, url, "/b64:", "URL with filters should use base64 for path with spaces")
	// Should still contain filter parameters
	assert.Contains(t, url, "filters:", "URL should contain filters")
}

func TestGenerateURL_Base64EncodingExternalMode(t *testing.T) {
	logger := zap.NewNop()
	cfg := &config.Config{
		JWTSecret: "test-secret",
	}
	registryStore := noop.NewRegistryStore()

	provider := New(logger, registryStore, cfg, nil)
	provider.currentConfig = &ImagorConfig{
		Mode:           ImagorModeExternal,
		BaseURL:        "http://localhost:8000",
		Secret:         "test-secret",
		Unsafe:         false,
		SignerType:     "sha256",
		SignerTruncate: 40,
	}

	params := imagorpath.Params{
		Width:  300,
		Height: 200,
	}

	// Test with spaces - should use base64 in external mode too
	url, err := provider.GenerateURL("my image.jpg", params)
	require.NoError(t, err)

	assert.Contains(t, url, "/b64:", "External mode should also use base64 for paths with spaces")
	assert.Contains(t, url, "http://localhost:8000", "URL should contain external base URL")
}

func TestGenerateURL_NoBase64ForNormalPaths(t *testing.T) {
	logger := zap.NewNop()
	cfg := &config.Config{
		JWTSecret: "test-secret",
	}
	registryStore := noop.NewRegistryStore()

	provider := New(logger, registryStore, cfg, nil)
	provider.currentConfig = &ImagorConfig{
		Mode:           ImagorModeEmbedded,
		BaseURL:        "/imagor",
		Secret:         "test-secret",
		Unsafe:         true,
		SignerType:     "sha256",
		SignerTruncate: 32,
	}

	normalPaths := []string{
		"image.jpg",
		"gallery/image.jpg",
		"my-image-file.jpg",
		"folder/subfolder/image.png",
		"图片.jpg", // Unicode without spaces
	}

	for _, imagePath := range normalPaths {
		t.Run(imagePath, func(t *testing.T) {
			params := imagorpath.Params{
				Width:  300,
				Height: 200,
			}

			url, err := provider.GenerateURL(imagePath, params)
			require.NoError(t, err)

			assert.NotContains(t, url, "/b64:", "Normal path '%s' should not use base64", imagePath)
		})
	}
}
