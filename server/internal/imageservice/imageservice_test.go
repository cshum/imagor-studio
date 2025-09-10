package imageservice

import (
	"testing"

	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
)

// mockImagorProvider implements a mock imagor provider for testing
type mockImagorProvider struct {
	config *imagorprovider.ImagorConfig
}

func (m *mockImagorProvider) GetConfig() *imagorprovider.ImagorConfig {
	return m.config
}

func (m *mockImagorProvider) GetHandler() interface{} {
	return nil
}

func TestNewService(t *testing.T) {
	provider := &mockImagorProvider{
		config: &imagorprovider.ImagorConfig{
			Mode:    "external",
			BaseURL: "http://localhost:8000",
			Secret:  "test-secret",
			Unsafe:  false,
		},
	}

	service := NewService(provider)
	if service == nil {
		t.Error("NewService() returned nil")
	}
}

func TestService_GenerateURL_External(t *testing.T) {
	provider := &mockImagorProvider{
		config: &imagorprovider.ImagorConfig{
			Mode:    "external",
			BaseURL: "http://localhost:8000",
			Secret:  "",
			Unsafe:  true,
		},
	}

	service := NewService(provider)

	params := URLParams{
		Width:  300,
		Height: 200,
		Filters: []Filter{
			{Name: "quality", Args: "80"},
		},
	}

	url, err := service.GenerateURL("test/image.jpg", params)
	if err != nil {
		t.Fatalf("GenerateURL() error = %v", err)
	}

	if url == "" {
		t.Error("GenerateURL() returned empty URL")
	}

	// Should contain the base URL
	if len(url) < len(provider.config.BaseURL) {
		t.Errorf("GenerateURL() URL too short: %s", url)
	}
}

func TestService_GenerateURL_Embedded(t *testing.T) {
	provider := &mockImagorProvider{
		config: &imagorprovider.ImagorConfig{
			Mode:    "embedded",
			BaseURL: "/imagor",
			Secret:  "",
			Unsafe:  true,
		},
	}

	service := NewService(provider)

	params := URLParams{
		Width:  300,
		Height: 200,
		Filters: []Filter{
			{Name: "quality", Args: "80"},
		},
	}

	url, err := service.GenerateURL("test/image.jpg", params)
	if err != nil {
		t.Fatalf("GenerateURL() error = %v", err)
	}

	if url == "" {
		t.Error("GenerateURL() returned empty URL")
	}

	// Should start with /imagor/
	if len(url) < 8 || url[:8] != "/imagor/" {
		t.Errorf("GenerateURL() URL should start with /imagor/, got: %s", url)
	}
}

func TestService_GenerateURL_Disabled(t *testing.T) {
	provider := &mockImagorProvider{
		config: &imagorprovider.ImagorConfig{
			Mode: "disabled",
		},
	}

	service := NewService(provider)

	params := URLParams{
		Width:  300,
		Height: 200,
	}

	url, err := service.GenerateURL("test/image.jpg", params)
	if err != nil {
		t.Fatalf("GenerateURL() error = %v", err)
	}

	if url == "" {
		t.Error("GenerateURL() returned empty URL")
	}

	// Should return direct file URL
	expected := "/api/file/test%2Fimage.jpg"
	if url != expected {
		t.Errorf("GenerateURL() = %v, want %v", url, expected)
	}
}

func TestService_GenerateURL_WithSecret(t *testing.T) {
	provider := &mockImagorProvider{
		config: &imagorprovider.ImagorConfig{
			Mode:    "external",
			BaseURL: "http://localhost:8000",
			Secret:  "test-secret",
			Unsafe:  false,
		},
	}

	service := NewService(provider)

	params := URLParams{
		Width:  300,
		Height: 200,
	}

	url, err := service.GenerateURL("test/image.jpg", params)
	if err != nil {
		t.Fatalf("GenerateURL() error = %v", err)
	}

	if url == "" {
		t.Error("GenerateURL() returned empty URL")
	}
}

