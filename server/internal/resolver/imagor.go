package resolver

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/imagortemplate"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor/imagorpath"
	"go.uber.org/zap"
)

// GenerateImagorURL is the resolver for the generateImagorUrl field.
func (r *mutationResolver) GenerateImagorURL(ctx context.Context, imagePath string, params gql.ImagorParamsInput) (string, error) {
	if err := RequireEditPermission(ctx); err != nil {
		return "", err
	}

	r.logger.Debug("Generating imagor URL",
		zap.String("imagePath", imagePath))

	// Convert GraphQL input to imagorpath.Params
	imagorParams := convertToImagorParams(params)

	// Generate URL using the imagor provider
	url, err := r.imagorProvider.GenerateURL(imagePath, imagorParams)
	if err != nil {
		r.logger.Error("Failed to generate imagor URL",
			zap.Error(err),
			zap.String("imagePath", imagePath))
		return "", fmt.Errorf("failed to generate imagor URL: %w", err)
	}

	r.logger.Debug("Generated imagor URL",
		zap.String("url", url),
		zap.String("imagePath", imagePath))

	return url, nil
}

// GenerateImagorURLFromTemplate converts a template JSON to an imagor URL on the backend.
// When imagePath is provided it overrides the image in the template, applying the same
// applyTemplateState logic as the frontend (crop validation, dimension mode handling).
func (r *mutationResolver) GenerateImagorURLFromTemplate(
	ctx context.Context,
	templateJSON string,
	imagePath *string,
	contextPath []string,
	forPreview *bool,
	previewMaxDimensions *gql.DimensionsInput,
	skipLayerID *string,
	appendFilters []*gql.ImagorFilterInput,
) (string, error) {
	if err := RequireEditPermission(ctx); err != nil {
		return "", err
	}

	var tmpl imagortemplate.Template
	if err := json.Unmarshal([]byte(templateJSON), &tmpl); err != nil {
		return "", fmt.Errorf("invalid templateJson: %w", err)
	}

	// If an imagePath override is provided, apply the frontend's applyTemplateState logic:
	// fetch the target image's actual dimensions via the imagor meta URL, then apply
	// crop-validation and dimension-mode rules before proceeding.
	if imagePath != nil && *imagePath != "" {
		targetDims, err := r.fetchImageDimensions(ctx, *imagePath)
		if err != nil {
			return "", fmt.Errorf("failed to fetch dimensions for image %q: %w", *imagePath, err)
		}
		tmpl = imagortemplate.ApplyTemplateToImage(tmpl, *imagePath, targetDims)
	}

	base := tmpl.Transformations

	if base.ImagePath == nil || *base.ImagePath == "" {
		return "", fmt.Errorf("templateJson missing transformations.imagePath")
	}
	if base.OriginalDimensions == nil {
		return "", fmt.Errorf("templateJson missing transformations.originalDimensions")
	}
	baseImagePath := *base.ImagePath
	origDims := *base.OriginalDimensions

	res := imagortemplate.ResolveContext(base, origDims, baseImagePath, contextPath)

	var previewMaxDims *imagortemplate.Dimensions
	if previewMaxDimensions != nil {
		previewMaxDims = &imagortemplate.Dimensions{Width: previewMaxDimensions.Width, Height: previewMaxDimensions.Height}
	}

	preview := forPreview != nil && *forPreview
	skipID := ""
	if skipLayerID != nil {
		skipID = *skipLayerID
	}

	params := imagortemplate.ConvertToImagorParams(*res.Transforms, res.OrigDims, res.ParentDims, preview, previewMaxDims, skipID, base.IsVisualCropEnabled())

	for _, f := range appendFilters {
		if f != nil {
			params.Filters = append(params.Filters, imagorpath.Filter{Name: f.Name, Args: f.Args})
		}
	}

	url, err := r.imagorProvider.GenerateURL(res.ImagePath, params)
	if err != nil {
		return "", fmt.Errorf("failed to generate imagor URL: %w", err)
	}
	return url, nil
}

