package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestErrorMiddleware(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	middleware := ErrorMiddleware(logger)

	tests := []struct {
		name           string
		handler        http.HandlerFunc
		expectedStatus int
		expectError    bool
	}{
		{
			name: "Normal request - no panic",
			handler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				w.Write([]byte("OK"))
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name: "Panic with error",
			handler: func(w http.ResponseWriter, r *http.Request) {
				panic("something went wrong")
			},
			expectedStatus: http.StatusInternalServerError,
			expectError:    true,
		},
		{
			name: "Panic with custom error",
			handler: func(w http.ResponseWriter, r *http.Request) {
				panic(apperror.InternalServerError("custom error"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			wrappedHandler := middleware(tt.handler)

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			rr := httptest.NewRecorder()

			wrappedHandler.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp apperror.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, apperror.ErrInternalServer, errResp.Error.Code)
				assert.Equal(t, "An unexpected error occurred", errResp.Error.Message)
			}
		})
	}
}

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
