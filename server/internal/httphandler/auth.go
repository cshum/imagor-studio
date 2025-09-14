package httphandler

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/apperror"
	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/cshum/imagor-studio/server/internal/validation"
	"go.uber.org/zap"
)

type AuthHandler struct {
	tokenManager  *auth.TokenManager
	userStore     userstore.Store
	registryStore registrystore.Store
	logger        *zap.Logger
}

func NewAuthHandler(tokenManager *auth.TokenManager, userStore userstore.Store, registryStore registrystore.Store, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		tokenManager:  tokenManager,
		userStore:     userStore,
		registryStore: registryStore,
		logger:        logger,
	}
}

type RegisterRequest struct {
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

type RegisterAdminRequest struct {
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

type FirstRunResponse struct {
	IsFirstRun bool  `json:"isFirstRun"`
	Timestamp  int64 `json:"timestamp"`
}

type RefreshTokenRequest struct {
	Token string `json:"token"`
}

func (h *AuthHandler) CheckFirstRun() http.HandlerFunc {
	return Handle(http.MethodGet, func(w http.ResponseWriter, r *http.Request) error {
		_, totalCount, err := h.userStore.List(r.Context(), 0, 1)
		if err != nil {
			h.logger.Error("Failed to check existing users", zap.Error(err))
			return apperror.InternalServerError("Failed to check system status")
		}

		return WriteSuccess(w, FirstRunResponse{
			IsFirstRun: totalCount == 0,
			Timestamp:  time.Now().UnixMilli(),
		})
	})
}

func (h *AuthHandler) RegisterAdmin() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		var req RegisterAdminRequest
		if err := DecodeJSON(r, &req); err != nil {
			return err
		}

		// Check if this is truly the first run
		_, totalCount, err := h.userStore.List(r.Context(), 0, 1)
		if err != nil {
			h.logger.Error("Failed to check existing users", zap.Error(err))
			return apperror.InternalServerError("Failed to check system status")
		}

		if totalCount > 0 {
			return apperror.NewAppError(http.StatusConflict, apperror.ErrAlreadyExists,
				"Admin user already exists. System is already initialized.",
				nil)
		}

		// Convert to RegisterRequest for user creation
		userReq := RegisterRequest{
			DisplayName: req.DisplayName,
			Email:       req.Email,
			Password:    req.Password,
		}

		response, err := h.createUser(r.Context(), userReq, "admin")
		if err != nil {
			return err
		}

		// Populate default app settings for first admin
		defaultEntries := []*registrystore.Registry{
			{
				Key:         "config.app_file_extensions",
				Value:       ".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.jxl,.avif,.heic,.heif",
				IsEncrypted: false,
			},
			{
				Key:         "config.app_show_hidden",
				Value:       "false",
				IsEncrypted: false,
			},
		}

		if _, err := h.registryStore.SetMulti(r.Context(), registrystore.SystemOwnerID, defaultEntries); err != nil {
			h.logger.Warn("Failed to populate default gallery settings", zap.Error(err))
		}

		h.logger.Info("First admin user created via API",
			zap.String("userID", response.User.ID),
			zap.String("displayName", response.User.DisplayName),
			zap.String("email", response.User.Email))

		return WriteCreated(w, response)
	})
}

func (h *AuthHandler) Register() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		var req RegisterRequest
		if err := DecodeJSON(r, &req); err != nil {
			return err
		}

		response, err := h.createUser(r.Context(), req, "user")
		if err != nil {
			return err
		}

		return WriteCreated(w, response)
	})
}

func (h *AuthHandler) Login() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		var req LoginRequest
		if err := DecodeJSON(r, &req); err != nil {
			return err
		}

		// Validate input
		if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Password) == "" {
			return apperror.NewAppError(http.StatusBadRequest, apperror.ErrInvalidInput,
				"Email and password are required", nil)
		}

		// Normalize email
		email := validation.NormalizeEmail(req.Email)

		// Get user by email
		user, err := h.userStore.GetByEmail(r.Context(), email)
		if err != nil {
			h.logger.Error("Failed to get user", zap.Error(err))
			return apperror.InternalServerError("Login failed")
		}

		if user == nil || !user.IsActive {
			return apperror.NewAppError(http.StatusUnauthorized, apperror.ErrInvalidCredentials,
				"Invalid credentials", nil)
		}

		// Check password
		if err := auth.CheckPassword(user.HashedPassword, req.Password); err != nil {
			return apperror.NewAppError(http.StatusUnauthorized, apperror.ErrInvalidCredentials,
				"Invalid credentials", nil)
		}

		// Update last login
		if err := h.userStore.UpdateLastLogin(r.Context(), user.ID); err != nil {
			h.logger.Warn("Failed to update last login", zap.Error(err), zap.String("userID", user.ID))
		}

		response, err := h.generateAuthResponse(user.ID, user.DisplayName, user.Email, user.Role)
		if err != nil {
			return err
		}

		return WriteSuccess(w, response)
	})
}