func TestService_GenerateURL_NoSecret(t *testing.T) {
	provider := &mockImagorProvider{
		config: &imagorprovider.ImagorConfig{
			Mode:    "external",
			BaseURL: "http://localhost:8000",
			Secret:  "",
			Unsafe:  false,
		},
	}

	service := NewService(provider)

	params := URLParams{
		Width:  300,
		Height: 200,
	}

	_, err := service.GenerateURL("test/image.jpg", params)
	if err == nil {
		t.Error("GenerateURL() expected error when no secret provided for signed URLs")
	}
}

func TestService_GenerateURL_WithFilters(t *testing.T) {
	provider := &mockImagorProvider{
		config: &imagorprovider.ImagorConfig{
			Mode:    "external",
			BaseURL: "http://localhost:8000",
			Secret:  "",
			Unsafe:  true,
		},
	}

	service := NewService(provider)

	params := URLParams{
		Width:   300,
		Height:  200,
		Quality: 85,
		Format:  "webp",
		FitIn:   true,
		Smart:   true,
		Raw:     false,
		Filters: []Filter{
			{Name: "blur", Args: "5"},
			{Name: "brightness", Args: "10"},
		},
	}

	url, err := service.GenerateURL("test/image.jpg", params)
	if err != nil {
		t.Fatalf("GenerateURL() error = %v", err)
	}

	if url == "" {
		t.Error("GenerateURL() returned empty URL")
	}
}

func TestService_GenerateURL_WithRawFilter(t *testing.T) {
	provider := &mockImagorProvider{
		config: &imagorprovider.ImagorConfig{
			Mode:    "external",
			BaseURL: "http://localhost:8000",
			Secret:  "",
			Unsafe:  true,
		},
	}

	service := NewService(provider)

	params := URLParams{
		Width:  300,
		Height: 200,
		Raw:    true,
	}

	url, err := service.GenerateURL("test/image.jpg", params)
	if err != nil {
		t.Fatalf("GenerateURL() error = %v", err)
	}

	if url == "" {
		t.Error("GenerateURL() returned empty URL")
	}
}

func TestFilter(t *testing.T) {
	filter := Filter{
		Name: "quality",
		Args: "80",
	}

	if filter.Name != "quality" {
		t.Errorf("Filter.Name = %v, want quality", filter.Name)
	}

	if filter.Args != "80" {
		t.Errorf("Filter.Args = %v, want 80", filter.Args)
	}
}

func TestURLParams(t *testing.T) {
	params := URLParams{
		Meta:    true,
		Raw:     false,
		Width:   300,
		Height:  200,
		Quality: 85,
		Format:  "webp",
		FitIn:   true,
		Smart:   true,
		Filters: []Filter{
			{Name: "blur", Args: "5"},
		},
	}

	if !params.Meta {
		t.Error("URLParams.Meta should be true")
	}

	if params.Raw {
		t.Error("URLParams.Raw should be false")
	}

	if params.Width != 300 {
		t.Errorf("URLParams.Width = %v, want 300", params.Width)
	}

	if params.Height != 200 {
		t.Errorf("URLParams.Height = %v, want 200", params.Height)
	}

	if params.Quality != 85 {
		t.Errorf("URLParams.Quality = %v, want 85", params.Quality)
	}

	if params.Format != "webp" {
		t.Errorf("URLParams.Format = %v, want webp", params.Format)
	}

	if !params.FitIn {
		t.Error("URLParams.FitIn should be true")
	}

	if !params.Smart {
		t.Error("URLParams.Smart should be true")
	}

	if len(params.Filters) != 1 {
		t.Errorf("URLParams.Filters length = %v, want 1", len(params.Filters))
	}

	if params.Filters[0].Name != "blur" {
		t.Errorf("URLParams.Filters[0].Name = %v, want blur", params.Filters[0].Name)
	}
}
