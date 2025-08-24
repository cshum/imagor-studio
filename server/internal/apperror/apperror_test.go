package apperror

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWriteErrorResponse(t *testing.T) {
	w := httptest.NewRecorder()
	details := map[string]interface{}{
		"field": "email",
		"error": "invalid format",
	}

	WriteErrorResponse(w, http.StatusBadRequest, ErrInvalidInput, "Invalid email format", details)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var response ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, ErrInvalidInput, response.Error.Code)
	assert.Equal(t, "Invalid email format", response.Error.Message)
	assert.Equal(t, "email", response.Error.Details["field"])
	assert.Equal(t, "invalid format", response.Error.Details["error"])
	assert.NotZero(t, response.Timestamp)
}

func TestWriteValidationErrorResponse(t *testing.T) {
	w := httptest.NewRecorder()
	validationErrors := []ValidationError{
		{
			Field:   "email",
			Message: "Invalid email format",
			Code:    "EMAIL_INVALID",
		},
		{
			Field:   "password",
			Message: "Password must be at least 8 characters",
			Code:    "PASSWORD_TOO_SHORT",
		},
	}

	WriteValidationErrorResponse(w, validationErrors)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var response ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, ErrValidationFailed, response.Error.Code)
	assert.Equal(t, "Validation failed", response.Error.Message)
	assert.Len(t, response.Error.ValidationErrors, 2)

	assert.Equal(t, "email", response.Error.ValidationErrors[0].Field)
	assert.Equal(t, "Invalid email format", response.Error.ValidationErrors[0].Message)
	assert.Equal(t, "EMAIL_INVALID", response.Error.ValidationErrors[0].Code)

	assert.Equal(t, "password", response.Error.ValidationErrors[1].Field)
	assert.Equal(t, "Password must be at least 8 characters", response.Error.ValidationErrors[1].Message)
	assert.Equal(t, "PASSWORD_TOO_SHORT", response.Error.ValidationErrors[1].Code)
}

func TestNewAppError(t *testing.T) {
	details := map[string]interface{}{
		"resource": "user",
		"id":       "123",
	}

	err := NewAppError(http.StatusNotFound, ErrNotFound, "User not found", details)

	assert.Equal(t, http.StatusNotFound, err.StatusCode)
	assert.Equal(t, ErrNotFound, err.Code)
	assert.Equal(t, "User not found", err.Message)
	assert.Equal(t, "user", err.Details["resource"])
	assert.Equal(t, "123", err.Details["id"])
}

func TestAppError_Error(t *testing.T) {
	err := NewAppError(http.StatusNotFound, ErrNotFound, "User not found", nil)
	assert.Equal(t, "User not found", err.Error())
}

func TestUnauthorizedError(t *testing.T) {
	err := UnauthorizedError("Invalid credentials")

	assert.Equal(t, http.StatusUnauthorized, err.StatusCode)
	assert.Equal(t, ErrUnauthorized, err.Code)
	assert.Equal(t, "Invalid credentials", err.Message)
	assert.Nil(t, err.Details)
}

func TestInvalidTokenError(t *testing.T) {
	err := InvalidTokenError("Token is malformed")

	assert.Equal(t, http.StatusUnauthorized, err.StatusCode)
	assert.Equal(t, ErrInvalidToken, err.Code)
	assert.Equal(t, "Token is malformed", err.Message)
	assert.Nil(t, err.Details)
}

func TestTokenExpiredError(t *testing.T) {
	err := TokenExpiredError()

	assert.Equal(t, http.StatusUnauthorized, err.StatusCode)
	assert.Equal(t, ErrTokenExpired, err.Code)
	assert.Equal(t, "Token has expired", err.Message)
	assert.Nil(t, err.Details)
}

func TestNotFoundError(t *testing.T) {
	err := NotFoundError("User")

	assert.Equal(t, http.StatusNotFound, err.StatusCode)
	assert.Equal(t, ErrNotFound, err.Code)
	assert.Equal(t, "User not found", err.Message)
	assert.Nil(t, err.Details)
}

func TestInternalServerError(t *testing.T) {
	err := InternalServerError("Database connection failed")

	assert.Equal(t, http.StatusInternalServerError, err.StatusCode)
	assert.Equal(t, ErrInternalServer, err.Code)
	assert.Equal(t, "Database connection failed", err.Message)
	assert.Nil(t, err.Details)
}

func TestStorageError(t *testing.T) {
	err := StorageError("Failed to save file")

	assert.Equal(t, http.StatusInternalServerError, err.StatusCode)
	assert.Equal(t, ErrStorageFailure, err.Code)
	assert.Equal(t, "Failed to save file", err.Message)
	assert.Nil(t, err.Details)
}

func TestPermissionDeniedError(t *testing.T) {
	err := PermissionDeniedError("Insufficient permissions to access resource")

	assert.Equal(t, http.StatusForbidden, err.StatusCode)
	assert.Equal(t, ErrPermissionDenied, err.Code)
	assert.Equal(t, "Insufficient permissions to access resource", err.Message)
	assert.Nil(t, err.Details)
}

func TestErrorResponseJSON(t *testing.T) {
	response := ErrorResponse{
		Error: &APIError{
			Code:    ErrInvalidInput,
			Message: "Invalid input",
			Details: map[string]interface{}{
				"field": "email",
			},
			ValidationErrors: []ValidationError{
				{
					Field:   "email",
					Message: "Invalid format",
					Code:    "INVALID_FORMAT",
				},
			},
		},
		TraceID:   "trace-123",
		Timestamp: time.Now().UnixMilli(),
	}

	// Marshal to JSON
	jsonData, err := json.Marshal(response)
	require.NoError(t, err)

	// Unmarshal back
	var unmarshaled ErrorResponse
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, response.Error.Code, unmarshaled.Error.Code)
	assert.Equal(t, response.Error.Message, unmarshaled.Error.Message)
	assert.Equal(t, response.Error.Details["field"], unmarshaled.Error.Details["field"])
	assert.Len(t, unmarshaled.Error.ValidationErrors, 1)
	assert.Equal(t, response.Error.ValidationErrors[0].Field, unmarshaled.Error.ValidationErrors[0].Field)
	assert.Equal(t, response.TraceID, unmarshaled.TraceID)
	assert.Equal(t, response.Timestamp, unmarshaled.Timestamp)
}