// fetchImageDimensions fetches the width and height of an image via the imagor meta URL.
// It mirrors the frontend's fetchImageDimensions logic: call the imagor meta endpoint
// and parse the JSON response for width/height.
// Uses embedded mode (in-process ServeHTTP) when available, otherwise falls back to HTTP GET.
func (r *mutationResolver) fetchImageDimensions(ctx context.Context, imagePath string) (imagortemplate.Dimensions, error) {
	metaURL, err := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{Meta: true})
	if err != nil {
		return imagortemplate.Dimensions{}, fmt.Errorf("failed to generate meta URL: %w", err)
	}

	var body []byte

	if imagorInstance := r.imagorProvider.GetInstance(); imagorInstance != nil {
		// Embedded: call ServeHTTP in-process (no network overhead).
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, metaURL, nil)
		if err != nil {
			return imagortemplate.Dimensions{}, fmt.Errorf("failed to create meta request: %w", err)
		}
		rec := httptest.NewRecorder()
		imagorInstance.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			return imagortemplate.Dimensions{}, fmt.Errorf("imagor meta returned status %d", rec.Code)
		}
		body = rec.Body.Bytes()
	} else {
		// Fallback: plain HTTP GET (used in testing or if instance is not yet initialized).
		resp, err := http.Get(metaURL) //nolint:noctx
		if err != nil {
			return imagortemplate.Dimensions{}, fmt.Errorf("failed to fetch meta URL: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return imagortemplate.Dimensions{}, fmt.Errorf("imagor meta returned status %d", resp.StatusCode)
		}
		body, err = io.ReadAll(resp.Body)
		if err != nil {
			return imagortemplate.Dimensions{}, fmt.Errorf("failed to read meta response: %w", err)
		}
	}

	var meta struct {
		Width  int `json:"width"`
		Height int `json:"height"`
	}
	if err := json.Unmarshal(body, &meta); err != nil {
		return imagortemplate.Dimensions{}, fmt.Errorf("failed to parse meta response: %w", err)
	}
	if meta.Width <= 0 || meta.Height <= 0 {
		return imagortemplate.Dimensions{}, fmt.Errorf("invalid dimensions from meta: %dx%d", meta.Width, meta.Height)
	}
	return imagortemplate.Dimensions{Width: meta.Width, Height: meta.Height}, nil
}

// buildImagePath constructs the full image path from gallery and image keys
func buildImagePath(galleryKey, imageKey string) string {
	if galleryKey == "" {
		return imageKey // Root image
	}
	return galleryKey + "/" + imageKey // Gallery image
}

// convertToImagorParams converts GraphQL input to imagorpath.Params
func convertToImagorParams(input gql.ImagorParamsInput) imagorpath.Params {
	params := imagorpath.Params{}

	// Dimensions
	if input.Width != nil {
		params.Width = *input.Width
	}
	if input.Height != nil {
		params.Height = *input.Height
	}

	// Cropping
	if input.CropLeft != nil {
		params.CropLeft = *input.CropLeft
	}
	if input.CropTop != nil {
		params.CropTop = *input.CropTop
	}
	if input.CropRight != nil {
		params.CropRight = *input.CropRight
	}
	if input.CropBottom != nil {
		params.CropBottom = *input.CropBottom
	}

	// Fitting
	if input.FitIn != nil {
		params.FitIn = *input.FitIn
	}
	if input.Stretch != nil {
		params.Stretch = *input.Stretch
	}

	// Padding
	if input.PaddingLeft != nil {
		params.PaddingLeft = *input.PaddingLeft
	}
	if input.PaddingTop != nil {
		params.PaddingTop = *input.PaddingTop
	}
	if input.PaddingRight != nil {
		params.PaddingRight = *input.PaddingRight
	}
	if input.PaddingBottom != nil {
		params.PaddingBottom = *input.PaddingBottom
	}

	// Flipping
	if input.HFlip != nil {
		params.HFlip = *input.HFlip
	}
	if input.VFlip != nil {
		params.VFlip = *input.VFlip
	}

	// Alignment
	if input.HAlign != nil {
		params.HAlign = *input.HAlign
	}
	if input.VAlign != nil {
		params.VAlign = *input.VAlign
	}

	// Smart crop
	if input.Smart != nil {
		params.Smart = *input.Smart
	}

	// Trimming
	if input.Trim != nil {
		params.Trim = *input.Trim
	}
	if input.TrimBy != nil {
		params.TrimBy = *input.TrimBy
	}
	if input.TrimTolerance != nil {
		params.TrimTolerance = *input.TrimTolerance
	}

	// Filters
	if input.Filters != nil {
		filters := make(imagorpath.Filters, len(input.Filters))
		for i, filter := range input.Filters {
			filters[i] = imagorpath.Filter{
				Name: filter.Name,
				Args: filter.Args,
			}
		}
		params.Filters = filters
	}

	return params
}

