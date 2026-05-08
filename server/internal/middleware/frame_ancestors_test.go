package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewFrameAncestorsConfig_DerivesFromAppURLAndCORSOrigins(t *testing.T) {
	config := NewFrameAncestorsConfig(
		"https://app.imagor.net/path",
		"https://landing.imagor.net, https://studio.imagor.net, *",
		"",
	)

	assert.Equal(t, []string{"'self'", "https://app.imagor.net", "https://landing.imagor.net", "https://studio.imagor.net"}, config.AllowedAncestors)
}

func TestNewFrameAncestorsConfig_UsesExplicitValue(t *testing.T) {
	config := NewFrameAncestorsConfig(
		"https://app.imagor.net",
		"https://landing.imagor.net",
		"'self', https://marketing.imagor.net",
	)

	assert.Equal(t, []string{"'self'", "https://marketing.imagor.net"}, config.AllowedAncestors)
}

func TestFrameAncestorsMiddleware_SetsContentSecurityPolicy(t *testing.T) {
	config := FrameAncestorsConfig{AllowedAncestors: []string{"'self'", "https://landing.imagor.net"}}
	middleware := FrameAncestorsMiddleware(config)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	middleware(handler).ServeHTTP(rr, req)

	assert.Equal(t, "frame-ancestors 'self' https://landing.imagor.net", rr.Header().Get("Content-Security-Policy"))
}

func TestFrameAncestorsMiddleware_AppendsToExistingPolicy(t *testing.T) {
	config := FrameAncestorsConfig{AllowedAncestors: []string{"'self'", "https://landing.imagor.net"}}
	middleware := FrameAncestorsMiddleware(config)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'self'")
		w.WriteHeader(http.StatusOK)
	})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	middleware(handler).ServeHTTP(rr, req)

	assert.Equal(t, "default-src 'self'; frame-ancestors 'self' https://landing.imagor.net", rr.Header().Get("Content-Security-Policy"))
}
