package apperror

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/vektah/gqlparser/v2/gqlerror"
)

// ErrorInfo contains both the error code and its HTTP status with methods
type ErrorInfo struct {
	code   string
	status int
}

// Code returns the error code string
func (e ErrorInfo) Code() string {
	return e.code
}

// Status returns the HTTP status code
func (e ErrorInfo) Status() int {
	return e.status
}

// String returns the error code (for compatibility)
func (e ErrorInfo) String() string {
	return e.code
}

// MarshalJSON implements json.Marshaler interface
// This allows ErrorInfo to be serialized directly as a string
func (e ErrorInfo) MarshalJSON() ([]byte, error) {
	return json.Marshal(e.code)
}

// Error definitions with embedded status codes (adapted for imagor-studio)
var (
	ErrUnauthorized       = ErrorInfo{"UNAUTHORIZED", http.StatusUnauthorized}
	ErrInvalidToken       = ErrorInfo{"INVALID_TOKEN", http.StatusUnauthorized}
	ErrTokenExpired       = ErrorInfo{"TOKEN_EXPIRED", http.StatusUnauthorized}
	ErrInvalidCredentials = ErrorInfo{"INVALID_CREDENTIALS", http.StatusUnauthorized}

	ErrValidationFailed = ErrorInfo{"VALIDATION_FAILED", http.StatusBadRequest}
	ErrInvalidInput     = ErrorInfo{"INVALID_INPUT", http.StatusBadRequest}

	ErrNotFound      = ErrorInfo{"NOT_FOUND", http.StatusNotFound}
	ErrAlreadyExists = ErrorInfo{"ALREADY_EXISTS", http.StatusConflict}
	ErrConflict      = ErrorInfo{"CONFLICT", http.StatusConflict}

	ErrInternalServer     = ErrorInfo{"INTERNAL_SERVER_ERROR", http.StatusInternalServerError}
	ErrServiceUnavailable = ErrorInfo{"SERVICE_UNAVAILABLE", http.StatusServiceUnavailable}
	ErrTimeout            = ErrorInfo{"TIMEOUT", http.StatusRequestTimeout}

	ErrStorageFailure       = ErrorInfo{"STORAGE_FAILURE", http.StatusInternalServerError}
	ErrStorageNotFound      = ErrorInfo{"STORAGE_NOT_FOUND", http.StatusNotFound}
	ErrStorageInvalidConfig = ErrorInfo{"STORAGE_INVALID_CONFIG", http.StatusBadRequest}

	ErrPermissionDenied = ErrorInfo{"PERMISSION_DENIED", http.StatusForbidden}
	ErrForbidden        = ErrorInfo{"FORBIDDEN", http.StatusForbidden}
)

// GraphQL Error Functions with Field Support
// These functions create GraphQL errors with field-specific extensions
// following the fitness-crm pattern for better frontend error handling

// addFieldInfo adds field and argumentName to extensions if provided
// Follows Apollo Server standard for field-specific errors
func addFieldInfo(extensions map[string]interface{}, field ...string) {
	if len(field) >= 1 && field[0] != "" {
		extensions["field"] = field[0]
	}
	if len(field) >= 2 && field[1] != "" {
		extensions["argumentName"] = field[1]
	}
}

// InternalServerError creates a generic internal server error
// Optional field parameters: field, argumentName
func InternalServerError(message string, field ...string) error {
	extensions := map[string]interface{}{
		"code": ErrInternalServer,
	}
	addFieldInfo(extensions, field...)
	return &gqlerror.Error{
		Message:    message,
		Extensions: extensions,
	}
}

// BadRequest creates a bad request error
// Optional field parameters: field, argumentName
func BadRequest(message string, details map[string]interface{}, field ...string) error {
	extensions := map[string]interface{}{
		"code": ErrInvalidInput,
	}
	// Merge details into extensions
	for k, v := range details {
		extensions[k] = v
	}
	addFieldInfo(extensions, field...)
	return &gqlerror.Error{
		Message:    message,
		Extensions: extensions,
	}
}

