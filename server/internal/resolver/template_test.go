package resolver

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

func TestSaveTemplate(t *testing.T) {
	t.Run("should save template successfully", func(t *testing.T) {
		// Setup
		mockStorage := new(MockStorage)
		mockRegistryStore := new(MockRegistryStore)
		mockUserStore := new(MockUserStore)
		mockImagorProvider := new(MockImagorProvider)
		logger, _ := zap.NewDevelopment()
		cfg := &config.Config{}
		mockStorageProvider := NewMockStorageProvider(mockStorage)
		resolver := newTestResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		// Mock GetInstance to return nil (external mode - uses HTTP)
		mockImagorProvider.On("Imagor").Return(nil).Maybe()

		// Mock Imagor URL generation for preview (will fail but that's ok)
		mockImagorProvider.On("GenerateURL", "test-image.jpg", mock.Anything).
			Return("http://localhost:8000/preview-url", nil).Maybe()

		// Mock storage Stat to check if file exists (return error = file doesn't exist)
		// New sanitization preserves spaces and case
		mockStorage.On("Stat", ctx, "templates/My Template.imagor.json").
			Return(storage.FileInfo{}, assert.AnError)

		// Mock storage Put for template JSON
		mockStorage.On("Put", ctx, "templates/My Template.imagor.json", mock.Anything).
			Return(nil)

		// Mock storage Put for preview image (may be called if preview generation succeeds)
		mockStorage.On("Put", ctx, "templates/My Template.imagor.preview", mock.Anything).
			Return(nil).Maybe()

		// Create valid template JSON
		templateJSON := `{
			"version": "1.0",
			"name": "My Template",
			"description": "Test template",
			"dimensionMode": "adaptive",
			"transformations": {
				"width": 800,
				"height": 600,
				"brightness": 50
			},
			"metadata": {
				"createdAt": "2026-02-15T14:00:00Z"
			}
		}`

		input := gql.SaveTemplateInput{
			Name:            "My Template",
			Description:     stringPtr("Test template"),
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    templateJSON,
			SourceImagePath: "test-image.jpg",
			SavePath:        "templates",
		}

		// Execute
		result, err := resolver.Mutation().SaveTemplate(ctx, input, nil)

		// Assert
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.Success)
		// New sanitization preserves spaces and case
		assert.Equal(t, "templates/My Template.imagor.json", result.TemplatePath)
		assert.NotNil(t, result.Message)
		assert.Equal(t, "Template saved successfully", *result.Message)

		mockStorage.AssertExpectations(t)
	})

	t.Run("should sanitize template name", func(t *testing.T) {
		mockStorage := new(MockStorage)
		mockRegistryStore := new(MockRegistryStore)
		mockUserStore := new(MockUserStore)
		mockImagorProvider := new(MockImagorProvider)
		logger, _ := zap.NewDevelopment()
		cfg := &config.Config{}
		mockStorageProvider := NewMockStorageProvider(mockStorage)
		resolver := newTestResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		mockImagorProvider.On("Imagor").Return(nil).Maybe()
		mockImagorProvider.On("GenerateURL", mock.Anything, mock.Anything).
			Return("http://localhost:8000/preview-url", nil).Maybe()

		// Mock storage Stat to check if file exists (return error = file doesn't exist)
		// New sanitization only removes filesystem-unsafe chars: / \ : * ? " < > |
		// Characters like !@#$% are filesystem-safe and preserved
		mockStorage.On("Stat", ctx, "my-folder/My Special Template!@#$%.imagor.json").
			Return(storage.FileInfo{}, assert.AnError)

		// Expect !@#$% to be preserved (they are filesystem-safe)
		mockStorage.On("Put", ctx, "my-folder/My Special Template!@#$%.imagor.json", mock.Anything).
			Return(nil)
		mockStorage.On("Put", ctx, "my-folder/My Special Template!@#$%.imagor.preview", mock.Anything).
			Return(nil).Maybe()

		templateJSON := `{
			"version": "1.0",
			"name": "My Special Template!",
			"transformations": {"width": 800}
		}`

		input := gql.SaveTemplateInput{
			Name:            "My Special Template!@#$%",
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    templateJSON,
			SourceImagePath: "test.jpg",
			SavePath:        "my-folder",
		}

		result, err := resolver.Mutation().SaveTemplate(ctx, input, nil)

		assert.NoError(t, err)
		assert.True(t, result.Success)
		assert.Equal(t, "my-folder/My Special Template!@#$%.imagor.json", result.TemplatePath)
	})

	t.Run("should reject invalid template name", func(t *testing.T) {
		mockStorage := new(MockStorage)
		mockRegistryStore := new(MockRegistryStore)
		mockUserStore := new(MockUserStore)
		mockImagorProvider := new(MockImagorProvider)
		logger, _ := zap.NewDevelopment()
		cfg := &config.Config{}
		mockStorageProvider := NewMockStorageProvider(mockStorage)
		resolver := newTestResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		input := gql.SaveTemplateInput{
			Name:            "/\\:*?\"<>|", // Only filesystem-unsafe chars - will be empty after sanitization
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    `{"version":"1.0","name":"Test","transformations":{}}`,
			SourceImagePath: "test.jpg",
			SavePath:        "templates",
		}

		result, err := resolver.Mutation().SaveTemplate(ctx, input, nil)

		assert.NoError(t, err)
		assert.False(t, result.Success)
		assert.Contains(t, *result.Message, "Invalid template name")
	})

	t.Run("should reject invalid JSON", func(t *testing.T) {
		mockStorage := new(MockStorage)
		mockRegistryStore := new(MockRegistryStore)
		mockUserStore := new(MockUserStore)
		mockImagorProvider := new(MockImagorProvider)
		logger, _ := zap.NewDevelopment()
		cfg := &config.Config{}
		mockStorageProvider := NewMockStorageProvider(mockStorage)
		resolver := newTestResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		// Mock storage Stat (won't be called since validation fails first, but add for safety)
		mockStorage.On("Stat", ctx, mock.Anything).
			Return(storage.FileInfo{}, assert.AnError).Maybe()

		input := gql.SaveTemplateInput{
			Name:            "Test Template",
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    `{invalid json}`,
			SourceImagePath: "test.jpg",
			SavePath:        "templates",
		}

		result, err := resolver.Mutation().SaveTemplate(ctx, input, nil)

		assert.NoError(t, err)
		assert.False(t, result.Success)
		assert.Contains(t, *result.Message, "Invalid template JSON")
	})

	t.Run("should require write permission", func(t *testing.T) {
		mockStorage := new(MockStorage)
		mockRegistryStore := new(MockRegistryStore)
		mockUserStore := new(MockUserStore)
		mockImagorProvider := new(MockImagorProvider)
		logger, _ := zap.NewDevelopment()
		cfg := &config.Config{}
		mockStorageProvider := NewMockStorageProvider(mockStorage)
		resolver := newTestResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadOnlyContext("user1") // Read-only user

		input := gql.SaveTemplateInput{
			Name:            "Test Template",
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    `{"version":"1.0","name":"Test","transformations":{}}`,
			SourceImagePath: "test.jpg",
			SavePath:        "templates",
		}

		_, err := resolver.Mutation().SaveTemplate(ctx, input, nil)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "write access required")
	})

	t.Run("should return conflict error when template exists", func(t *testing.T) {
		mockStorage := new(MockStorage)
		mockRegistryStore := new(MockRegistryStore)
		mockUserStore := new(MockUserStore)
		mockImagorProvider := new(MockImagorProvider)
		logger, _ := zap.NewDevelopment()
		cfg := &config.Config{}
		mockStorageProvider := NewMockStorageProvider(mockStorage)
		resolver := newTestResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		// Mock Stat to return success (file exists)
		// New sanitization preserves spaces and case
		mockStorage.On("Stat", ctx, "templates/Existing Template.imagor.json").
			Return(storage.FileInfo{}, nil)

		input := gql.SaveTemplateInput{
			Name:            "Existing Template",
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    `{"version":"1.0","name":"Existing","transformations":{}}`,
			SourceImagePath: "test.jpg",
			SavePath:        "templates",
			Overwrite:       nil, // Default: no overwrite
		}

		_, err := resolver.Mutation().SaveTemplate(ctx, input, nil)

		// Should return a conflict error
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Template already exists")

		mockStorage.AssertExpectations(t)
	})

	t.Run("should overwrite when overwrite flag is true", func(t *testing.T) {
		mockStorage := new(MockStorage)
		mockRegistryStore := new(MockRegistryStore)
		mockUserStore := new(MockUserStore)
		mockImagorProvider := new(MockImagorProvider)
		logger, _ := zap.NewDevelopment()
		cfg := &config.Config{}
		mockStorageProvider := NewMockStorageProvider(mockStorage)
		resolver := newTestResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		overwriteTrue := true

		// Mock GetInstance
		mockImagorProvider.On("Imagor").Return(nil).Maybe()

		// Mock Imagor URL generation
		mockImagorProvider.On("GenerateURL", "test.jpg", mock.Anything).
			Return("http://localhost:8000/preview-url", nil).Maybe()

		// Mock Stat to return success (file exists)
		// New sanitization preserves spaces and case
		mockStorage.On("Stat", ctx, "templates/Existing Template.imagor.json").
			Return(storage.FileInfo{}, nil)

		// Mock Put for template JSON (should be called despite file existing)
		mockStorage.On("Put", ctx, "templates/Existing Template.imagor.json", mock.Anything).
			Return(nil)

		// Mock Put for preview image
		mockStorage.On("Put", ctx, "templates/Existing Template.imagor.preview", mock.Anything).
			Return(nil).Maybe()

		input := gql.SaveTemplateInput{
			Name:            "Existing Template",
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    `{"version":"1.0","name":"Existing","transformations":{}}`,
			SourceImagePath: "test.jpg",
			SavePath:        "templates",
			Overwrite:       &overwriteTrue,
		}

		result, err := resolver.Mutation().SaveTemplate(ctx, input, nil)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.Success)
		assert.Equal(t, "templates/Existing Template.imagor.json", result.TemplatePath)

		mockStorage.AssertExpectations(t)
	})
}

