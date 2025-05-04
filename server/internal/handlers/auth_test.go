package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestDevLogin(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	handler := NewAuthHandler(tokenManager, logger)

	tests := []struct {
		name           string
		method         string
		body           interface{}
		expectedStatus int
		expectError    bool
		errorCode      errors.ErrorCode
	}{
		{
			name:   "Valid login request",
			method: http.MethodPost,
			body: LoginRequest{
				Email:    "test@example.com",
				Password: "password",
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body []byte
			if tt.body != nil {
				switch v := tt.body.(type) {
				case string:
					body = []byte(v)
				default:
					var err error
					body, err = json.Marshal(tt.body)
					require.NoError(t, err)
				}
			}

			req := httptest.NewRequest(tt.method, "/auth/dev-login", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.DevLogin(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp errors.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Error.Code)
			} else {
				var loginResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &loginResp)
				require.NoError(t, err)
				assert.NotEmpty(t, loginResp.Token)
				assert.Greater(t, loginResp.ExpiresIn, int64(0))

				// Verify the token is valid
				claims, err := tokenManager.ValidateToken(loginResp.Token)
				require.NoError(t, err)
				assert.Equal(t, "test@example.com", claims.Email)
				assert.Equal(t, "admin", claims.Role)
				assert.Contains(t, claims.Scopes, "read")
				assert.Contains(t, claims.Scopes, "write")
				assert.Contains(t, claims.Scopes, "admin")
			}
		})
	}
}

func TestRefreshToken(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	tokenManager := auth.NewTokenManager("test-secret", time.Hour)
	handler := NewAuthHandler(tokenManager, logger)

	// Generate a valid token first
	validToken, err := tokenManager.GenerateToken("user1", "test@example.com", "user", []string{"read"})
	require.NoError(t, err)

	tests := []struct {
		name           string
		method         string
		body           interface{}
		expectedStatus int
		expectError    bool
		errorCode      errors.ErrorCode
	}{
		{
			name:   "Valid refresh request",
			method: http.MethodPost,
			body: RefreshTokenRequest{
				Token: validToken,
			},
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:           "Invalid method",
			method:         http.MethodGet,
			body:           nil,
			expectedStatus: http.StatusMethodNotAllowed,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:           "Invalid JSON body",
			method:         http.MethodPost,
			body:           "invalid json",
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
			errorCode:      errors.ErrInvalidInput,
		},
		{
			name:   "Invalid token",
			method: http.MethodPost,
			body: RefreshTokenRequest{
				Token: "invalid.token.here",
			},
			expectedStatus: http.StatusUnauthorized,
			expectError:    true,
			errorCode:      errors.ErrInvalidToken,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body []byte
			if tt.body != nil {
				switch v := tt.body.(type) {
				case string:
					body = []byte(v)
				default:
					var err error
					body, err = json.Marshal(tt.body)
					require.NoError(t, err)
				}
			}

			req := httptest.NewRequest(tt.method, "/auth/refresh", bytes.NewReader(body))
			rr := httptest.NewRecorder()

			handler.RefreshToken(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectError {
				var errResp errors.ErrorResponse
				err := json.Unmarshal(rr.Body.Bytes(), &errResp)
				require.NoError(t, err)
				assert.Equal(t, tt.errorCode, errResp.Error.Code)
			} else {
				var refreshResp LoginResponse
				err := json.Unmarshal(rr.Body.Bytes(), &refreshResp)
				require.NoError(t, err)
				assert.NotEmpty(t, refreshResp.Token)
				assert.Greater(t, refreshResp.ExpiresIn, int64(0))

				// Verify the new token is valid
				claims, err := tokenManager.ValidateToken(refreshResp.Token)
				require.NoError(t, err)
				assert.Equal(t, "user1", claims.UserID)
				assert.Equal(t, "test@example.com", claims.Email)
				assert.Equal(t, "user", claims.Role)
				assert.Contains(t, claims.Scopes, "read")
			}
		})
	}
}
