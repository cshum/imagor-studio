package httphandler

import (
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"go.uber.org/zap/zaptest"
)

// MockImagorProvider for testing
type MockImagorProvider struct {
	handler http.Handler
}

func (m *MockImagorProvider) GetHandler() http.Handler {
	return m.handler
}

// MockFS for testing static files
type MockFS struct {
	files map[string]bool
}

func (m MockFS) Open(name string) (fs.File, error) {
	if m.files[name] {
		return &MockFile{name: name}, nil
	}
	return nil, fs.ErrNotExist
}

type MockFile struct {
	name string
	read bool
}

func (m *MockFile) Stat() (fs.FileInfo, error) {
	return &MockFileInfo{name: m.name}, nil
}

func (m *MockFile) Read(p []byte) (int, error) {
	if m.read {
		return 0, io.EOF // EOF
	}
	m.read = true
	content := "<html><body>Mock HTML</body></html>"
	n := copy(p, []byte(content))
	return n, nil
}

func (m *MockFile) Close() error {
	return nil
}

type MockFileInfo struct {
	name string
}

func (m *MockFileInfo) Name() string       { return m.name }
func (m *MockFileInfo) Size() int64        { return 0 }
func (m *MockFileInfo) Mode() fs.FileMode  { return 0 }
func (m *MockFileInfo) ModTime() time.Time { return time.Now() }
func (m *MockFileInfo) IsDir() bool        { return false }
func (m *MockFileInfo) Sys() interface{}   { return nil }

func TestIsImagorPath(t *testing.T) {
	tests := []struct {
		path     string
		expected bool
		name     string
	}{
		// Should route to imagor
		{"/unsafe/300x200/test.jpg", true, "unsafe path"},
		{"/unsafe/fit-in/300x200/test.jpg", true, "unsafe path with fit-in"},
		{"/params/unsafe/300x200/test.jpg", true, "params with unsafe"},
		{"abc123def456ghi789jkl/test.jpg", true, "valid hash (17+ chars)"},
		{"abcdefghijklmnopqrstuvwxyz123456/test.jpg", true, "long valid hash"},
		{"/abcdefghijklmnopq/300x200/test.jpg", true, "exactly 17 char hash"},

		// Should NOT route to imagor
		{"", false, "empty path"},
		{"/", false, "root path"},
		{"/api/auth/login", false, "API route"},
		{"/api/query", false, "GraphQL API"},
		{"/health", false, "health check"},
		{"/imagor/unsafe/test.jpg", false, "existing imagor prefix"},
		{"short/test.jpg", false, "too short hash (5 chars)"},
		{"abcdefghijklmno/test.jpg", false, "too short hash (15 chars)"},
		{"/gallery", false, "SPA route"},
		{"/admin", false, "SPA route"},
		{"/editor", false, "SPA route"},
		{"invalid-chars!/test.jpg", false, "invalid characters in hash"},
		{"has spaces/test.jpg", false, "spaces in hash"},

		// Edge cases
		{"/params/short/test.jpg", false, "params with short hash"},
		{"/params/abcdefghijklmnopq/test.jpg", true, "params with valid hash"},
		{"adaptive-full-fit-in/test.jpg", false, "fit-in keyword without hash"},
		{"/unsafe/", false, "unsafe without image path"},
		{"/abcdefghijklmnopq/", false, "hash without image path"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isImagorPath(tt.path)
			if result != tt.expected {
				t.Errorf("isImagorPath(%q) = %v, want %v", tt.path, result, tt.expected)
			}
		})
	}
}

func TestSPAHandlerImagorRouting(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Create mock imagor handler
	imagorHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Handler", "imagor")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("imagor response"))
	})

	mockProvider := &MockImagorProvider{handler: imagorHandler}

	// Create mock filesystem with index.html
	mockFS := MockFS{
		files: map[string]bool{
			"index.html": true,
		},
	}

	handler := SPAHandler(mockFS, mockProvider, logger)

	tests := []struct {
		path           string
		expectedHeader string
		expectedStatus int
		name           string
	}{
		{"/unsafe/300x200/test.jpg", "imagor", 200, "unsafe imagor path"},
		{"/abcdefghijklmnopq/test.jpg", "imagor", 200, "signed imagor path"},
		{"/gallery", "", 200, "SPA route"},
		{"/api/auth/login", "", 200, "API route (falls back to SPA)"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.path, nil)
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedHeader != "" {
				header := w.Header().Get("X-Handler")
				if header != tt.expectedHeader {
					t.Errorf("Expected X-Handler %q, got %q", tt.expectedHeader, header)
				}
			}
		})
	}
}

func TestSPAHandlerNoImagorProvider(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Create mock filesystem
	mockFS := MockFS{
		files: map[string]bool{
			"index.html": true,
		},
	}

	// Test with nil imagor provider
	handler := SPAHandler(mockFS, nil, logger)

	req := httptest.NewRequest("GET", "/unsafe/300x200/test.jpg", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	// Should return 404 when no imagor provider available
	if w.Code != 404 {
		t.Errorf("Expected status 404, got %d", w.Code)
	}
}

func TestSPAHandlerFallback(t *testing.T) {
	logger := zaptest.NewLogger(t)

	// Create mock filesystem with index.html
	mockFS := MockFS{
		files: map[string]bool{
			"index.html": true,
		},
	}

	handler := SPAHandler(mockFS, nil, logger)

	// Test SPA fallback for non-existent files
	req := httptest.NewRequest("GET", "/some/spa/route", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	contentType := w.Header().Get("Content-Type")
	if !strings.Contains(contentType, "text/html") {
		t.Errorf("Expected HTML content type, got %q", contentType)
	}
}
