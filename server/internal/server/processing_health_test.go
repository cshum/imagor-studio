package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type processingHealthTestStore struct {
	ready bool
}

func (s processingHealthTestStore) Get(string) (sharedprocessing.SpaceConfig, bool) {
	return nil, false
}

func (s processingHealthTestStore) GetByHostname(string) (sharedprocessing.SpaceConfig, bool) {
	return nil, false
}

func (s processingHealthTestStore) Start(context.Context) error { return nil }

func (s processingHealthTestStore) Ready() bool { return s.ready }

func TestHealthHandler_NonProcessingNodeReturnsOK(t *testing.T) {
	t.Parallel()

	handler := newHealthHandler(nil)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"status":"ok"}`, rec.Body.String())
}

func TestHealthHandler_ReturnsSyncingUntilReady(t *testing.T) {
	t.Parallel()

	handler := newHealthHandler(processingHealthTestStore{ready: false})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
	assert.JSONEq(t, `{"status":"syncing"}`, rec.Body.String())
}

func TestHealthHandler_ReturnsOKWhenReady(t *testing.T) {
	t.Parallel()

	handler := newHealthHandler(processingHealthTestStore{ready: true})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.JSONEq(t, `{"status":"ok"}`, rec.Body.String())
}
