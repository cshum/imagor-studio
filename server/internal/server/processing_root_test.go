package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProcessingRootHandler_RedirectsBaseHostToAppHome(t *testing.T) {
	t.Parallel()

	handler := newProcessingRootHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}), processingTestSpaceConfigReader{}, "https://studio.example.com/", ".imagor.app")

	req := httptest.NewRequest(http.MethodGet, "http://processing.example.test/", nil)
	req.Host = "processing.example.test"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusFound, rec.Code)
	assert.Equal(t, "https://studio.example.com", rec.Header().Get("Location"))
}

func TestProcessingRootHandler_RedirectsSpaceSubdomainToSpaceHome(t *testing.T) {
	t.Parallel()

	store := processingTestSpaceConfigReader{spaces: map[string]sharedprocessing.SpaceConfig{
		"demo": &processingTestSpaceConfig{key: "demo"},
	}}
	handler := newProcessingRootHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}), store, "https://studio.example.com", ".imagor.app")

	req := httptest.NewRequest(http.MethodGet, "http://demo.imagor.app/", nil)
	req.Host = "demo.imagor.app"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusFound, rec.Code)
	assert.Equal(t, "https://studio.example.com/spaces/demo", rec.Header().Get("Location"))
}

func TestProcessingRootHandler_RedirectsCustomDomainToSpaceHome(t *testing.T) {
	t.Parallel()

	store := processingTestSpaceConfigReader{spaces: map[string]sharedprocessing.SpaceConfig{
		"demo": &processingTestSpaceConfig{key: "demo", customDomain: "images.demo.test"},
	}}
	handler := newProcessingRootHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}), store, "https://studio.example.com", ".imagor.app")

	req := httptest.NewRequest(http.MethodGet, "http://images.demo.test/", nil)
	req.Host = "images.demo.test"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusFound, rec.Code)
	assert.Equal(t, "https://studio.example.com/spaces/demo", rec.Header().Get("Location"))
}

func TestProcessingRootHandler_PassesImagorRequestsThrough(t *testing.T) {
	t.Parallel()

	called := false
	handler := newProcessingRootHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusAccepted)
	}), processingTestSpaceConfigReader{}, "https://studio.example.com", ".imagor.app")

	req := httptest.NewRequest(http.MethodGet, "http://demo.imagor.app/unsafe/300x200/test.jpg", nil)
	req.Host = "demo.imagor.app"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	require.True(t, called)
	assert.Equal(t, http.StatusAccepted, rec.Code)
}

func TestProcessingRootHandler_WithoutAppURLFallsBackToImagor(t *testing.T) {
	t.Parallel()

	called := false
	handler := newProcessingRootHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}), processingTestSpaceConfigReader{}, "", ".imagor.app")

	req := httptest.NewRequest(http.MethodGet, "http://demo.imagor.app/", nil)
	req.Host = "demo.imagor.app"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	require.True(t, called)
	assert.Equal(t, http.StatusNoContent, rec.Code)
}