func TestGenerateTemplatePreview_UsesSpaceAwareURL(t *testing.T) {
	mockImagorProvider := new(MockImagorProvider)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(nil, nil, nil, mockImagorProvider, &config.Config{}, nil, logger, nil, nil, nil, nil,
		WithProcessingOriginResolver(processingOriginResolverStub("")),
	)

	previewBytes := []byte("preview-image")
	var requestedPath string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(previewBytes)
	}))
	defer server.Close()

	resolver.processingOriginResolver = processingOriginResolverStub(server.URL)
	mockImagorProvider.On("Imagor").Return(nil).Once()

	spaceKey := "demo"
	spaceConfig := &space.Space{
		Key:             spaceKey,
		ImagorSecret:    "demo-secret",
		SignerAlgorithm: "sha256",
	}

	result, err := resolver.Mutation().(*mutationResolver).generateTemplatePreview(
		context.Background(),
		"test.jpg",
		`{"version":"1.0","transformations":{"width":800,"height":600}}`,
		derivePreviewParamsFromTemplateJSON(`{"version":"1.0","transformations":{"width":800,"height":600}}`),
		spaceConfig,
		&spaceKey,
	)

	assert.NoError(t, err)
	assert.Equal(t, previewBytes, result)
	assert.Contains(t, requestedPath, "test.jpg")
	assert.NotEmpty(t, requestedPath)
	mockImagorProvider.AssertExpectations(t)
}