// Unauthorized creates an unauthorized error
// Optional field parameters: field, argumentName
func Unauthorized(message string, field ...string) error {
	extensions := map[string]interface{}{
		"code": ErrUnauthorized,
	}
	addFieldInfo(extensions, field...)
	return &gqlerror.Error{
		Message:    message,
		Extensions: extensions,
	}
}

// InvalidCredentials creates an invalid credentials error
// Optional field parameters: field, argumentName
func InvalidCredentials(message string, field ...string) error {
	extensions := map[string]interface{}{
		"code": ErrInvalidCredentials,
	}
	addFieldInfo(extensions, field...)
	return &gqlerror.Error{
		Message:    message,
		Extensions: extensions,
	}
}

// Forbidden creates a forbidden error
// Optional field parameters: field, argumentName
func Forbidden(message string, field ...string) error {
	extensions := map[string]interface{}{
		"code": ErrForbidden,
	}
	addFieldInfo(extensions, field...)
	return &gqlerror.Error{
		Message:    message,
		Extensions: extensions,
	}
}

// NotFound creates a not found error
// Optional field parameters: field, argumentName
func NotFound(message string, field ...string) error {
	extensions := map[string]interface{}{
		"code": ErrNotFound,
	}
	addFieldInfo(extensions, field...)
	return &gqlerror.Error{
		Message:    message,
		Extensions: extensions,
	}
}

// Conflict creates a conflict error
// Optional field parameters: field, argumentName
func Conflict(message string, field ...string) error {
	extensions := map[string]interface{}{
		"code": ErrAlreadyExists,
	}
	addFieldInfo(extensions, field...)
	return &gqlerror.Error{
		Message:    message,
		Extensions: extensions,
	}
}

// ErrorResponse represents the JSON error response structure
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Code    string                 `json:"code"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// WriteHTTPErrorResponse handles any error and writes appropriate HTTP response
// Supports both smart error detection and explicit details
func WriteHTTPErrorResponse(w http.ResponseWriter, err error, details ...map[string]interface{}) {
	var statusCode int
	var code string
	var message string
	var errorDetails map[string]interface{}

	// Extract details if provided
	if len(details) > 0 {
		errorDetails = details[0]
	}

	var gqlErr *gqlerror.Error
	if errors.As(err, &gqlErr) {
		// Handle GraphQL errors (from datastores/resolvers)
		message = gqlErr.Message

		// Try to get ErrorInfo directly from extensions
		if gqlErr.Extensions != nil {
			if errInfo, ok := gqlErr.Extensions["code"].(ErrorInfo); ok {
				// Direct ErrorInfo access - this is the new enhanced approach!
				code = errInfo.Code()
				statusCode = errInfo.Status()
			} else if codeStr, ok := gqlErr.Extensions["code"].(string); ok {
				// Fallback for string codes (for any remaining legacy usage)
				code = codeStr
				statusCode = http.StatusInternalServerError // Default status
			} else {
				// No code found, use default
				code = ErrInternalServer.Code()
				statusCode = ErrInternalServer.Status()
			}
		} else {
			// No extensions, use default
			code = ErrInternalServer.Code()
			statusCode = ErrInternalServer.Status()
		}

		// Merge GraphQL extensions with provided details
		if errorDetails == nil {
			errorDetails = make(map[string]interface{})
		}

		// Add GraphQL extensions to details (excluding 'code' since it's already in the response)
		if gqlErr.Extensions != nil {
			for k, v := range gqlErr.Extensions {
				if k != "code" { // Don't duplicate the code in details
					errorDetails[k] = v
				}
			}
		}

		// Remove details if empty
		if len(errorDetails) == 0 {
			errorDetails = nil
		}
	} else {
		// Handle any other error types (raw errors, etc.)
		statusCode = ErrInternalServer.Status()
		code = ErrInternalServer.Code()
		message = err.Error()
	}

	// Write the response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := ErrorResponse{
		Error:   message,
		Code:    code,
		Details: errorDetails,
	}

	json.NewEncoder(w).Encode(response)
}
