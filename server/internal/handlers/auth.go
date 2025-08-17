package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/errors"
	"github.com/cshum/imagor-studio/server/pkg/userstore"
	"go.uber.org/zap"
)

type AuthHandler struct {
	tokenManager *auth.TokenManager
	userStore    userstore.Store
	logger       *zap.Logger
}

func NewAuthHandler(tokenManager *auth.TokenManager, userStore userstore.Store, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		tokenManager: tokenManager,
		userStore:    userStore,
		logger:       logger,
	}
}

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"` // Can be username or email
	Password string `json:"password"`
}

type LoginResponse struct {
	Token     string       `json:"token"`
	ExpiresIn int64        `json:"expiresIn"`
	User      UserResponse `json:"user"`
}

type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

// Register handles user registration
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		errors.WriteErrorResponse(w, http.StatusMethodNotAllowed,
			errors.ErrInvalidInput,
			"Method not allowed",
			nil)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.WriteErrorResponse(w, http.StatusBadRequest,
			errors.ErrInvalidInput,
			"Invalid request body",
			map[string]interface{}{
				"error": err.Error(),
			})
		return
	}

	// Validate input
	if err := h.validateRegisterRequest(&req); err != nil {
		errors.WriteErrorResponse(w, http.StatusBadRequest,
			errors.ErrInvalidInput,
			err.Error(),
			nil)
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		h.logger.Error("Failed to hash password", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Failed to process registration",
			nil)
		return
	}

	// Create user
	user, err := h.userStore.Create(r.Context(), req.Username, req.Email, hashedPassword, "user")
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			errors.WriteErrorResponse(w, http.StatusConflict,
				errors.ErrAlreadyExists,
				err.Error(),
				nil)
			return
		}
		h.logger.Error("Failed to create user", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Failed to create user",
			nil)
		return
	}

	// Generate token
	token, err := h.tokenManager.GenerateToken(
		user.ID,
		user.Email,
		user.Role,
		[]string{"read", "write"}, // Default scopes for regular users
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
		ExpiresIn: h.tokenManager.TokenDuration().Milliseconds() / 1000,
		User: UserResponse{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
			Role:     user.Role,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// Login handles user authentication
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
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

	// Validate input
	if strings.TrimSpace(req.Username) == "" || strings.TrimSpace(req.Password) == "" {
		errors.WriteErrorResponse(w, http.StatusBadRequest,
			errors.ErrInvalidInput,
			"Username and password are required",
			nil)
		return
	}

	// Get user by username or email
	user, err := h.userStore.GetByUsernameOrEmail(r.Context(), req.Username)
	if err != nil {
		h.logger.Error("Failed to get user", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Login failed",
			nil)
		return
	}

	if user == nil {
		errors.WriteErrorResponse(w, http.StatusUnauthorized,
			errors.ErrInvalidCredentials,
			"Invalid username or password",
			nil)
		return
	}

	// Check password
	if err := auth.CheckPassword(user.HashedPassword, req.Password); err != nil {
		errors.WriteErrorResponse(w, http.StatusUnauthorized,
			errors.ErrInvalidCredentials,
			"Invalid username or password",
			nil)
		return
	}

	// Update last login
	if err := h.userStore.UpdateLastLogin(r.Context(), user.ID); err != nil {
		h.logger.Warn("Failed to update last login", zap.Error(err))
	}

	// Determine scopes based on role
	scopes := []string{"read", "write"}
	if user.Role == "admin" {
		scopes = append(scopes, "admin")
	}

	// Generate token
	token, err := h.tokenManager.GenerateToken(
		user.ID,
		user.Email,
		user.Role,
		scopes,
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
		ExpiresIn: h.tokenManager.TokenDuration().Milliseconds() / 1000,
		User: UserResponse{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
			Role:     user.Role,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// RefreshToken handles token refresh requests (keeping existing implementation)
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

	// Verify user still exists and is active
	user, err := h.userStore.GetByID(r.Context(), claims.UserID)
	if err != nil {
		h.logger.Error("Failed to get user for token refresh", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Failed to refresh token",
			nil)
		return
	}

	if user == nil {
		errors.WriteErrorResponse(w, http.StatusUnauthorized,
			errors.ErrInvalidToken,
			"User not found or inactive",
			nil)
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
		ExpiresIn: h.tokenManager.TokenDuration().Milliseconds() / 1000,
		User: UserResponse{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
			Role:     user.Role,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// RefreshTokenRequest represents a token refresh request
type RefreshTokenRequest struct {
	Token string `json:"token"`
}

func (h *AuthHandler) validateRegisterRequest(req *RegisterRequest) error {
	if strings.TrimSpace(req.Username) == "" {
		return fmt.Errorf("username is required")
	}

	if len(req.Username) < 3 || len(req.Username) > 50 {
		return fmt.Errorf("username must be between 3 and 50 characters")
	}

	if strings.TrimSpace(req.Email) == "" {
		return fmt.Errorf("email is required")
	}

	// Basic email validation
	if !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
		return fmt.Errorf("invalid email format")
	}

	if len(req.Password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	return nil
}

// DevLogin - keep for development/testing
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
	userID := "dev-user-" + strings.ReplaceAll(req.Username, "@", "-")

	// Generate token
	token, err := h.tokenManager.GenerateToken(
		userID,
		req.Username,
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
		ExpiresIn: h.tokenManager.TokenDuration().Milliseconds() / 1000,
		User: UserResponse{
			ID:       userID,
			Username: req.Username,
			Email:    req.Username,
			Role:     "admin",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