func TestGenerateTemplatePreview_UsesInternalRendererWhenConfigured(t *testing.T) {
	mockRenderer := new(MockTemplatePreviewRenderClient)
	mockImagorProvider := new(MockImagorProvider)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(nil, nil, nil, mockImagorProvider, &config.Config{}, nil, logger, nil, nil, nil, nil,
		WithTemplatePreviewRenderer(mockRenderer),
	)

	spaceKey := "demo"
	spaceConfig := &space.Space{Key: spaceKey}
	templateJSON := `{"version":"1.0","transformations":{"width":800,"height":600}}`
	previewParams := derivePreviewParamsFromTemplateJSON(templateJSON)
	previewBytes := []byte("preview-from-processing")

	mockRenderer.On("RenderTemplatePreview", mock.Anything, processing.TemplatePreviewRenderRequest{
		SpaceKey:        spaceKey,
		SourceImagePath: "test.jpg",
		TemplateJSON:    templateJSON,
		PreviewParams:   previewParams,
	}).Return(&processing.TemplatePreviewRenderResponse{Image: previewBytes, ContentType: "image/webp"}, nil).Once()

	result, err := resolver.Mutation().(*mutationResolver).generateTemplatePreview(
		context.Background(),
		"test.jpg",
		templateJSON,
		previewParams,
		spaceConfig,
		&spaceKey,
	)

	assert.NoError(t, err)
	assert.Equal(t, previewBytes, result)
	mockRenderer.AssertExpectations(t)
	mockImagorProvider.AssertNotCalled(t, "Imagor")
	mockImagorProvider.AssertNotCalled(t, "GenerateURL", mock.Anything, mock.Anything)
}

