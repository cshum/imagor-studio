package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProcessingCORSMiddleware_AllowsAppURLOriginByDefault(t *testing.T) {
	t.Parallel()

	middleware := newProcessingCORSMiddleware(processingTestSpaceConfigReader{}, "https://app.imagor.net/base", "", ".imagor.app")
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "http://demo.imagor.app/test.jpg", nil)
	req.Host = "demo.imagor.app"
	req.Header.Set("Origin", "https://app.imagor.net")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "https://app.imagor.net", rec.Header().Get("Access-Control-Allow-Origin"))
}

func TestProcessingCORSMiddleware_AllowsSpaceSpecificOrigins(t *testing.T) {
	t.Parallel()

	store := processingTestSpaceConfigReader{spaces: map[string]sharedprocessing.SpaceConfig{
		"demo": &processingTestSpaceConfig{key: "demo", customDomain: "images.demo.test", imagorCORSOrigins: []string{"https://editor.customer.test", "https://cms.customer.test"}},
	}}
	middleware := newProcessingCORSMiddleware(store, "https://app.imagor.net", "", ".imagor.app")
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "http://images.demo.test/test.jpg", nil)
	req.Host = "images.demo.test"
	req.Header.Set("Origin", "https://editor.customer.test")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "https://editor.customer.test", rec.Header().Get("Access-Control-Allow-Origin"))
}

func TestProcessingCORSMiddleware_RejectsUnlistedOrigins(t *testing.T) {
	t.Parallel()

	store := processingTestSpaceConfigReader{spaces: map[string]sharedprocessing.SpaceConfig{
		"demo": &processingTestSpaceConfig{key: "demo", imagorCORSOrigins: []string{"https://editor.customer.test"}},
	}}
	middleware := newProcessingCORSMiddleware(store, "https://app.imagor.net", "", ".imagor.app")
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "http://demo.imagor.app/test.jpg", nil)
	req.Host = "demo.imagor.app"
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
}

func TestProcessingCORSMiddleware_HandlesPreflight(t *testing.T) {
	t.Parallel()

	middleware := newProcessingCORSMiddleware(processingTestSpaceConfigReader{}, "https://app.imagor.net", "https://studio2.imagor.net", ".imagor.app")
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not run for allowed preflight")
	}))

	req := httptest.NewRequest(http.MethodOptions, "http://demo.imagor.app/test.jpg", nil)
	req.Host = "demo.imagor.app"
	req.Header.Set("Origin", "https://studio2.imagor.net")
	req.Header.Set("Access-Control-Request-Method", http.MethodGet)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusNoContent, rec.Code)
	assert.Equal(t, "https://studio2.imagor.net", rec.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", rec.Header().Get("Access-Control-Allow-Credentials"))
}
