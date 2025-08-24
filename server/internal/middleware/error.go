package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/cshum/imagor-studio/server/internal/apperror"
	"go.uber.org/zap"
)

// ErrorMiddleware handles panics and errors in a standardized way
func ErrorMiddleware(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					// Log the panic with stack trace
					logger.Error("Panic recovered",
						zap.Any("error", err),
						zap.String("stack", string(debug.Stack())),
					)

					// Return standardized error response
					apperror.WriteErrorResponse(w, http.StatusInternalServerError,
						apperror.ErrInternalServer,
						"An unexpected error occurred",
						nil)
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}

// ResponseWriter wrapper to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{w, http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// LoggingMiddleware logs requests with duration and status
func LoggingMiddleware(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip logging for health check endpoint
			if r.URL.Path == "/health" {
				next.ServeHTTP(w, r)
				return
			}

			wrapped := newResponseWriter(w)

			logger.Info("Request started",
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
				zap.String("remote_addr", r.RemoteAddr),
			)

			next.ServeHTTP(wrapped, r)

			logger.Info("Request completed",
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
				zap.Int("status", wrapped.statusCode),
			)
		})
	}
}
