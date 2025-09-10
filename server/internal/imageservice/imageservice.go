package imageservice

import (
	"fmt"
	"net/url"

	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor/imagorpath"
)

// Service defines the interface for image processing operations
type Service interface {
	// GenerateURL generates an imagor URL for the given image path and parameters
	GenerateURL(imagePath string, params URLParams) (string, error)
}

// URLParams defines parameters for imagor URL generation
type URLParams struct {
	Meta    bool
	Raw     bool
	Width   int
	Height  int
	Quality int
	Format  string // jpg, png, webp, etc.
	FitIn   bool   // Use fit-in mode
	Smart   bool   // Use smart cropping
	Filters []Filter
}

// Filter represents an imagor filter
type Filter struct {
	Name string
	Args string
}

// ImagorProvider defines the interface for imagor configuration providers
type ImagorProvider interface {
	GetConfig() *imagorprovider.ImagorConfig
}

// service implements Service using imagor provider for dynamic configuration
type service struct {
	imagorProvider ImagorProvider
}

// NewService creates a new imagor service using the provider
func NewService(imagorProvider ImagorProvider) Service {
	return &service{
		imagorProvider: imagorProvider,
	}
}

// GenerateURL generates an imagor URL for the given image path and parameters
func (s *service) GenerateURL(imagePath string, params URLParams) (string, error) {
	// Get current imagor configuration
	config := s.imagorProvider.GetConfig()
	if config == nil || config.Mode == "disabled" {
		// Return direct file URL without processing when disabled
		return fmt.Sprintf("/api/file/%s", url.PathEscape(imagePath)), nil
	}

	// Build imagorpath.Params
	imagorParams := imagorpath.Params{
		Image:  imagePath,
		Meta:   params.Meta,
		Width:  params.Width,
		Height: params.Height,
		FitIn:  params.FitIn,
		Smart:  params.Smart,
	}

	// Add filters
	if len(params.Filters) > 0 {
		imagorParams.Filters = make(imagorpath.Filters, len(params.Filters))
		for i, filter := range params.Filters {
			imagorParams.Filters[i] = imagorpath.Filter{
				Name: filter.Name,
				Args: filter.Args,
			}
		}
	}

	// Add raw filter if specified
	if params.Raw {
		rawFilter := imagorpath.Filter{
			Name: "raw",
		}
		imagorParams.Filters = append(imagorParams.Filters, rawFilter)
	}

	// Add quality filter if specified
	if params.Quality > 0 && params.Quality <= 100 {
		qualityFilter := imagorpath.Filter{
			Name: "quality",
			Args: fmt.Sprintf("%d", params.Quality),
		}
		imagorParams.Filters = append(imagorParams.Filters, qualityFilter)
	}

	// Add format filter if specified
	if params.Format != "" {
		formatFilter := imagorpath.Filter{
			Name: "format",
			Args: params.Format,
		}
		imagorParams.Filters = append(imagorParams.Filters, formatFilter)
	}

	// Generate path using imagorpath
	var path string
	if config.Unsafe {
		path = imagorpath.GenerateUnsafe(imagorParams)
	} else {
		// Generate signed path
		if config.Secret == "" {
			return "", fmt.Errorf("imagor secret is required for signed URLs")
		}
		signer := imagorpath.NewDefaultSigner(config.Secret)
		path = imagorpath.Generate(imagorParams, signer)
	}

	// Combine with base URL
	if config.BaseURL == "/imagor" {
		// Embedded mode - relative path
		return fmt.Sprintf("%s/%s", config.BaseURL, path), nil
	} else {
		// External mode - full URL
		return fmt.Sprintf("%s/%s", config.BaseURL, path), nil
	}
}