func (h *AuthHandler) GuestLogin() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		// Check if guest mode is enabled via system metadata
		// Try new format first: config.allow_guest_mode
		guestModeMetadata, err := h.registryStore.Get(r.Context(), registrystore.SystemOwnerID, "config.allow_guest_mode")
		if err != nil {
			h.logger.Error("Failed to check guest mode setting", zap.Error(err))
			return apperror.InternalServerError("Failed to check system configuration")
		}

		// If new format not found, try old format: auth.enableGuestMode
		if guestModeMetadata == nil {
			guestModeMetadata, err = h.registryStore.Get(r.Context(), registrystore.SystemOwnerID, "auth.enableGuestMode")
			if err != nil {
				h.logger.Error("Failed to check legacy guest mode setting", zap.Error(err))
				return apperror.InternalServerError("Failed to check system configuration")
			}
		}

		// If guest mode is not set or not "true", block guest login
		if guestModeMetadata == nil || guestModeMetadata.Value != "true" {
			return apperror.NewAppError(http.StatusForbidden, apperror.ErrPermissionDenied,
				"Guest mode is not enabled", nil)
		}

		guestID := uuid.GenerateUUID()

		token, err := h.tokenManager.GenerateToken(guestID, "guest", []string{"read"})
		if err != nil {
			h.logger.Error("Failed to generate guest token", zap.Error(err))
			return apperror.InternalServerError("Failed to generate token")
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
		return WriteSuccess(w, response)
	})
}

func (h *AuthHandler) RefreshToken() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		var req RefreshTokenRequest
		if err := DecodeJSON(r, &req); err != nil {
			return err
		}

		// Validate existing token
		claims, err := h.tokenManager.ValidateToken(req.Token)
		if err != nil {
			return apperror.NewAppError(http.StatusUnauthorized, apperror.ErrInvalidToken,
				"Invalid token", map[string]interface{}{"error": err.Error()})
		}

		// Verify user still exists and is active
		user, err := h.userStore.GetByID(r.Context(), claims.UserID)
		if err != nil {
			h.logger.Error("Failed to get user for token refresh", zap.Error(err))
			return apperror.InternalServerError("Failed to refresh token")
		}

		if user == nil {
			return apperror.NewAppError(http.StatusUnauthorized, apperror.ErrInvalidToken,
				"User not found or inactive", nil)
		}

		// Generate new token
		newToken, err := h.tokenManager.RefreshToken(claims)
		if err != nil {
			h.logger.Error("Failed to refresh token", zap.Error(err))
			return apperror.InternalServerError("Failed to refresh token")
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

		return WriteSuccess(w, response)
	})
}

func (h *AuthHandler) createUser(ctx context.Context, req RegisterRequest, role string) (*LoginResponse, error) {
	// Validate input
	if err := h.validateRegisterRequest(&req); err != nil {
		return nil, apperror.NewAppError(http.StatusBadRequest, apperror.ErrInvalidInput, err.Error(), nil)
	}

	// Normalize inputs
	normalizedEmail := validation.NormalizeEmail(req.Email)
	normalizedDisplayName := validation.NormalizeDisplayName(req.DisplayName)

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		h.logger.Error("Failed to hash password", zap.Error(err))
		return nil, apperror.InternalServerError("Failed to process registration")
	}

	// Create user
	user, err := h.userStore.Create(ctx, normalizedDisplayName, normalizedEmail, hashedPassword, role)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			return nil, apperror.NewAppError(http.StatusConflict, apperror.ErrAlreadyExists, err.Error(), nil)
		}
		h.logger.Error("Failed to create user", zap.Error(err))
		return nil, apperror.InternalServerError("Failed to create user")
	}

	return h.generateAuthResponse(user.ID, user.DisplayName, user.Email, user.Role)
}

func (h *AuthHandler) generateAuthResponse(userID, displayName, email, role string) (*LoginResponse, error) {
	// Determine scopes based on role
	scopes := []string{"read", "write"}
	if role == "admin" {
		scopes = append(scopes, "admin")
	}

	// Generate token
	token, err := h.tokenManager.GenerateToken(userID, role, scopes)
	if err != nil {
		h.logger.Error("Failed to generate token", zap.Error(err))
		return nil, apperror.InternalServerError("Failed to generate token")
	}

	return &LoginResponse{
		Token:     token,
		ExpiresIn: h.tokenManager.TokenDuration().Milliseconds() / 1000,
		User: UserResponse{
			ID:          userID,
			DisplayName: displayName,
			Email:       email,
			Role:        role,
		},
	}, nil
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
