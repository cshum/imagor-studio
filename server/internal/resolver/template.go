package resolver

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"

	"github.com/cshum/imagor-studio/server/internal/apperror"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor/imagorpath"
	"go.uber.org/zap"
)

// SaveTemplate is the resolver for the saveTemplate field.
func (r *mutationResolver) SaveTemplate(ctx context.Context, input gql.SaveTemplateInput) (*gql.TemplateResult, error) {
	// Check write permissions for the save path
	if err := RequireWritePermission(ctx, input.SavePath); err != nil {
		return nil, err
	}

	r.logger.Debug("Saving template",
		zap.String("name", input.Name),
		zap.String("dimensionMode", string(input.DimensionMode)),
		zap.String("sourceImagePath", input.SourceImagePath))

	// 1. Validate and sanitize template name
	sanitizedName := sanitizeTemplateName(input.Name)
	if sanitizedName == "" {
		msg := "Invalid template name"
		return &gql.TemplateResult{
			Success:      false,
			TemplatePath: "",
			PreviewPath:  nil,
			Message:      &msg,
		}, nil
	}

	// 1.5. Check if template file already exists
	var templateFilePath string
	if input.SavePath == "" {
		templateFilePath = fmt.Sprintf("%s.imagor.json", sanitizedName)
	} else {
		templateFilePath = fmt.Sprintf("%s/%s.imagor.json", input.SavePath, sanitizedName)
	}
	_, err := r.getStorage().Stat(ctx, templateFilePath)
	if err == nil {
		// File exists - check if overwrite is allowed
		overwrite := input.Overwrite != nil && *input.Overwrite
		if !overwrite {
			r.logger.Debug("Template already exists, overwrite not allowed",
				zap.String("templatePath", templateFilePath))
			return nil, apperror.Conflict(
				"Template already exists",
				"templatePath",
				templateFilePath,
			)
		}
		r.logger.Debug("Template already exists, overwriting",
			zap.String("templatePath", templateFilePath))
	}
	// else: file doesn't exist OR error checking (proceed with save)

	// 2. Validate template JSON structure
	if err := validateTemplateJSON(input.TemplateJSON); err != nil {
		r.logger.Error("Invalid template JSON", zap.Error(err))
		msg := fmt.Sprintf("Invalid template JSON: %v", err)
		return &gql.TemplateResult{
			Success:      false,
			TemplatePath: "",
			PreviewPath:  nil,
			Message:      &msg,
		}, nil
	}

	// 3. Generate preview image using Imagor
	previewImage, err := r.generateTemplatePreview(ctx, input.SourceImagePath, input.PreviewParams)
	if err != nil {
		r.logger.Warn("Preview generation failed (continuing without preview)", zap.Error(err))
		// Don't fail the operation - template can work without preview
	}

	// 4. Save template JSON to storage
	jsonReader := strings.NewReader(input.TemplateJSON)
	if err := r.getStorage().Put(ctx, templateFilePath, jsonReader); err != nil {
		r.logger.Error("Failed to save template JSON", zap.Error(err))
		msg := fmt.Sprintf("Failed to save template: %v", err)
		return &gql.TemplateResult{
			Success:      false,
			TemplatePath: "",
			PreviewPath:  nil,
			Message:      &msg,
		}, nil
	}

	// 5. Save preview image to storage (if generated)
	var previewFilePath *string
	if previewImage != nil {
		var previewPath string
		if input.SavePath == "" {
			previewPath = fmt.Sprintf("%s.imagor.preview.webp", sanitizedName)
		} else {
			previewPath = fmt.Sprintf("%s/%s.imagor.preview.webp", input.SavePath, sanitizedName)
		}
		previewReader := bytes.NewReader(previewImage)
		if err := r.getStorage().Put(ctx, previewPath, previewReader); err != nil {
			r.logger.Warn("Failed to save preview image (continuing)", zap.Error(err))
			// Don't fail the operation - template works without preview
		} else {
			previewFilePath = &previewPath
		}
	}

	r.logger.Info("Template saved successfully",
		zap.String("templatePath", templateFilePath),
		zap.String("name", input.Name))

	msg := "Template saved successfully"
	return &gql.TemplateResult{
		Success:      true,
		TemplatePath: templateFilePath,
		PreviewPath:  previewFilePath,
		Message:      &msg,
	}, nil
}

