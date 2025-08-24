package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/cshum/imagor-studio/server/pkg/errors"
)

// HTTPHandler represents a simplified handler function
type HTTPHandler func(w http.ResponseWriter, r *http.Request) error

// Handle wraps a handler with common middleware (method checking, error handling)
func Handle(method string, handler HTTPHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Method validation
		if r.Method != method {
			errors.WriteErrorResponse(w, http.StatusMethodNotAllowed,
				errors.ErrInvalidInput, "Method not allowed", nil)
			return
		}

		// Execute handler and handle errors
		if err := handler(w, r); err != nil {
			if appErr, ok := err.(*errors.AppError); ok {
				errors.WriteErrorResponse(w, appErr.StatusCode, appErr.Code, appErr.Message, appErr.Details)
			} else {
				errors.WriteErrorResponse(w, http.StatusInternalServerError,
					errors.ErrInternalServer, err.Error(), nil)
			}
		}
	}
}

// DecodeJSON decodes JSON request body into the provided struct
func DecodeJSON(r *http.Request, dest interface{}) error {
	if err := json.NewDecoder(r.Body).Decode(dest); err != nil {
		return errors.NewAppError(http.StatusBadRequest, errors.ErrInvalidInput,
			"Invalid request body", map[string]interface{}{"error": err.Error()})
	}
	return nil
}

// WriteJSON writes a JSON response with the specified status code
func WriteJSON(w http.ResponseWriter, statusCode int, data interface{}) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	return json.NewEncoder(w).Encode(data)
}

// WriteSuccess writes a successful JSON response (200)
func WriteSuccess(w http.ResponseWriter, data interface{}) error {
	return WriteJSON(w, http.StatusOK, data)
}

// WriteCreated writes a created JSON response (201)
func WriteCreated(w http.ResponseWriter, data interface{}) error {
	return WriteJSON(w, http.StatusCreated, data)
}