// generateThumbnailUrls generates thumbnail URLs using the imagor provider
func (r *Resolver) generateThumbnailUrls(imagePath string, videoThumbnailPos string) *gql.ThumbnailUrls {
	if r.imagorProvider == nil {
		return nil
	}

	// For .imagor.json template files, generate preview URLs but keep original pointing to JSON
	if strings.HasSuffix(imagePath, ".imagor.json") {
		previewPath := strings.TrimSuffix(imagePath, ".imagor.json") + ".imagor.preview"

		// Generate preview-based URLs for display (grid, preview, full, meta)
		previewUrls := r.generateThumbnailUrls(previewPath, videoThumbnailPos)

		// Override 'original' to point to the actual JSON file
		if previewUrls != nil {
			jsonURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
				Filters: imagorpath.Filters{{Name: "raw"}},
			})
			previewUrls.Original = &jsonURL
		}

		return previewUrls
	}

	// Check if the image is SVG or PDF (case-insensitive)
	lowerPath := strings.ToLower(imagePath)
	isSvgOrPdf := strings.HasSuffix(lowerPath, ".svg") || strings.HasSuffix(lowerPath, ".pdf")

	// Helper to build filters with specific quality
	buildFilters := func(quality string) imagorpath.Filters {
		filters := imagorpath.Filters{
			{Name: "quality", Args: quality},
			{Name: "format", Args: "webp"},
		}

		// Add DPI filter for SVG and PDF files for higher quality rendering
		if isSvgOrPdf {
			filters = append(filters, imagorpath.Filter{Name: "dpi", Args: "144"})
		}

		// Add video thumbnail filter based on position
		switch videoThumbnailPos {
		case "seek_1s":
			filters = append(filters, imagorpath.Filter{Name: "seek", Args: "1s"})
		case "seek_3s":
			filters = append(filters, imagorpath.Filter{Name: "seek", Args: "3s"})
		case "seek_5s":
			filters = append(filters, imagorpath.Filter{Name: "seek", Args: "5s"})
		case "seek_10pct":
			filters = append(filters, imagorpath.Filter{Name: "seek", Args: "0.1"})
		case "seek_25pct":
			filters = append(filters, imagorpath.Filter{Name: "seek", Args: "0.25"})
		}

		return filters
	}

	// Generate different sized URLs using the imagor provider
	gridURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:   300,
		Height:  225,
		Filters: buildFilters("80"),
	})

	previewURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:   1200,
		Height:  900,
		FitIn:   true,
		Filters: buildFilters("90"),
	})

	fullURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:   2400,
		Height:  1800,
		FitIn:   true,
		Filters: buildFilters("95"),
	})

	// For original, use raw filter
	originalURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Filters: imagorpath.Filters{
			{Name: "raw"},
		},
	})

	// Generate meta URL for EXIF data
	metaURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Meta: true,
	})

	return &gql.ThumbnailUrls{
		Grid:     &gridURL,
		Preview:  &previewURL,
		Full:     &fullURL,
		Original: &originalURL,
		Meta:     &metaURL,
	}
}

// ImagorStatus is the resolver for the imagorStatus query field.
func (r *queryResolver) ImagorStatus(ctx context.Context) (*gql.ImagorStatus, error) {
	// Get current imagor configuration
	imagorConfig := r.imagorProvider.GetConfig()
	if imagorConfig == nil {
		// Build a sensible default from what's in config
		jwtSecret := ""
		if value, exists := r.config.GetByRegistryKey("config.jwt_secret"); exists {
			jwtSecret = value
		}
		imagorConfig = &imagorprovider.ImagorConfig{
			Secret:         jwtSecret,
			Unsafe:         false,
			SignerType:     "sha256",
			SignerTruncate: 32,
		}
	}

	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.imagor_config_updated_at")

	var lastUpdated *string
	for _, result := range results {
		if result.Key == "config.imagor_config_updated_at" && result.Exists {
			lastUpdated = &result.Value
		}
	}

	return &gql.ImagorStatus{
		Configured:           true,
		LastUpdated:          lastUpdated,
		IsOverriddenByConfig: r.isImagorConfigOverridden(ctx),
		EmbeddedConfig:       r.getEmbeddedImagorConfig(imagorConfig),
	}, nil
}

