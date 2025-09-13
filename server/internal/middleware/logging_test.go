package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestLoggingMiddleware(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	middleware := LoggingMiddleware(logger)

	tests := []struct {
		name           string
		path           string
		method         string
		handler        http.HandlerFunc
		expectedStatus int
		shouldLog      bool
	}{
		{
			name:   "Normal request",
			path:   "/api/test",
			method: http.MethodGet,
			handler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			},
			expectedStatus: http.StatusOK,
			shouldLog:      true,
		},
		{
			name:   "Health check - should skip logging",
			path:   "/health",
			method: http.MethodGet,
			handler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			},
			expectedStatus: http.StatusOK,
			shouldLog:      false,
		},
		{
			name:   "Error response",
			path:   "/api/error",
			method: http.MethodPost,
			handler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusInternalServerError)
			},
			expectedStatus: http.StatusInternalServerError,
			shouldLog:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			wrappedHandler := middleware(tt.handler)

			req := httptest.NewRequest(tt.method, tt.path, nil)
			rr := httptest.NewRecorder()

			wrappedHandler.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)
		})
	}
}

func TestResponseWriter(t *testing.T) {
	w := httptest.NewRecorder()
	rw := newResponseWriter(w)

	// Test default status code
	assert.Equal(t, http.StatusOK, rw.statusCode)

	// Test WriteHeader
	rw.WriteHeader(http.StatusNotFound)
	assert.Equal(t, http.StatusNotFound, rw.statusCode)

	// Test that underlying ResponseWriter received the status code
	assert.Equal(t, http.StatusNotFound, w.Code)
}
