package httphandler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockLicenseService is a mock implementation of LicenseServicer
type MockLicenseService struct {
	mock.Mock
}

func (m *MockLicenseService) GetLicenseStatus(ctx context.Context, includeDetails bool) (*license.LicenseStatus, error) {
	args := m.Called(ctx, includeDetails)
	return args.Get(0).(*license.LicenseStatus), args.Error(1)
}

func (m *MockLicenseService) ActivateLicense(ctx context.Context, key string) (*license.LicenseStatus, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(*license.LicenseStatus), args.Error(1)
}

func TestLicenseHandler_GetPublicStatus(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		mockStatus     *license.LicenseStatus
		mockError      error
		expectedStatus int
		checkBody      func(t *testing.T, body map[string]interface{})
	}{
		{
			name:   "successful unlicensed status",
			method: "GET",
			mockStatus: &license.LicenseStatus{
				IsLicensed:     false,
				Message:        "Support ongoing development",
				SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, false, body["isLicensed"])
				assert.Equal(t, "Support ongoing development", body["message"])
				assert.Equal(t, "From the creator of imagor & vipsgen", body["supportMessage"])
				assert.Nil(t, body["appTitle"])
				assert.Nil(t, body["appUrl"])
			},
		},
		{
			name:   "successful licensed status",
			method: "GET",
			mockStatus: &license.LicenseStatus{
				IsLicensed:  true,
				LicenseType: "personal",
				Message:     "Licensed",
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, true, body["isLicensed"])
				assert.Equal(t, "personal", body["licenseType"])
				assert.Equal(t, "Licensed", body["message"])
			},
		},
		{
			name:           "service error returns fallback",
			method:         "GET",
			mockStatus:     nil,
			mockError:      assert.AnError,
			expectedStatus: http.StatusOK,
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, false, body["isLicensed"])
				assert.Equal(t, "Support ongoing development", body["message"])
				assert.Equal(t, "From the creator of imagor & vipsgen", body["supportMessage"])
			},
		},
		{
			name:           "wrong method returns error",
			method:         http.MethodPost,
			expectedStatus: http.StatusMethodNotAllowed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLicenseService)
			logger := zap.NewNop()
			handler := NewLicenseHandler(mockService, nil, logger)

			if tt.method == "GET" && tt.mockStatus != nil {
				mockService.On("GetLicenseStatus", mock.Anything, false).Return(tt.mockStatus, tt.mockError)
			} else if tt.method == "GET" && tt.mockError != nil {
				mockService.On("GetLicenseStatus", mock.Anything, false).Return((*license.LicenseStatus)(nil), tt.mockError)
			}

			req := httptest.NewRequest(tt.method, "/api/public/license-status", nil)
			w := httptest.NewRecorder()
			handler.GetPublicStatus()(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.expectedStatus == http.StatusOK && tt.checkBody != nil {
				var body map[string]interface{}
				assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
				tt.checkBody(t, body)
			}
			mockService.AssertExpectations(t)
		})
	}
}

