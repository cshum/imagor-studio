package apperror

import (
	"encoding/json"
	"net/http"
	"time"
)

// ErrorCode represents standard error codes for the API
type ErrorCode string

const (
	ErrUnauthorized       ErrorCode = "UNAUTHORIZED"
	ErrInvalidToken       ErrorCode = "INVALID_TOKEN"
	ErrTokenExpired       ErrorCode = "TOKEN_EXPIRED"
	ErrInvalidCredentials ErrorCode = "INVALID_CREDENTIALS"

	ErrValidationFailed ErrorCode = "VALIDATION_FAILED"
	ErrInvalidInput     ErrorCode = "INVALID_INPUT"

	ErrNotFound      ErrorCode = "NOT_FOUND"
	ErrAlreadyExists ErrorCode = "ALREADY_EXISTS"
	ErrConflict      ErrorCode = "CONFLICT"

	ErrInternalServer     ErrorCode = "INTERNAL_SERVER_ERROR"
	ErrServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"
	ErrTimeout            ErrorCode = "TIMEOUT"

	ErrStorageFailure       ErrorCode = "STORAGE_FAILURE"
	ErrStorageNotFound      ErrorCode = "STORAGE_NOT_FOUND"
	ErrStorageInvalidConfig ErrorCode = "STORAGE_INVALID_CONFIG"

	ErrPermissionDenied ErrorCode = "PERMISSION_DENIED"
	ErrForbidden        ErrorCode = "FORBIDDEN"
)

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error     *APIError `json:"error"`
	TraceID   string    `json:"traceId,omitempty"`
	Timestamp int64     `json:"timestamp"`
}

// APIError represents the error details
type APIError struct {
	Code             ErrorCode              `json:"code"`
	Message          string                 `json:"message"`
	Details          map[string]interface{} `json:"details,omitempty"`
	ValidationErrors []ValidationError      `json:"validationErrors,omitempty"`
}

// ValidationError represents a field validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

// WriteErrorResponse writes a standardized error response
func WriteErrorResponse(w http.ResponseWriter, statusCode int, code ErrorCode, message string, details map[string]interface{}) {
	response := ErrorResponse{
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
		Timestamp: time.Now().UnixMilli(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

// WriteValidationErrorResponse writes a validation error response
func WriteValidationErrorResponse(w http.ResponseWriter, errors []ValidationError) {
	response := ErrorResponse{
		Error: &APIError{
			Code:             ErrValidationFailed,
			Message:          "Validation failed",
			ValidationErrors: errors,
		},
		Timestamp: time.Now().UnixMilli(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(response)
}

type AppError struct {
	StatusCode int
	Code       ErrorCode
	Message    string
	Details    map[string]interface{}
}

func (e *AppError) Error() string {
	return e.Message
}

// NewAppError creates a new application error
func NewAppError(statusCode int, code ErrorCode, message string, details map[string]interface{}) *AppError {
	return &AppError{
		StatusCode: statusCode,
		Code:       code,
		Message:    message,
		Details:    details,
	}
}

func UnauthorizedError(message string) *AppError {
	return NewAppError(http.StatusUnauthorized, ErrUnauthorized, message, nil)
}

func InvalidTokenError(message string) *AppError {
	return NewAppError(http.StatusUnauthorized, ErrInvalidToken, message, nil)
}

func TokenExpiredError() *AppError {
	return NewAppError(http.StatusUnauthorized, ErrTokenExpired, "Token has expired", nil)
}

func NotFoundError(resource string) *AppError {
	return NewAppError(http.StatusNotFound, ErrNotFound, resource+" not found", nil)
}

func InternalServerError(message string) *AppError {
	return NewAppError(http.StatusInternalServerError, ErrInternalServer, message, nil)
}

func StorageError(message string) *AppError {
	return NewAppError(http.StatusInternalServerError, ErrStorageFailure, message, nil)
}

func PermissionDeniedError(message string) *AppError {
	return NewAppError(http.StatusForbidden, ErrPermissionDenied, message, nil)
}
