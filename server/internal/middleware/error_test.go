package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/apperror"
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
				assert.Equal(t, "INTERNAL_SERVER_ERROR", errResp.Code)
				assert.NotEmpty(t, errResp.Error)
			}
		})
	}
}
