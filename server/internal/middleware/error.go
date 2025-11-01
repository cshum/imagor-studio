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
					internalErr := apperror.InternalServerError("An unexpected error occurred")
					apperror.WriteHTTPErrorResponse(w, internalErr)
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
