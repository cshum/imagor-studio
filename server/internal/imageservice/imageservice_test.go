package imageservice

import (
	"testing"
)

func TestNewService(t *testing.T) {
	tests := []struct {
		name     string
		config   Config
		expected string
	}{
		{
			name: "external service",
			config: Config{
				Mode: "external",
				URL:  "http://localhost:8000",
			},
			expected: "external",
		},
		{
			name: "embedded service",
			config: Config{
				Mode: "embedded",
			},
			expected: "embedded",
		},
		{
			name: "disabled service",
			config: Config{
				Mode: "disabled",
			},
			expected: "disabled",
		},
		{
			name: "unknown mode defaults to disabled",
			config: Config{
				Mode: "unknown",
			},
			expected: "disabled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewService(tt.config)
			if service.GetMode() != tt.expected {
				t.Errorf("NewService() mode = %v, want %v", service.GetMode(), tt.expected)
			}
		})
	}
}

func TestExternalService_GenerateURL(t *testing.T) {
	service := &externalService{
		config: Config{
			URL:    "http://localhost:8000",
			Unsafe: true,
		},
	}

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
	if len(url) < len(service.config.URL) {
		t.Errorf("GenerateURL() URL too short: %s", url)
	}
}

func TestExternalService_GenerateURL_WithSecret(t *testing.T) {
	service := &externalService{
		config: Config{
			URL:    "http://localhost:8000",
			Secret: "test-secret",
			Unsafe: false,
		},
	}

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

func TestExternalService_GenerateURL_NoSecret(t *testing.T) {
	service := &externalService{
		config: Config{
			URL:    "http://localhost:8000",
			Secret: "",
			Unsafe: false,
		},
	}

	params := URLParams{
		Width:  300,
		Height: 200,
	}

	_, err := service.GenerateURL("test/image.jpg", params)
	if err == nil {
		t.Error("GenerateURL() expected error when no secret provided for signed URLs")
	}
}

func TestEmbeddedService_GenerateURL(t *testing.T) {
	config := Config{
		Mode:   "embedded",
		Unsafe: true,
	}
	service := newEmbeddedService(config)

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

func TestURLParams_WithFilters(t *testing.T) {
	service := &externalService{
		config: Config{
			URL:    "http://localhost:8000",
			Unsafe: true,
		},
	}

	params := URLParams{
		Width:   300,
		Height:  200,
		Quality: 85,
		Format:  "webp",
		FitIn:   true,
		Smart:   true,
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