func TestHTTPTemplatePreviewRenderClient(t *testing.T) {
	previewBytes := []byte("preview-bytes")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, processing.InternalTemplatePreviewRenderPath, r.URL.Path)
		assert.Equal(t, "secret", r.Header.Get(processing.InternalAPISecretHeader))

		var req processing.TemplatePreviewRenderRequest
		assert.NoError(t, json.NewDecoder(r.Body).Decode(&req))
		assert.Equal(t, "demo", req.SpaceKey)

		w.Header().Set("Content-Type", "application/json")
		assert.NoError(t, json.NewEncoder(w).Encode(processing.TemplatePreviewRenderResponse{
			Image:       previewBytes,
			ContentType: "image/webp",
		}))
	}))
	defer server.Close()

	client := processing.NewHTTPTemplatePreviewRenderClient(server.URL, "secret")
	result, err := client.RenderTemplatePreview(context.Background(), processing.TemplatePreviewRenderRequest{SpaceKey: "demo"})

	assert.NoError(t, err)
	assert.Equal(t, previewBytes, result.Image)
	assert.Equal(t, "image/webp", result.ContentType)
}

func TestResolveProcessingBaseURL(t *testing.T) {
	assert.Equal(t, "https://processing.example.test/internal", processing.ResolveProcessingBaseURL("https://processing.example.test/internal/", "demo"))
	assert.Equal(t, "https://demo.processing.example.test", processing.ResolveProcessingBaseURL("https://{spaceKey}.processing.example.test", "demo"))
	assert.Equal(t, "https://demo.processing.example.test", processing.ResolveProcessingBaseURL("https://{{spaceKey}}.processing.example.test", "demo"))
}

type processingOriginResolverStub string

func (p processingOriginResolverStub) ResolveProcessingOrigin(_ context.Context, _ string) string {
	return string(p)
}

func TestSanitizeTemplateName(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "simple name with spaces",
			input:    "My Template",
			expected: "My Template", // Spaces preserved
		},
		{
			name:     "filesystem-safe characters preserved",
			input:    "My Template!@#$%",
			expected: "My Template!@#$%", // !@#$% are filesystem-safe, preserved along with spaces and case
		},
		{
			name:     "multiple spaces preserved",
			input:    "My   Template   Name",
			expected: "My   Template   Name", // Spaces preserved
		},
		{
			name:     "underscores preserved",
			input:    "my_template_name",
			expected: "my_template_name",
		},
		{
			name:     "hyphens preserved",
			input:    "my-template-name",
			expected: "my-template-name",
		},
		{
			name:     "mixed case preserved",
			input:    "MyTemplateNAME",
			expected: "MyTemplateNAME", // Case preserved
		},
		{
			name:     "trailing spaces trimmed",
			input:    "  My Template  ",
			expected: "My Template", // Leading/trailing trimmed, internal spaces preserved
		},
		{
			name:     "filesystem-unsafe chars: slashes",
			input:    "My/Template\\Name",
			expected: "MyTemplateName", // / and \ removed
		},
		{
			name:     "filesystem-unsafe chars: colons and asterisks",
			input:    "My:Template*Name",
			expected: "MyTemplateName", // : and * removed
		},
		{
			name:     "filesystem-unsafe chars: question marks and quotes",
			input:    `My?Template"Name`,
			expected: "MyTemplateName", // ? and " removed
		},
		{
			name:     "filesystem-unsafe chars: angle brackets and pipes",
			input:    "My<Template>Name|Test",
			expected: "MyTemplateNameTest", // <, >, | removed
		},
		{
			name:     "empty after sanitization",
			input:    "/\\:*?\"<>|",
			expected: "", // All filesystem-unsafe chars
		},
		{
			name:     "very long name",
			input:    strings.Repeat("a", 150),
			expected: strings.Repeat("a", 100),
		},
		{
			name:     "trailing spaces after char removal",
			input:    "my-template   ///",
			expected: "my-template", // Trailing slashes removed, then trimmed
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeTemplateName(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateTemplateJSON(t *testing.T) {
	t.Run("valid template", func(t *testing.T) {
		templateJSON := `{
			"version": "1.0",
			"name": "Test Template",
			"transformations": {"width": 800}
		}`

		err := validateTemplateJSON(templateJSON)
		assert.NoError(t, err)
	})

	t.Run("invalid JSON", func(t *testing.T) {
		err := validateTemplateJSON(`{invalid}`)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid JSON")
	})

	t.Run("missing version", func(t *testing.T) {
		templateJSON := `{
			"name": "Test",
			"transformations": {}
		}`

		err := validateTemplateJSON(templateJSON)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "missing required field: version")
	})

	t.Run("missing transformations", func(t *testing.T) {
		templateJSON := `{
			"version": "1.0",
			"name": "Test"
		}`

		err := validateTemplateJSON(templateJSON)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "missing required field: transformations")
	})

	t.Run("unsupported version", func(t *testing.T) {
		templateJSON := `{
			"version": "2.0",
			"name": "Test",
			"transformations": {}
		}`

		err := validateTemplateJSON(templateJSON)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported template version")
	})
}