func TestLicenseHandler_GetPublicStatus_Brand(t *testing.T) {
	tests := []struct {
		name          string
		mockStatus    *license.LicenseStatus
		registrySetup func(m *MockRegistryStore)
		checkBody     func(t *testing.T, body map[string]interface{})
	}{
		{
			name: "licensed with brand values returns appTitle and appUrl",
			mockStatus: &license.LicenseStatus{
				IsLicensed:  true,
				LicenseType: "personal",
				Message:     "Licensed",
			},
			registrySetup: func(m *MockRegistryStore) {
				m.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
					[]string{"config.app_title", "config.app_url"}).
					Return([]*registrystore.Registry{
						{Key: "config.app_title", Value: "My Studio"},
						{Key: "config.app_url", Value: "https://example.com"},
					}, nil)
			},
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, true, body["isLicensed"])
				assert.Equal(t, "My Studio", body["appTitle"])
				assert.Equal(t, "https://example.com", body["appUrl"])
			},
		},
		{
			name: "licensed with empty brand values omits appTitle and appUrl",
			mockStatus: &license.LicenseStatus{
				IsLicensed:  true,
				LicenseType: "personal",
				Message:     "Licensed",
			},
			registrySetup: func(m *MockRegistryStore) {
				m.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
					[]string{"config.app_title", "config.app_url"}).
					Return([]*registrystore.Registry{
						{Key: "config.app_title", Value: "   "},
						{Key: "config.app_url", Value: ""},
					}, nil)
			},
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, true, body["isLicensed"])
				assert.Nil(t, body["appTitle"])
				assert.Nil(t, body["appUrl"])
			},
		},
		{
			name: "licensed with registry error omits brand fields",
			mockStatus: &license.LicenseStatus{
				IsLicensed:  true,
				LicenseType: "personal",
				Message:     "Licensed",
			},
			registrySetup: func(m *MockRegistryStore) {
				m.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
					[]string{"config.app_title", "config.app_url"}).
					Return([]*registrystore.Registry{}, assert.AnError)
			},
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, true, body["isLicensed"])
				assert.Nil(t, body["appTitle"])
				assert.Nil(t, body["appUrl"])
			},
		},
		{
			name: "unlicensed does not call registry",
			mockStatus: &license.LicenseStatus{
				IsLicensed: false,
				Message:    "Support ongoing development",
			},
			registrySetup: func(m *MockRegistryStore) {
				// no expectations — GetMulti must NOT be called
			},
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, false, body["isLicensed"])
				assert.Nil(t, body["appTitle"])
				assert.Nil(t, body["appUrl"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLicenseService)
			mockRegistry := new(MockRegistryStore)
			logger := zap.NewNop()
			handler := NewLicenseHandler(mockService, mockRegistry, logger)

			mockService.On("GetLicenseStatus", mock.Anything, false).Return(tt.mockStatus, nil)
			tt.registrySetup(mockRegistry)

			req := httptest.NewRequest(http.MethodGet, "/api/public/license-status", nil)
			w := httptest.NewRecorder()
			handler.GetPublicStatus()(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			var body map[string]interface{}
			assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			tt.checkBody(t, body)

			mockService.AssertExpectations(t)
			mockRegistry.AssertExpectations(t)
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
		checkBody      func(t *testing.T, body map[string]interface{})
	}{
		{
			name:   "successful activation",
			method: "POST",
			requestBody: map[string]string{
				"key": "IMGR-valid-license-key",
			},
			mockStatus: &license.LicenseStatus{
				IsLicensed:  true,
				LicenseType: "personal",
				Email:       "test@example.com",
				Message:     "License activated successfully",
			},
			mockError:      nil,
			expectedStatus: http.StatusOK,
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, true, body["isLicensed"])
				assert.Equal(t, "personal", body["licenseType"])
				assert.Equal(t, "test@example.com", body["email"])
				assert.Equal(t, "License activated successfully", body["message"])
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
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, "Failed to activate license: assert.AnError general error for testing", body["error"])
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
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, "License key is required", body["error"])
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
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, "License key is required", body["error"])
			},
		},
		{
			name:           "invalid JSON body",
			method:         "POST",
			requestBody:    "invalid-json",
			mockStatus:     nil,
			mockError:      nil,
			expectedStatus: http.StatusBadRequest,
			checkBody: func(t *testing.T, body map[string]interface{}) {
				assert.Equal(t, "Invalid request body", body["error"])
			},
		},
		{
			name:           "wrong method returns error",
			method:         http.MethodGet,
			requestBody:    nil,
			expectedStatus: http.StatusMethodNotAllowed,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockService := new(MockLicenseService)
			logger := zap.NewNop()
			handler := NewLicenseHandler(mockService, nil, logger)

			if tt.method == "POST" && tt.mockStatus != nil {
				key := tt.requestBody.(map[string]string)["key"]
				mockService.On("ActivateLicense", mock.Anything, key).Return(tt.mockStatus, tt.mockError)
			} else if tt.method == "POST" && tt.mockError != nil {
				key := tt.requestBody.(map[string]string)["key"]
				mockService.On("ActivateLicense", mock.Anything, key).Return((*license.LicenseStatus)(nil), tt.mockError)
			}

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
			handler.ActivateLicense()(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.checkBody != nil {
				var body map[string]interface{}
				assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
				tt.checkBody(t, body)
			}
			mockService.AssertExpectations(t)
		})
	}
}

func TestLicenseHandler_Integration(t *testing.T) {
	mockService := new(MockLicenseService)
	mockRegistry := new(MockRegistryStore)
	logger := zap.NewNop()
	handler := NewLicenseHandler(mockService, mockRegistry, logger)

	// Test 1: Check unlicensed status — registry must NOT be called
	mockService.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{
		IsLicensed:     false,
		Message:        "Support ongoing development",
		SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
	}, nil).Once()

	req := httptest.NewRequest("GET", "/api/public/license-status", nil)
	w := httptest.NewRecorder()
	handler.GetPublicStatus()(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	assert.False(t, response["isLicensed"].(bool))
	assert.Nil(t, response["appTitle"])

	// Test 2: Activate license
	mockService.On("ActivateLicense", mock.Anything, "valid-key").Return(&license.LicenseStatus{
		IsLicensed:  true,
		LicenseType: "personal",
		Message:     "License activated successfully",
	}, nil).Once()

	reqBody, _ := json.Marshal(map[string]string{"key": "valid-key"})
	req = httptest.NewRequest("POST", "/api/public/activate-license", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	handler.ActivateLicense()(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	assert.True(t, response["isLicensed"].(bool))
	assert.Equal(t, "personal", response["licenseType"])

	// Test 3: Check licensed status with brand values
	mockService.On("GetLicenseStatus", mock.Anything, false).Return(&license.LicenseStatus{
		IsLicensed:  true,
		LicenseType: "personal",
		Message:     "Licensed",
	}, nil).Once()
	mockRegistry.On("GetMulti", mock.Anything, registrystore.SystemOwnerID,
		[]string{"config.app_title", "config.app_url"}).
		Return([]*registrystore.Registry{
			{Key: "config.app_title", Value: "Acme Studio"},
			{Key: "config.app_url", Value: "https://acme.example.com"},
		}, nil).Once()

	req = httptest.NewRequest("GET", "/api/public/license-status", nil)
	w = httptest.NewRecorder()
	handler.GetPublicStatus()(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	assert.True(t, response["isLicensed"].(bool))
	assert.Equal(t, "Acme Studio", response["appTitle"])
	assert.Equal(t, "https://acme.example.com", response["appUrl"])

	mockService.AssertExpectations(t)
	mockRegistry.AssertExpectations(t)
}

func TestNewLicenseHandler(t *testing.T) {
	mockService := new(MockLicenseService)
	mockRegistry := new(MockRegistryStore)
	logger := zap.NewNop()

	handler := NewLicenseHandler(mockService, mockRegistry, logger)

	assert.NotNil(t, handler)
}
