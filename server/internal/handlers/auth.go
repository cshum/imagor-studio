package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/errors"
	"github.com/cshum/imagor-studio/server/pkg/userstore"
	"github.com/cshum/imagor-studio/server/pkg/uuid"
	"github.com/cshum/imagor-studio/server/pkg/validation"
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
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token     string       `json:"token"`
	ExpiresIn int64        `json:"expiresIn"`
	User      UserResponse `json:"user"`
}

type UserResponse struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	Role        string `json:"role"`
}

// CheckFirstRun checks if this is the first run (no users exist)
func (h *AuthHandler) CheckFirstRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		errors.WriteErrorResponse(w, http.StatusMethodNotAllowed,
			errors.ErrInvalidInput,
			"Method not allowed",
			nil)
		return
	}

	// Check if any users exist
	_, totalCount, err := h.userStore.List(r.Context(), 0, 1)
	if err != nil {
		h.logger.Error("Failed to check existing users", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Failed to check system status",
			nil)
		return
	}

	response := map[string]interface{}{
		"isFirstRun": totalCount == 0,
		"userCount":  totalCount,
		"timestamp":  time.Now().UnixMilli(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// RegisterAdmin handles admin user registration (only on first run)
func (h *AuthHandler) RegisterAdmin(w http.ResponseWriter, r *http.Request) {
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

	// Check if this is truly the first run
	_, totalCount, err := h.userStore.List(r.Context(), 0, 1)
	if err != nil {
		h.logger.Error("Failed to check existing users", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Failed to check system status",
			nil)
		return
	}

	if totalCount > 0 {
		errors.WriteErrorResponse(w, http.StatusConflict,
			errors.ErrAlreadyExists,
			"Admin user already exists. System is already initialized.",
			map[string]interface{}{
				"userCount": totalCount,
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

	// Normalize the email and displayName
	normalizedEmail := validation.NormalizeEmail(req.Email)
	normalizedDisplayName := validation.NormalizeDisplayName(req.DisplayName)

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

	// Create admin user (force admin role)
	user, err := h.userStore.Create(r.Context(), normalizedDisplayName, normalizedEmail, hashedPassword, "admin")
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			errors.WriteErrorResponse(w, http.StatusConflict,
				errors.ErrAlreadyExists,
				err.Error(),
				nil)
			return
		}
		h.logger.Error("Failed to create admin user", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Failed to create admin user",
			nil)
		return
	}

	// Generate token with admin privileges
	token, err := h.tokenManager.GenerateToken(
		user.ID,
		user.Role,
		[]string{"read", "write", "admin"}, // Admin gets all scopes
	)
	if err != nil {
		h.logger.Error("Failed to generate token", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Failed to generate token",
			nil)
		return
	}

	h.logger.Info("First admin user created via API",
		zap.String("userID", user.ID),
		zap.String("displayName", user.DisplayName),
		zap.String("email", user.Email))

	response := LoginResponse{
		Token:     token,
		ExpiresIn: h.tokenManager.TokenDuration().Milliseconds() / 1000,
		User: UserResponse{
			ID:          user.ID,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Role:        user.Role,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
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

	// Normalize the email
	normalizedEmail := validation.NormalizeEmail(req.Email)
	normalizedDisplayName := validation.NormalizeDisplayName(req.DisplayName)

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
	user, err := h.userStore.Create(r.Context(), normalizedDisplayName, normalizedEmail, hashedPassword, "user")
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
			ID:          user.ID,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Role:        user.Role,
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
	if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Password) == "" {
		errors.WriteErrorResponse(w, http.StatusBadRequest,
			errors.ErrInvalidInput,
			"Email and password are required",
			nil)
		return
	}

	// Normalize email
	email := validation.NormalizeEmail(req.Email)

	// Get user by displayName or email
	user, err := h.userStore.GetByEmail(r.Context(), email)
	if err != nil {
		h.logger.Error("Failed to get user", zap.Error(err))
		errors.WriteErrorResponse(w, http.StatusInternalServerError,
			errors.ErrInternalServer,
			"Login failed",
			nil)
		return
	}

	if user == nil || !user.IsActive {
		errors.WriteErrorResponse(w, http.StatusUnauthorized,
			errors.ErrInvalidCredentials,
			"Invalid credentials",
			nil)
		return
	}

	// Check password
	if err := auth.CheckPassword(user.HashedPassword, req.Password); err != nil {
		errors.WriteErrorResponse(w, http.StatusUnauthorized,
			errors.ErrInvalidCredentials,
			"Invalid credentials",
			nil)
		return
	}

	// Update last login
	if err := h.userStore.UpdateLastLogin(r.Context(), user.ID); err != nil {
		h.logger.Warn("Failed to update last login", zap.Error(err), zap.String("userID", user.ID))
	}

	// Determine scopes based on role
	scopes := []string{"read", "write"}
	if user.Role == "admin" {
		scopes = append(scopes, "admin")
	}

	// Generate token
	token, err := h.tokenManager.GenerateToken(
		user.ID,
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
			ID:          user.ID,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Role:        user.Role,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// GuestLogin creates a temporary guest session without requiring registration
func (h *AuthHandler) GuestLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		errors.WriteErrorResponse(w, http.StatusMethodNotAllowed,
			errors.ErrInvalidInput,
			"Method not allowed",
			nil)
		return
	}

	guestID := uuid.GenerateUUID()

	// Generate token with limited scopes (read-only for guests)
	token, err := h.tokenManager.GenerateToken(
		guestID,
		"guest",          // Guest role
		[]string{"read"}, // Only read permissions
	)
	if err != nil {
		h.logger.Error("Failed to generate guest token", zap.Error(err))
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
			ID:          guestID,
			DisplayName: "guest",
			Email:       "guest@temporary.local",
			Role:        "guest",
		},
	}

	h.logger.Info("Guest login successful", zap.String("guestID", guestID))

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
			ID:          user.ID,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Role:        user.Role,
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
	// Validate displayName
	if err := validation.ValidateDisplayName(req.DisplayName); err != nil {
		return err
	}

	// Validate email
	if !validation.IsValidEmailRequired(req.Email) {
		return fmt.Errorf("valid email is required")
	}

	// Validate password
	if err := validation.ValidatePassword(req.Password); err != nil {
		return err
	}

	return nil
}
