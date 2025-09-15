package resolver

import (
	"context"
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor/imagorpath"
	"go.uber.org/zap"
)

// GenerateImagorURL is the resolver for the generateImagorUrl field.
func (r *mutationResolver) GenerateImagorURL(ctx context.Context, galleryKey string, imageKey string, params gql.ImagorParamsInput) (string, error) {
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
func (r *Resolver) generateThumbnailUrls(imagePath string) *gql.ThumbnailUrls {
	if r.imagorProvider == nil {
		return nil
	}
	// Generate different sized URLs using the imagor provider
	gridURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:  300,
		Height: 225,
		Filters: imagorpath.Filters{
			{Name: "quality", Args: "80"},
			{Name: "format", Args: "webp"},
			{Name: "max_frames", Args: "1"},
		},
	})

	previewURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:  1200,
		Height: 900,
		FitIn:  true,
		Filters: imagorpath.Filters{
			{Name: "quality", Args: "90"},
			{Name: "format", Args: "webp"},
		},
	})

	fullURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:  2400,
		Height: 1800,
		FitIn:  true,
		Filters: imagorpath.Filters{
			{Name: "quality", Args: "95"},
			{Name: "format", Args: "webp"},
		},
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
