package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/errors"
	"github.com/cshum/imagor-studio/server/pkg/uuid"
	"go.uber.org/zap"
)

type AuthHandler struct {
	tokenManager *auth.TokenManager
	logger       *zap.Logger
}

func NewAuthHandler(tokenManager *auth.TokenManager, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		tokenManager: tokenManager,
		logger:       logger,
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token     string `json:"token"`
	ExpiresIn int64  `json:"expiresIn"`
}

// Development login handler - creates a token for testing
// In production, this should validate credentials against a user database
func (h *AuthHandler) DevLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		errors.WriteErrorResponse(w, http.StatusMethodNotAllowed,
			errors.ErrInvalidInput,
			"Method not allowed",
			nil)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.WriteErrorResponse(w, http.StatusBadRequest,
			errors.ErrInvalidInput,
			"Invalid request body",
			map[string]interface{}{
				"error": err.Error(),
			})
		return
	}

	// For development, create a test user ID
	userID := uuid.GenerateUUID()

	// Generate token
	token, err := h.tokenManager.GenerateToken(
		userID,
		req.Email,
		"admin",                            // For development, give admin role
		[]string{"read", "write", "admin"}, // All scopes for development
	)
	if err != nil {
		h.logger.Error("Failed to generate token", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Failed to generate token",
			nil)
		return
	}

	response := LoginResponse{
		Token:     token,
		ExpiresIn: h.tokenManager.TokenDuration().Milliseconds() / 1000, // Convert to seconds
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// RefreshTokenRequest represents a token refresh request
type RefreshTokenRequest struct {
	Token string `json:"token"`
}

// RefreshToken handles token refresh requests
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		errors.WriteErrorResponse(w, http.StatusMethodNotAllowed,
			errors.ErrInvalidInput,
			"Method not allowed",
			nil)
		return
	}

	var req RefreshTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.WriteErrorResponse(w, http.StatusBadRequest,
			errors.ErrInvalidInput,
			"Invalid request body",
			map[string]interface{}{
				"error": err.Error(),
			})
		return
	}

	// Validate existing token
	claims, err := h.tokenManager.ValidateToken(req.Token)
	if err != nil {
		errors.WriteErrorResponse(w, http.StatusUnauthorized,
			errors.ErrInvalidToken,
			"Invalid token",
			map[string]interface{}{
				"error": err.Error(),
			})
		return
	}

	// Generate new token
	newToken, err := h.tokenManager.RefreshToken(claims)
	if err != nil {
		h.logger.Error("Failed to refresh token", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Failed to refresh token",
			nil)
		return
	}

	response := LoginResponse{
		Token:     newToken,
		ExpiresIn: h.tokenManager.TokenDuration().Milliseconds() / 1000, // Convert to seconds
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
