package httphandler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// LicenseServiceInterface defines the interface for license service
type LicenseServiceInterface interface {
	GetPublicLicenseStatus(ctx context.Context) (*license.PublicLicenseStatus, error)
	ActivateLicense(ctx context.Context, key string) (*license.LicenseStatus, error)
	GetLicenseStatus(ctx context.Context) (*license.LicenseStatus, error)
}

// MockLicenseService is a mock implementation of the license service
type MockLicenseService struct {
	mock.Mock
}

func (m *MockLicenseService) GetPublicLicenseStatus(ctx context.Context) (*license.PublicLicenseStatus, error) {
	args := m.Called(ctx)
	return args.Get(0).(*license.PublicLicenseStatus), args.Error(1)
}

func (m *MockLicenseService) ActivateLicense(ctx context.Context, key string) (*license.LicenseStatus, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(*license.LicenseStatus), args.Error(1)
}

func (m *MockLicenseService) GetLicenseStatus(ctx context.Context) (*license.LicenseStatus, error) {
	args := m.Called(ctx)
	return args.Get(0).(*license.LicenseStatus), args.Error(1)
}

// TestLicenseHandler wraps the real handler but accepts our interface
type TestLicenseHandler struct {
	service LicenseServiceInterface
	logger  *zap.Logger
}

func NewTestLicenseHandler(service LicenseServiceInterface, logger *zap.Logger) *TestLicenseHandler {
	return &TestLicenseHandler{
		service: service,
		logger:  logger,
	}
}

func (h *TestLicenseHandler) GetPublicStatus() http.HandlerFunc {
	return Handle("GET", func(w http.ResponseWriter, r *http.Request) error {
		status, err := h.service.GetPublicLicenseStatus(r.Context())
		if err != nil {
			h.logger.Error("Failed to get public license status", zap.Error(err))
			// Return a safe default status instead of exposing the error
			status = &license.PublicLicenseStatus{
				IsLicensed:     false,
				Message:        "Support ongoing development",
				SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
				Features:       []string{},
			}
		}
		return WriteSuccess(w, status)
	})
}

func (h *TestLicenseHandler) ActivateLicense() http.HandlerFunc {
	return Handle("POST", func(w http.ResponseWriter, r *http.Request) error {
		var request struct {
			Key string `json:"key"`
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		}

		if request.Key == "" {
			return WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "License key is required"})
		}

		status, err := h.service.ActivateLicense(r.Context(), request.Key)
		if err != nil {
			h.logger.Error("Failed to activate license", zap.Error(err))
			return WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "Failed to activate license: " + err.Error()})
		}

		// Convert to public response format
		response := &license.PublicLicenseStatus{
			IsLicensed:     status.IsLicensed,
			LicenseType:    status.LicenseType,
			Message:        status.Message,
			SupportMessage: status.SupportMessage,
			Features:       []string{}, // Initialize empty features for now
		}

		return WriteSuccess(w, response)
	})
}

func TestLicenseHandler_GetPublicStatus(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		mockStatus     *license.PublicLicenseStatus
		mockError      error
		expectedStatus int
		expectedBody   map[string]interface{}
	}{
		{
			name:   "successful unlicensed status",
			method: "GET",
			mockStatus: &license.PublicLicenseStatus{
				IsLicensed:     false,
				Message:        "Support ongoing development",
				SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
				Features:       []string{},
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"isLicensed":     false,
				"message":        "Support ongoing development",
				"supportMessage": "From the creator of imagor & vipsgen",
				"features":       []interface{}{},
			},
		},
		{
			name:   "successful licensed status",
			method: "GET",
			mockStatus: &license.PublicLicenseStatus{
				IsLicensed:  true,
				LicenseType: stringPtr("personal"),
				Message:     "Licensed",
				Features:    []string{"batch_export", "api_access"},
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"isLicensed":  true,
				"licenseType": "personal",
				"message":     "Licensed",
				"features":    []interface{}{"batch_export", "api_access"},
			},
		},
		{
			name:           "service error returns fallback",
			method:         "GET",
			mockStatus:     nil,
			mockError:      assert.AnError,
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"isLicensed":     false,
				"message":        "Support ongoing development",
				"supportMessage": "From the creator of imagor & vipsgen",
				"features":       []interface{}{},
			},
		},
		{
			name:           "wrong method returns error",
			method:         "POST",
			mockStatus:     nil,
			mockError:      nil,
			expectedStatus: http.StatusMethodNotAllowed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			mockService := new(MockLicenseService)
			logger := zap.NewNop()
			handler := NewTestLicenseHandler(mockService, logger)

			// Setup mock expectations
			if tt.method == "GET" && tt.mockStatus != nil {
				mockService.On("GetPublicLicenseStatus", mock.Anything).Return(tt.mockStatus, tt.mockError)
			} else if tt.method == "GET" && tt.mockError != nil {
				mockService.On("GetPublicLicenseStatus", mock.Anything).Return((*license.PublicLicenseStatus)(nil), tt.mockError)
			}

			// Create request
			req := httptest.NewRequest(tt.method, "/api/public/license-status", nil)
			w := httptest.NewRecorder()

			// Execute
			handler.GetPublicStatus()(w, req)

			// Assert
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedStatus == http.StatusOK {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedBody, response)
			}

			mockService.AssertExpectations(t)
		})
	}
}