// isImagorConfigOverridden checks if any imagor configuration is overridden by external config (CLI/env)
func (r *queryResolver) isImagorConfigOverridden(ctx context.Context) bool {
	keys := []string{
		"config.imagor_secret",
		"config.imagor_unsafe",
		"config.imagor_signer_type",
		"config.imagor_signer_truncate",
	}
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config, keys...)
	for _, result := range results {
		if result.IsOverriddenByConfig {
			return true
		}
	}
	return false
}

// getEmbeddedImagorConfig builds the EmbeddedImagorConfig GQL type from provider config
func (r *queryResolver) getEmbeddedImagorConfig(imagorConfig *imagorprovider.ImagorConfig) *gql.EmbeddedImagorConfig {
	var signerType gql.ImagorSignerType
	switch strings.ToLower(imagorConfig.SignerType) {
	case "sha256":
		signerType = gql.ImagorSignerTypeSha256
	case "sha512":
		signerType = gql.ImagorSignerTypeSha512
	default:
		signerType = gql.ImagorSignerTypeSha1
	}
	return &gql.EmbeddedImagorConfig{
		HasSecret:      imagorConfig.Secret != "",
		Unsafe:         imagorConfig.Unsafe,
		SignerType:     signerType,
		SignerTruncate: imagorConfig.SignerTruncate,
	}
}

// ConfigureEmbeddedImagor is the resolver for the configureEmbeddedImagor mutation.
func (r *mutationResolver) ConfigureEmbeddedImagor(ctx context.Context, input gql.EmbeddedImagorInput) (*gql.ImagorConfigResult, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Configuring embedded imagor")

	timestamp := time.Now().UnixMilli()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// Clear existing imagor-specific config keys
	if _, err := r.DeleteSystemRegistry(ctx, nil, []string{
		"config.imagor_unsafe",
		"config.imagor_secret",
		"config.imagor_signer_type",
		"config.imagor_signer_truncate",
	}); err != nil {
		r.logger.Error("Failed to clear imagor configuration", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:   false,
			Timestamp: timestampStr,
			Message:   &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	// Build fresh entries
	entries := []gql.RegistryEntryInput{
		{Key: "config.imagor_config_updated_at", Value: timestampStr, IsEncrypted: false},
	}

	if input.Secret != nil && *input.Secret != "" {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_secret", Value: *input.Secret, IsEncrypted: true,
		})
	}

	if input.Unsafe != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_unsafe", Value: fmt.Sprintf("%t", *input.Unsafe), IsEncrypted: false,
		})
	}

	if input.SignerType != nil {
		var signerTypeStr string
		switch *input.SignerType {
		case gql.ImagorSignerTypeSha256:
			signerTypeStr = "sha256"
		case gql.ImagorSignerTypeSha512:
			signerTypeStr = "sha512"
		default:
			signerTypeStr = "sha1"
		}
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_signer_type", Value: signerTypeStr, IsEncrypted: false,
		})
	}

	if input.SignerTruncate != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_signer_truncate", Value: fmt.Sprintf("%d", *input.SignerTruncate), IsEncrypted: false,
		})
	}

	if _, err := r.setSystemRegistryEntries(ctx, entries); err != nil {
		r.logger.Error("Failed to save imagor configuration", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:   false,
			Timestamp: timestampStr,
			Message:   &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	// Reload imagor from registry to apply changes immediately (no restart needed)
	if err := r.imagorProvider.ReloadFromRegistry(); err != nil {
		r.logger.Error("Failed to reload imagor from registry", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:   false,
			Timestamp: timestampStr,
			Message:   &[]string{"Configuration saved but failed to apply"}[0],
		}, nil
	}

	return &gql.ImagorConfigResult{
		Success:   true,
		Timestamp: timestampStr,
		Message:   &[]string{"Imagor configured successfully"}[0],
	}, nil
}

// setSystemRegistryEntries saves a batch of system registry entries
func (r *mutationResolver) setSystemRegistryEntries(ctx context.Context, entries []gql.RegistryEntryInput) ([]*gql.SystemRegistry, error) {
	// Check all entries for config conflicts first (same logic as SetSystemRegistry)
	for _, entry := range entries {
		if _, exists := r.config.GetByRegistryKey(entry.Key); exists {
			return nil, fmt.Errorf("cannot set registry key '%s': this configuration is managed by external config", entry.Key)
		}
	}

	// Convert []gql.RegistryEntryInput to []*gql.RegistryEntryInput
	entryPointers := make([]*gql.RegistryEntryInput, len(entries))
	for i := range entries {
		entryPointers[i] = &entries[i]
	}
	return r.SetSystemRegistry(ctx, nil, entryPointers)
}
