package resolver

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

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
	templateFilePath := fmt.Sprintf("%s/%s.imagor.json", input.SavePath, sanitizedName)
	_, err := r.getStorage().Stat(ctx, templateFilePath)
	if err == nil {
		// File exists - check if overwrite is allowed
		overwrite := input.Overwrite != nil && *input.Overwrite
		if !overwrite {
			r.logger.Debug("Template already exists, overwrite not allowed",
				zap.String("templatePath", templateFilePath))
			msg := "Template already exists"
			alreadyExists := true
			return &gql.TemplateResult{
				Success:       false,
				TemplatePath:  "",
				PreviewPath:   nil,
				Message:       &msg,
				AlreadyExists: &alreadyExists,
			}, nil
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
	previewImage, err := r.generateTemplatePreview(ctx, input.SourceImagePath, input.TemplateJSON)
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
		previewPath := fmt.Sprintf("%s/%s.imagor.preview.webp", input.SavePath, sanitizedName)
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
func (r *mutationResolver) generateTemplatePreview(ctx context.Context, sourceImagePath string, templateJSON string) ([]byte, error) {
	// 1. Parse template JSON to extract transformations
	var template struct {
		Transformations json.RawMessage `json:"transformations"`
	}
	if err := json.Unmarshal([]byte(templateJSON), &template); err != nil {
		return nil, fmt.Errorf("failed to parse template JSON: %w", err)
	}

	// 2. Parse transformations into ImagorParamsInput
	var transformations map[string]interface{}
	if err := json.Unmarshal(template.Transformations, &transformations); err != nil {
		return nil, fmt.Errorf("failed to parse transformations: %w", err)
	}

	// 3. Build Imagor params for 200x200 thumbnail
	params := imagorpath.Params{
		Width:  200,
		Height: 200,
		FitIn:  true,
		Filters: imagorpath.Filters{
			{Name: "format", Args: "webp"},
			{Name: "quality", Args: "80"},
		},
	}

	// Apply transformations from template (simplified - just apply filters if present)
	if filters, ok := transformations["filters"].([]interface{}); ok {
		for _, f := range filters {
			if filterMap, ok := f.(map[string]interface{}); ok {
				name, _ := filterMap["name"].(string)
				args, _ := filterMap["args"].(string)
				if name != "" {
					// Skip format/quality/preview filters (we set our own)
					if name != "format" && name != "quality" && name != "preview" {
						params.Filters = append(params.Filters, imagorpath.Filter{
							Name: name,
							Args: args,
						})
					}
				}
			}
		}
	}

	// 4. Generate Imagor URL
	imagorURL, err := r.imagorProvider.GenerateURL(sourceImagePath, params)
	if err != nil {
		return nil, fmt.Errorf("failed to generate imagor URL: %w", err)
	}

	r.logger.Debug("Fetching preview image", zap.String("url", imagorURL))

	// 5. Fetch the processed image from Imagor
	resp, err := http.Get(imagorURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch preview image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("imagor returned status %d", resp.StatusCode)
	}

	// 6. Read image data
	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read preview image: %w", err)
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
