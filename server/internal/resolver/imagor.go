package resolver

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor/imagorpath"
	"go.uber.org/zap"
)

// GenerateImagorURL is the resolver for the generateImagorUrl field.
func (r *mutationResolver) GenerateImagorURL(ctx context.Context, galleryKey string, imageKey string, params gql.ImagorParamsInput) (string, error) {
	if err := RequireEditPermission(ctx); err != nil {
		return "", err
	}

	r.logger.Debug("Generating imagor URL",
		zap.String("galleryKey", galleryKey),
		zap.String("imageKey", imageKey))

	// Build image path from galleryKey and imageKey
	imagePath := buildImagePath(galleryKey, imageKey)

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

	// Build filters with video thumbnail position
	filters := r.buildThumbnailFilters(videoThumbnailPos)

	// Generate different sized URLs using the imagor provider
	gridURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:   300,
		Height:  225,
		Filters: filters,
	})

	// Use same filters for preview and full URLs
	previewFilters := r.buildThumbnailFilters(videoThumbnailPos)
	// Update quality for preview
	for i := range previewFilters {
		if previewFilters[i].Name == "quality" {
			previewFilters[i].Args = "90"
		}
	}

	previewURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:   1200,
		Height:  900,
		FitIn:   true,
		Filters: previewFilters,
	})

	fullFilters := r.buildThumbnailFilters(videoThumbnailPos)
	// Update quality for full
	for i := range fullFilters {
		if fullFilters[i].Name == "quality" {
			fullFilters[i].Args = "95"
		}
	}

	fullURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:   2400,
		Height:  1800,
		FitIn:   true,
		Filters: fullFilters,
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

// buildThumbnailFilters builds imagor filters based on video thumbnail position
// Video filters (frame/seek) are no-op for images, so safe to apply to all files
func (r *Resolver) buildThumbnailFilters(position string) imagorpath.Filters {
	filters := imagorpath.Filters{
		{Name: "quality", Args: "80"},
		{Name: "format", Args: "webp"},
	}

	// Add video thumbnail filter based on position
	switch position {
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
		// default: no video filter added - imagorvideo uses its default behavior
	}

	return filters
}

// ImagorStatus is the resolver for the imagorStatus field.
func (r *queryResolver) ImagorStatus(ctx context.Context) (*gql.ImagorStatus, error) {
	// Use batch operation for better performance
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.imagor_mode",
		"config.imagor_config_updated_at")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Get current imagor configuration
	imagorConfig := r.imagorProvider.GetConfig()
	if imagorConfig == nil {
		// Get JWT secret from config
		jwtSecret := ""
		if value, exists := r.config.GetByRegistryKey("config.jwt_secret"); exists {
			jwtSecret = value
		}

		// Default to embedded mode if no config
		imagorConfig = &imagorprovider.ImagorConfig{
			Mode:           imagorprovider.ImagorModeEmbedded,
			BaseURL:        "/imagor",
			Secret:         jwtSecret,
			Unsafe:         false,
			SignerType:     "sha256",
			SignerTruncate: 28,
		}
	}

	// Check if restart is required
	restartRequired := r.imagorProvider.IsRestartRequired()

	var lastUpdated *string
	if timestampResult := resultMap["config.imagor_config_updated_at"]; timestampResult.Exists {
		lastUpdated = &timestampResult.Value
	}

	// Check if any imagor config is overridden
	isConfigOverridden := r.isImagorConfigOverridden(ctx, imagorConfig.Mode.String())

	// Convert string mode to enum
	var mode *gql.ImagorMode
	switch imagorConfig.Mode {
	case imagorprovider.ImagorModeEmbedded:
		mode = &[]gql.ImagorMode{gql.ImagorModeEmbedded}[0]
	case imagorprovider.ImagorModeExternal:
		mode = &[]gql.ImagorMode{gql.ImagorModeExternal}[0]
	}

	status := &gql.ImagorStatus{
		Configured:           true, // Always configured (defaults to embedded)
		Mode:                 mode,
		RestartRequired:      restartRequired,
		LastUpdated:          lastUpdated,
		IsOverriddenByConfig: isConfigOverridden,
	}

	// Add mode-specific configuration
	if imagorConfig.Mode == imagorprovider.ImagorModeExternal {
		status.ExternalConfig = r.getExternalImagorConfig(ctx, imagorConfig)
	}

	return status, nil
}

