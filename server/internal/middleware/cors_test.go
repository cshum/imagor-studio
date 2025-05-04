package middleware

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDefaultCORSConfig(t *testing.T) {
	config := DefaultCORSConfig()

	assert.Equal(t, []string{"*"}, config.AllowedOrigins)
	assert.Equal(t, []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}, config.AllowedMethods)
	assert.Equal(t, []string{"Accept", "Content-Type", "Content-Length", "Accept-Encoding", "Authorization", "X-CSRF-Token"}, config.AllowedHeaders)
	assert.True(t, config.AllowCredentials)
	assert.Equal(t, 86400, config.MaxAge)
}

func TestCORSMiddleware_SimpleRequest(t *testing.T) {
	config := DefaultCORSConfig()
	middleware := CORSMiddleware(config)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	wrappedHandler := middleware(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Origin", "https://example.com")

	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "*", rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", rr.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORSMiddleware_PreflightRequest(t *testing.T) {
	config := DefaultCORSConfig()
	middleware := CORSMiddleware(config)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Handler should not be called for preflight requests")
	})

	wrappedHandler := middleware(handler)

	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	req.Header.Set("Origin", "https://example.com")
	req.Header.Set("Access-Control-Request-Method", "POST")

	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	assert.Equal(t, "*", rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", rr.Header().Get("Access-Control-Allow-Credentials"))
	assert.Equal(t, strings.Join(config.AllowedMethods, ", "), rr.Header().Get("Access-Control-Allow-Methods"))
	assert.Equal(t, strings.Join(config.AllowedHeaders, ", "), rr.Header().Get("Access-Control-Allow-Headers"))
	assert.Equal(t, strconv.Itoa(config.MaxAge), rr.Header().Get("Access-Control-Max-Age"))
}

func TestCORSMiddleware_SpecificOrigin(t *testing.T) {
	config := CORSConfig{
		AllowedOrigins:   []string{"https://example.com", "https://test.com"},
		AllowedMethods:   []string{"GET", "POST"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
		MaxAge:           3600,
	}
	middleware := CORSMiddleware(config)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	wrappedHandler := middleware(handler)

	// Test allowed origin
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Origin", "https://example.com")

	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "https://example.com", rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", rr.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORSMiddleware_DisallowedOrigin(t *testing.T) {
	config := CORSConfig{
		AllowedOrigins:   []string{"https://example.com"},
		AllowedMethods:   []string{"GET", "POST"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
		MaxAge:           3600,
	}
	middleware := CORSMiddleware(config)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	wrappedHandler := middleware(handler)

	// Test disallowed origin
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Origin", "https://notallowed.com")

	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Empty(t, rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Empty(t, rr.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORSMiddleware_NoCredentials(t *testing.T) {
	config := CORSConfig{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: false,
		MaxAge:           0,
	}
	middleware := CORSMiddleware(config)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	wrappedHandler := middleware(handler)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Origin", "https://example.com")

	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "*", rr.Header().Get("Access-Control-Allow-Origin"))
	assert.Empty(t, rr.Header().Get("Access-Control-Allow-Credentials"))
}

func TestJoinStrings(t *testing.T) {
	tests := []struct {
		name      string
		strs      []string
		separator string
		expected  string
	}{
		{
			name:      "Multiple strings",
			strs:      []string{"GET", "POST", "PUT"},
			separator: ", ",
			expected:  "GET, POST, PUT",
		},
		{
			name:      "Single string",
			strs:      []string{"GET"},
			separator: ", ",
			expected:  "GET",
		},
		{
			name:      "Empty array",
			strs:      []string{},
			separator: ", ",
			expected:  "",
		},
		{
			name:      "Different separator",
			strs:      []string{"A", "B", "C"},
			separator: "|",
			expected:  "A|B|C",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := joinStrings(tt.strs, tt.separator)
			assert.Equal(t, tt.expected, result)
		})
	}
}
