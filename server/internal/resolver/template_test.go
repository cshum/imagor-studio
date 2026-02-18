package resolver

import (
	"strings"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/storage"
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

		// Mock GetInstance to return nil (external mode - uses HTTP)
		mockImagorProvider.On("GetInstance").Return(nil).Maybe()

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
		result, err := resolver.Mutation().SaveTemplate(ctx, input)

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
		resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		mockImagorProvider.On("GetInstance").Return(nil).Maybe()
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

		result, err := resolver.Mutation().SaveTemplate(ctx, input)

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
		resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		input := gql.SaveTemplateInput{
			Name:            "/\\:*?\"<>|", // Only filesystem-unsafe chars - will be empty after sanitization
			DimensionMode:   gql.DimensionModeAdaptive,
			TemplateJSON:    `{"version":"1.0","name":"Test","transformations":{}}`,
			SourceImagePath: "test.jpg",
			SavePath:        "templates",
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
			SavePath:        "templates",
		}

		_, err := resolver.Mutation().SaveTemplate(ctx, input)

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
		resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

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

		_, err := resolver.Mutation().SaveTemplate(ctx, input)

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
		resolver := NewResolver(mockStorageProvider, mockRegistryStore, mockUserStore, mockImagorProvider, cfg, nil, logger)

		ctx := createReadWriteContext("user1")

		overwriteTrue := true

		// Mock GetInstance
		mockImagorProvider.On("GetInstance").Return(nil).Maybe()

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

		result, err := resolver.Mutation().SaveTemplate(ctx, input)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.Success)
		assert.Equal(t, "templates/Existing Template.imagor.json", result.TemplatePath)

		mockStorage.AssertExpectations(t)
	})
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