// Helper function to check if imagor config is overridden
func (r *queryResolver) isImagorConfigOverridden(ctx context.Context, mode string) bool {
	var keys []string
	if mode == "embedded" {
		keys = []string{
			"config.imagor_mode",
			"config.imagor_secret",
		}
	} else {
		keys = []string{
			"config.imagor_mode",
			"config.imagor_base_url",
			"config.imagor_secret",
			"config.imagor_unsafe",
			"config.imagor_signer_type",
			"config.imagor_signer_truncate",
		}
	}

	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config, keys...)
	for _, result := range results {
		if result.IsOverriddenByConfig {
			return true
		}
	}
	return false
}

// Helper function to get external imagor configuration
func (r *queryResolver) getExternalImagorConfig(ctx context.Context, imagorConfig *imagorprovider.ImagorConfig) *gql.ExternalImagorConfig {
	// Convert signer type to GraphQL enum
	var signerType gql.ImagorSignerType
	switch strings.ToLower(imagorConfig.SignerType) {
	case "sha256":
		signerType = gql.ImagorSignerTypeSha256
	case "sha512":
		signerType = gql.ImagorSignerTypeSha512
	default:
		signerType = gql.ImagorSignerTypeSha1
	}

	return &gql.ExternalImagorConfig{
		BaseURL:        imagorConfig.BaseURL,
		HasSecret:      imagorConfig.Secret != "",
		Unsafe:         imagorConfig.Unsafe,
		SignerType:     signerType,
		SignerTruncate: imagorConfig.SignerTruncate,
	}
}

// ConfigureEmbeddedImagor is the resolver for the configureEmbeddedImagor field.
func (r *mutationResolver) ConfigureEmbeddedImagor(ctx context.Context) (*gql.ImagorConfigResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Configuring embedded imagor")

	// Set timestamp
	timestamp := time.Now().UnixMilli()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// delete from registry
	if _, err := r.DeleteSystemRegistry(ctx, nil, []string{
		"config.imagor_unsafe",
		"config.imagor_base_url",
		"config.imagor_secret",
		"config.imagor_signer_type",
		"config.imagor_signer_truncate",
	}); err != nil {
		r.logger.Error("Failed to save embedded imagor configuration", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	// Save to registry
	_, err := r.setSystemRegistryEntries(ctx, []gql.RegistryEntryInput{
		{Key: "config.imagor_mode", Value: "embedded", IsEncrypted: false},
		{Key: "config.imagor_config_updated_at", Value: timestampStr, IsEncrypted: false},
	})
	if err != nil {
		r.logger.Error("Failed to save embedded imagor configuration", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	// Reload imagor from registry to apply changes immediately
	if err := r.imagorProvider.ReloadFromRegistry(); err != nil {
		r.logger.Error("Failed to reload imagor from registry", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Configuration saved but failed to apply"}[0],
		}, nil
	}

	// Embedded mode typically doesn't require restart
	restartRequired := r.imagorProvider.IsRestartRequired()

	return &gql.ImagorConfigResult{
		Success:         true,
		RestartRequired: restartRequired,
		Timestamp:       timestampStr,
		Message:         &[]string{"Embedded imagor configured successfully"}[0],
	}, nil
}

// ConfigureExternalImagor is the resolver for the configureExternalImagor field.
func (r *mutationResolver) ConfigureExternalImagor(ctx context.Context, input gql.ExternalImagorInput) (*gql.ImagorConfigResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Configuring external imagor", zap.String("baseUrl", input.BaseURL))

	// Set timestamp
	timestamp := time.Now().UnixMilli()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// Prepare registry entries
	entries := []gql.RegistryEntryInput{
		{Key: "config.imagor_mode", Value: "external", IsEncrypted: false},
		{Key: "config.imagor_base_url", Value: input.BaseURL, IsEncrypted: false},
		{Key: "config.imagor_config_updated_at", Value: timestampStr, IsEncrypted: false},
	}

	// Add optional secret
	if input.Secret != nil && *input.Secret != "" {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_secret", Value: *input.Secret, IsEncrypted: true,
		})
	}

	// Add optional unsafe flag
	if input.Unsafe != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_unsafe", Value: fmt.Sprintf("%t", *input.Unsafe), IsEncrypted: false,
		})
	}

	// Add optional signer type
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

	// Add optional signer truncate
	if input.SignerTruncate != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_signer_truncate", Value: fmt.Sprintf("%d", *input.SignerTruncate), IsEncrypted: false,
		})
	}

	// Save to registry
	_, err := r.setSystemRegistryEntries(ctx, entries)
	if err != nil {
		r.logger.Error("Failed to save external imagor configuration", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	// External mode configuration doesn't require restart (no embedded handler to recreate)
	return &gql.ImagorConfigResult{
		Success:         true,
		RestartRequired: false,
		Timestamp:       timestampStr,
		Message:         &[]string{"External imagor configured successfully"}[0],
	}, nil
}

// Helper function to set system registry entries
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
