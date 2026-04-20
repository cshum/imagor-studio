package apperror

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/vektah/gqlparser/v2/gqlerror"
)

func TestWriteHTTPErrorResponse_GraphQLError(t *testing.T) {
	w := httptest.NewRecorder()

	// Create a GraphQL error with field information
	err := Conflict("Username already exists", "username", "input.username")

	WriteHTTPErrorResponse(w, err)

	if w.Code != http.StatusConflict {
		t.Errorf("Expected status %d, got %d", http.StatusConflict, w.Code)
	}

	var response ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Code != "ALREADY_EXISTS" {
		t.Errorf("Expected code 'ALREADY_EXISTS', got '%s'", response.Code)
	}

	if response.Error != "Username already exists" {
		t.Errorf("Expected message 'Username already exists', got '%s'", response.Error)
	}

	if response.Details == nil {
		t.Error("Expected details to be present")
	} else {
		if field, ok := response.Details["field"].(string); !ok || field != "username" {
			t.Errorf("Expected field 'username', got %v", response.Details["field"])
		}
		if argName, ok := response.Details["argumentName"].(string); !ok || argName != "input.username" {
			t.Errorf("Expected argumentName 'input.username', got %v", response.Details["argumentName"])
		}
	}
}

func TestWriteHTTPErrorResponse_BadRequest(t *testing.T) {
	w := httptest.NewRecorder()

	err := BadRequest("Invalid input", map[string]interface{}{
		"validation": "failed",
	})

	WriteHTTPErrorResponse(w, err)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Code != "INVALID_INPUT" {
		t.Errorf("Expected code 'INVALID_INPUT', got '%s'", response.Code)
	}

	if response.Error != "Invalid input" {
		t.Errorf("Expected message 'Invalid input', got '%s'", response.Error)
	}

	if validation, ok := response.Details["validation"].(string); !ok || validation != "failed" {
		t.Errorf("Expected validation 'failed', got %v", response.Details["validation"])
	}
}

func TestWriteHTTPErrorResponse_InternalServerError(t *testing.T) {
	w := httptest.NewRecorder()

	err := InternalServerError("Something went wrong")

	WriteHTTPErrorResponse(w, err)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	var response ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Code != "INTERNAL_SERVER_ERROR" {
		t.Errorf("Expected code 'INTERNAL_SERVER_ERROR', got '%s'", response.Code)
	}

	if response.Error != "Something went wrong" {
		t.Errorf("Expected message 'Something went wrong', got '%s'", response.Error)
	}
}

func TestWriteHTTPErrorResponse_Unauthorized(t *testing.T) {
	w := httptest.NewRecorder()

	err := Unauthorized("Access denied")

	WriteHTTPErrorResponse(w, err)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}

	var response ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Code != "UNAUTHORIZED" {
		t.Errorf("Expected code 'UNAUTHORIZED', got '%s'", response.Code)
	}

	if response.Error != "Access denied" {
		t.Errorf("Expected message 'Access denied', got '%s'", response.Error)
	}
}

func TestWriteHTTPErrorResponse_InvalidCredentials(t *testing.T) {
	w := httptest.NewRecorder()

	err := InvalidCredentials("Invalid username or password")

	WriteHTTPErrorResponse(w, err)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}

	var response ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Code != "INVALID_CREDENTIALS" {
		t.Errorf("Expected code 'INVALID_CREDENTIALS', got '%s'", response.Code)
	}

	if response.Error != "Invalid username or password" {
		t.Errorf("Expected message 'Invalid username or password', got '%s'", response.Error)
	}
}

func TestWriteHTTPErrorResponse_NotFound(t *testing.T) {
	w := httptest.NewRecorder()

	err := NotFound("Resource not found")

	WriteHTTPErrorResponse(w, err)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}

	var response ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Code != "NOT_FOUND" {
		t.Errorf("Expected code 'NOT_FOUND', got '%s'", response.Code)
	}

	if response.Error != "Resource not found" {
		t.Errorf("Expected message 'Resource not found', got '%s'", response.Error)
	}
}

func TestWriteHTTPErrorResponse_Forbidden(t *testing.T) {
	w := httptest.NewRecorder()

	err := Forbidden("Access forbidden")

	WriteHTTPErrorResponse(w, err)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status %d, got %d", http.StatusForbidden, w.Code)
	}

	var response ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Code != "FORBIDDEN" {
		t.Errorf("Expected code 'FORBIDDEN', got '%s'", response.Code)
	}

	if response.Error != "Access forbidden" {
		t.Errorf("Expected message 'Access forbidden', got '%s'", response.Error)
	}
}

func TestWriteHTTPErrorResponse_GenericError(t *testing.T) {
	w := httptest.NewRecorder()

	// Test with a generic error (not a gqlerror.Error)
	err := &gqlerror.Error{
		Message: "Generic error",
	}

	WriteHTTPErrorResponse(w, err)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	var response ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if response.Code != "INTERNAL_SERVER_ERROR" {
		t.Errorf("Expected code 'INTERNAL_SERVER_ERROR', got '%s'", response.Code)
	}

	if response.Error != "Generic error" {
		t.Errorf("Expected message 'Generic error', got '%s'", response.Error)
	}
}

func TestErrorInfo_Methods(t *testing.T) {
	errInfo := ErrInvalidInput

	if errInfo.Code() != "INVALID_INPUT" {
		t.Errorf("Expected code 'INVALID_INPUT', got '%s'", errInfo.Code())
	}

	if errInfo.Status() != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, errInfo.Status())
	}

	if errInfo.String() != "INVALID_INPUT" {
		t.Errorf("Expected string 'INVALID_INPUT', got '%s'", errInfo.String())
	}

	// Test JSON marshaling
	jsonBytes, err := json.Marshal(errInfo)
	if err != nil {
		t.Fatalf("Failed to marshal ErrorInfo: %v", err)
	}

	var result string
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		t.Fatalf("Failed to unmarshal ErrorInfo: %v", err)
	}

	if result != "INVALID_INPUT" {
		t.Errorf("Expected JSON result 'INVALID_INPUT', got '%s'", result)
	}
}
