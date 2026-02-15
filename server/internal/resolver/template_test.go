package resolver

import (
	"strings"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
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
		resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		// Mock Imagor URL generation for preview (will fail but that's ok)
		mockImagorProvider.On("GenerateURL", "test-image.jpg", mock.Anything).
			Return("http://localhost:8000/preview-url", nil).Maybe()

		// Mock storage Put for template JSON
		mockStorage.On("Put", ctx, ".templates/my-template.imagor.json", mock.Anything).
			Return(nil)

		// Mock storage Put for preview image (may be called if preview generation succeeds)
		mockStorage.On("Put", ctx, ".templates/my-template.imagor.preview.webp", mock.Anything).
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
		}

		// Execute
		result, err := resolver.Mutation().SaveTemplate(ctx, input)

		// Assert
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.Success)
		assert.Equal(t, ".templates/my-template.imagor.json", result.TemplatePath)
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
		resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		mockImagorProvider.On("GenerateURL", mock.Anything, mock.Anything).
			Return("http://localhost:8000/preview-url", nil).Maybe()

		// Expect sanitized filename
		mockStorage.On("Put", ctx, ".templates/my-special-template.imagor.json", mock.Anything).
			Return(nil)
		mockStorage.On("Put", ctx, ".templates/my-special-template.imagor.preview.webp", mock.Anything).
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
		}

		result, err := resolver.Mutation().SaveTemplate(ctx, input)

		assert.NoError(t, err)
		assert.True(t, result.Success)
		assert.Equal(t, ".templates/my-special-template.imagor.json", result.TemplatePath)
	})

	t.Run("should reject invalid template name", func(t *testing.T) {
		mockStorage := new(MockStorage)
		mockRegistryStore := new(MockRegistryStore)
		mockUserStore := new(MockUserStore)
		mockImagorProvider := new(MockImagorProvider)
		logger, _ := zap.NewDevelopment()
		cfg := &config.Config{}
		mockStorageProvider := NewMockStorageProvider(mockStorage)
		resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		input := gql.SaveTemplateInput{
			Name:            "!@#$%^&*()", // All special chars - will be empty after sanitization
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    `{"version":"1.0","name":"Test","transformations":{}}`,
			SourceImagePath: "test.jpg",
		}

		result, err := resolver.Mutation().SaveTemplate(ctx, input)

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
		resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		input := gql.SaveTemplateInput{
			Name:            "Test Template",
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    `{invalid json}`,
			SourceImagePath: "test.jpg",
		}

		result, err := resolver.Mutation().SaveTemplate(ctx, input)

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
		resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadOnlyContext("user1") // Read-only user

		input := gql.SaveTemplateInput{
			Name:            "Test Template",
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    `{"version":"1.0","name":"Test","transformations":{}}`,
			SourceImagePath: "test.jpg",
		}

		_, err := resolver.Mutation().SaveTemplate(ctx, input)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "write access required")
	})
}

func TestSanitizeTemplateName(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "simple name",
			input:    "My Template",
			expected: "my-template",
		},
		{
			name:     "special characters",
			input:    "My Template!@#$%",
			expected: "my-template",
		},
		{
			name:     "multiple spaces",
			input:    "My   Template   Name",
			expected: "my---template---name",
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
			name:     "mixed case",
			input:    "MyTemplateNAME",
			expected: "mytemplatename",
		},
		{
			name:     "trailing spaces",
			input:    "  My Template  ",
			expected: "my-template",
		},
		{
			name:     "empty after sanitization",
			input:    "!@#$%^&*()",
			expected: "",
		},
		{
			name:     "very long name",
			input:    strings.Repeat("a", 150),
			expected: strings.Repeat("a", 100),
		},
		{
			name:     "trailing hyphens removed",
			input:    "my-template---",
			expected: "my-template",
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

	t.Run("missing name", func(t *testing.T) {
		templateJSON := `{
			"version": "1.0",
			"transformations": {}
		}`

		err := validateTemplateJSON(templateJSON)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "missing required field: name")
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