// generateTemplatePreview generates a preview image for the template using Imagor
func (r *mutationResolver) generateTemplatePreview(ctx context.Context, sourceImagePath string, previewParams *gql.ImagorParamsInput) ([]byte, error) {
	// Convert preview params to imagorpath.Params
	var params imagorpath.Params
	if previewParams != nil {
		// Use provided preview params from frontend
		params = convertToImagorParams(*previewParams)
	} else {
		// Fallback: simple 200x200 thumbnail
		params = imagorpath.Params{
			Width:  200,
			Height: 200,
			FitIn:  true,
			Filters: imagorpath.Filters{
				{Name: "format", Args: "webp"},
				{Name: "quality", Args: "80"},
			},
		}
	}

	var imageData []byte

	// Check if we're in embedded mode
	if imagorInstance := r.imagorProvider.GetInstance(); imagorInstance != nil {
		// EMBEDDED MODE: Use ServeHTTP directly for in-process handling
		r.logger.Debug("Generating preview using embedded Imagor instance")

		// Generate properly signed URL using GenerateURL (respects configuration)
		imagorURL, err := r.imagorProvider.GenerateURL(sourceImagePath, params)
		if err != nil {
			return nil, fmt.Errorf("failed to generate imagor URL: %w", err)
		}

		// Extract path from URL (remove base URL prefix)
		cfg := r.imagorProvider.GetConfig()
		if cfg == nil {
			return nil, fmt.Errorf("imagor configuration not available")
		}
		path := strings.TrimPrefix(imagorURL, cfg.BaseURL)

		r.logger.Debug("Calling ServeHTTP for preview", zap.String("path", path))

		// Create HTTP request and response recorder
		req, err := http.NewRequestWithContext(ctx, "GET", path, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		recorder := httptest.NewRecorder()

		// Call ServeHTTP directly (in-process, no network overhead)
		imagorInstance.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusOK {
			return nil, fmt.Errorf("imagor returned status %d", recorder.Code)
		}

		imageData = recorder.Body.Bytes()
	} else {
		// EXTERNAL MODE: Use HTTP request
		r.logger.Debug("Generating preview using external Imagor service")

		imagorURL, err := r.imagorProvider.GenerateURL(sourceImagePath, params)
		if err != nil {
			return nil, fmt.Errorf("failed to generate imagor URL: %w", err)
		}

		r.logger.Debug("Fetching preview image", zap.String("url", imagorURL))

		resp, err := http.Get(imagorURL)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch preview image: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("imagor returned status %d", resp.StatusCode)
		}

		imageData, err = io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read preview image: %w", err)
		}
	}

	r.logger.Debug("Preview image generated successfully",
		zap.Int("size", len(imageData)))

	return imageData, nil
}

// sanitizeTemplateName sanitizes a template name for use as a filename
func sanitizeTemplateName(name string) string {
	// Remove leading/trailing whitespace
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}

	// Replace spaces with hyphens
	name = strings.ReplaceAll(name, " ", "-")

	// Remove special characters (keep only alphanumeric, hyphens, underscores)
	reg := regexp.MustCompile(`[^a-zA-Z0-9\-_]`)
	name = reg.ReplaceAllString(name, "")

	// Convert to lowercase
	name = strings.ToLower(name)

	// Limit length to 100 characters
	if len(name) > 100 {
		name = name[:100]
	}

	// Remove trailing hyphens/underscores
	name = strings.TrimRight(name, "-_")

	return name
}

// validateTemplateJSON validates the structure of a template JSON string
func validateTemplateJSON(templateJSON string) error {
	// Parse JSON
	var template struct {
		Version         string          `json:"version"`
		Name            string          `json:"name"`
		Transformations json.RawMessage `json:"transformations"`
	}

	if err := json.Unmarshal([]byte(templateJSON), &template); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}

	// Check required fields
	if template.Version == "" {
		return fmt.Errorf("missing required field: version")
	}

	if template.Name == "" {
		return fmt.Errorf("missing required field: name")
	}

	if len(template.Transformations) == 0 {
		return fmt.Errorf("missing required field: transformations")
	}

	// Validate version (currently only support 1.0)
	if template.Version != "1.0" {
		return fmt.Errorf("unsupported template version: %s (expected 1.0)", template.Version)
	}

	return nil
}
