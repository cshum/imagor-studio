package imageservice

import (
	"context"
	"crypto/sha1"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor/imagorpath"
)

// Service defines the interface for image processing operations
type Service interface {
	// GenerateURL generates an imagor URL for the given image path and parameters
	GenerateURL(imagePath string, params URLParams) (string, error)

	// IsHealthy checks if the imagor service is available (for external mode)
	IsHealthy(ctx context.Context) bool

	// GetMode returns the current imagor mode
	GetMode() string

	// GetHandler returns the HTTP handler for embedded mode (nil for external/disabled)
	GetHandler() http.Handler
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

// Config holds imagor service configuration
type Config struct {
	Mode          string // "external", "embedded", "disabled"
	URL           string // External imagor service URL
	Secret        string // Secret key for URL signing
	Unsafe        bool   // Enable unsafe URLs for development
	ResultStorage string // "same", "separate"
}

// NewService creates a new imagor service based on configuration
func NewService(config Config) Service {
	switch config.Mode {
	case "external":
		return &externalService{config: config}
	case "embedded":
		return newEmbeddedService(config)
	case "disabled":
		return &disabledService{}
	default:
		return &disabledService{}
	}
}

// externalService implements Service for external imagor instances
type externalService struct {
	config Config
}

func (s *externalService) GenerateURL(imagePath string, params URLParams) (string, error) {
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

	// Generate path
	var path string
	if s.config.Unsafe {
		path = imagorpath.GenerateUnsafe(imagorParams)
		return fmt.Sprintf("%s/%s", s.config.URL, path), nil
	}

	// Generate signed path
	if s.config.Secret == "" {
		return "", fmt.Errorf("imagor secret is required for signed URLs")
	}

	signer := imagorpath.NewDefaultSigner(s.config.Secret)
	path = imagorpath.Generate(imagorParams, signer)
	return fmt.Sprintf("%s/%s", s.config.URL, path), nil
}

func (s *externalService) IsHealthy(ctx context.Context) bool {
	if s.config.URL == "" {
		return false
	}

	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "GET", s.config.URL+"/health", nil)
	if err != nil {
		return false
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func (s *externalService) GetMode() string {
	return "external"
}

func (s *externalService) GetHandler() http.Handler {
	return nil
}

// embeddedService implements Service for embedded imagor functionality
type embeddedService struct {
	config  Config
	handler http.Handler
}

func newEmbeddedService(config Config) *embeddedService {
	// Create imagor instance with configuration
	options := []imagor.Option{
		imagor.WithUnsafe(config.Unsafe),
	}

	// Add signer if secret is provided (following imagor's pattern)
	if config.Secret != "" {
		alg := sha1.New // Default to SHA1 like imagor
		signer := imagorpath.NewHMACSigner(alg, 0, config.Secret)
		options = append(options, imagor.WithSigner(signer))
	}

	app := imagor.New(options...)

	return &embeddedService{
		config:  config,
		handler: app,
	}
}

func (s *embeddedService) GenerateURL(imagePath string, params URLParams) (string, error) {
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

	// Generate path for embedded service (points to our own server)
	var path string
	if s.config.Unsafe {
		path = imagorpath.GenerateUnsafe(imagorParams)
		return fmt.Sprintf("/imagor/%s", path), nil
	}

	// Generate signed path
	if s.config.Secret == "" {
		return "", fmt.Errorf("imagor secret is required for signed URLs")
	}

	signer := imagorpath.NewDefaultSigner(s.config.Secret)
	path = imagorpath.Generate(imagorParams, signer)
	return fmt.Sprintf("/imagor/%s", path), nil
}

func (s *embeddedService) IsHealthy(ctx context.Context) bool {
	// Embedded service is always healthy if configured
	return true
}

func (s *embeddedService) GetMode() string {
	return "embedded"
}

func (s *embeddedService) GetHandler() http.Handler {
	return s.handler
}

// disabledService implements Service when imagor is disabled
type disabledService struct{}

func (s *disabledService) GenerateURL(imagePath string, params URLParams) (string, error) {
	// Return direct file URL without processing
	return fmt.Sprintf("/api/file/%s", url.PathEscape(imagePath)), nil
}

func (s *disabledService) IsHealthy(ctx context.Context) bool {
	return true
}

func (s *disabledService) GetMode() string {
	return "disabled"
}

func (s *disabledService) GetMetadata(ctx context.Context, imagePath string) (map[string]interface{}, error) {
	// When imagor is disabled, we can't fetch metadata
	return nil, fmt.Errorf("metadata not available when imagor is disabled")
}

func (s *disabledService) GetHandler() http.Handler {
	return nil
}