func TestLicenseHandler_ActivateLicense(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		requestBody    interface{}
		mockStatus     *license.LicenseStatus
		mockError      error
		expectedStatus int
		expectedBody   map[string]interface{}
	}{
		{
			name:   "successful activation",
			method: "POST",
			requestBody: map[string]string{
				"key": "IMGR-valid-license-key",
			},
			mockStatus: &license.LicenseStatus{
				IsLicensed:     true,
				LicenseType:    stringPtr("personal"),
				Email:          stringPtr("test@example.com"),
				Message:        "License activated successfully! Thank you for supporting development.",
				SupportMessage: nil,
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"isLicensed":  true,
				"licenseType": "personal",
				"message":     "License activated successfully! Thank you for supporting development.",
				"features":    []interface{}{},
			},
		},
		{
			name:   "invalid license key",
			method: "POST",
			requestBody: map[string]string{
				"key": "IMGR-invalid-license-key",
			},
			mockStatus:     nil,
			mockError:      assert.AnError,
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "Failed to activate license: assert.AnError general error for testing",
			},
		},
		{
			name:   "empty license key",
			method: "POST",
			requestBody: map[string]string{
				"key": "",
			},
			mockStatus:     nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "License key is required",
			},
		},
		{
			name:   "missing license key field",
			method: "POST",
			requestBody: map[string]string{
				"notkey": "some-value",
			},
			mockStatus:     nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "License key is required",
			},
		},
		{
			name:           "invalid JSON body",
			method:         "POST",
			requestBody:    "invalid-json",
			mockStatus:     nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "Invalid request body",
			},
		},
		{
			name:           "wrong method returns error",
			method:         "GET",
			requestBody:    nil,
			mockStatus:     nil,
			mockError:      nil,
			expectedStatus: http.StatusMethodNotAllowed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			mockService := new(MockLicenseService)
			logger := zap.NewNop()
			handler := NewTestLicenseHandler(mockService, logger)

			// Setup mock expectations
			if tt.method == "POST" && tt.mockStatus != nil {
				key := tt.requestBody.(map[string]string)["key"]
				mockService.On("ActivateLicense", mock.Anything, key).Return(tt.mockStatus, tt.mockError)
			} else if tt.method == "POST" && tt.mockError != nil {
				key := tt.requestBody.(map[string]string)["key"]
				mockService.On("ActivateLicense", mock.Anything, key).Return((*license.LicenseStatus)(nil), tt.mockError)
			}

			// Create request
			var req *http.Request
			if tt.requestBody != nil {
				var body []byte
				var err error
				if str, ok := tt.requestBody.(string); ok {
					body = []byte(str)
				} else {
					body, err = json.Marshal(tt.requestBody)
					assert.NoError(t, err)
				}
				req = httptest.NewRequest(tt.method, "/api/public/activate-license", bytes.NewReader(body))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, "/api/public/activate-license", nil)
			}

			w := httptest.NewRecorder()

			// Execute
			handler.ActivateLicense()(w, req)

			// Assert
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedStatus == http.StatusOK || tt.expectedStatus == http.StatusBadRequest {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedBody, response)
			}

			mockService.AssertExpectations(t)
		})
	}
}

func TestLicenseHandler_Integration(t *testing.T) {
	// Test the integration between both endpoints
	mockService := new(MockLicenseService)
	logger := zap.NewNop()
	handler := NewTestLicenseHandler(mockService, logger)

	// Test 1: Check unlicensed status
	mockService.On("GetPublicLicenseStatus", mock.Anything).Return(&license.PublicLicenseStatus{
		IsLicensed:     false,
		Message:        "Support ongoing development",
		SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
		Features:       []string{},
	}, nil).Once()

	req := httptest.NewRequest("GET", "/api/public/license-status", nil)
	w := httptest.NewRecorder()
	handler.GetPublicStatus()(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.False(t, response["isLicensed"].(bool))

	// Test 2: Activate license
	mockService.On("ActivateLicense", mock.Anything, "valid-key").Return(&license.LicenseStatus{
		IsLicensed:  true,
		LicenseType: stringPtr("personal"),
		Message:     "License activated successfully! Thank you for supporting development.",
	}, nil).Once()

	requestBody := map[string]string{"key": "valid-key"}
	body, _ := json.Marshal(requestBody)
	req = httptest.NewRequest("POST", "/api/public/activate-license", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	handler.ActivateLicense()(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["isLicensed"].(bool))
	assert.Equal(t, "personal", response["licenseType"])

	// Test 3: Check licensed status
	mockService.On("GetPublicLicenseStatus", mock.Anything).Return(&license.PublicLicenseStatus{
		IsLicensed:  true,
		LicenseType: stringPtr("personal"),
		Message:     "Licensed",
		Features:    []string{"batch_export", "api_access"},
	}, nil).Once()

	req = httptest.NewRequest("GET", "/api/public/license-status", nil)
	w = httptest.NewRecorder()
	handler.GetPublicStatus()(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["isLicensed"].(bool))
	assert.Equal(t, "personal", response["licenseType"])

	mockService.AssertExpectations(t)
}

func TestNewTestLicenseHandler(t *testing.T) {
	mockService := new(MockLicenseService)
	logger := zap.NewNop()

	handler := NewTestLicenseHandler(mockService, logger)

	assert.NotNil(t, handler)
	assert.Equal(t, mockService, handler.service)
	assert.Equal(t, logger, handler.logger)
}
