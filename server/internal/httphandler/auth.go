package httphandler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/signup"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/cshum/imagor-studio/server/pkg/uuid"
	"github.com/cshum/imagor-studio/server/pkg/validation"
	"go.uber.org/zap"
)

type AuthHandler struct {
	tokenManager  *auth.TokenManager
	userStore     userstore.Store
	orgStore      org.OrgStore
	spaceStore    space.SpaceStore
	inviteStore   space.SpaceInviteStore
	registryStore registrystore.Store
	logger        *zap.Logger
	embeddedMode  bool
	multiTenant   bool
	signupRuntime signup.Runtime
}

type AuthHandlerConfig struct {
	EmbeddedMode  bool
	MultiTenant   bool
	SpaceStore    space.SpaceStore
	InviteStore   space.SpaceInviteStore
	SignupRuntime signup.Runtime
}

type GuestLoginRequest struct {
	SpaceKey string `json:"spaceKey"`
}

func NewAuthHandler(
	tokenManager *auth.TokenManager,
	userStore userstore.Store,
	orgStore org.OrgStore,
	registryStore registrystore.Store,
	logger *zap.Logger,
	cfg AuthHandlerConfig,
) *AuthHandler {
	return &AuthHandler{
		tokenManager:  tokenManager,
		userStore:     userStore,
		orgStore:      orgStore,
		spaceStore:    cfg.SpaceStore,
		inviteStore:   cfg.InviteStore,
		registryStore: registryStore,
		logger:        logger,
		embeddedMode:  cfg.EmbeddedMode,
		multiTenant:   cfg.MultiTenant,
		signupRuntime: cfg.SignupRuntime,
	}
}

func (h *AuthHandler) cloudEnabled() bool {
	return management.OrgEnabled(h.orgStore)
}

type RegisterRequest struct {
	DisplayName string `json:"displayName"`
	Email       string `json:"email,omitempty"`
	Username    string `json:"username,omitempty"`
	Password    string `json:"password"`
}

type RegisterAdminRequest struct {
	DisplayName     string `json:"displayName"`
	Username        string `json:"username"`
	Password        string `json:"password"`
	DefaultLanguage string `json:"defaultLanguage"`
}

type LoginRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	InviteToken string `json:"inviteToken,omitempty"`
}

type LoginResponse struct {
	Token        string       `json:"token"`
	ExpiresIn    int64        `json:"expiresIn"`
	User         UserResponse `json:"user"`
	RedirectPath string       `json:"redirectPath,omitempty"`
	PathPrefix   string       `json:"pathPrefix,omitempty"`
}

type UserResponse struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Username    string `json:"username"`
	Role        string `json:"role"`
}

type FirstRunResponse struct {
	IsFirstRun  bool  `json:"isFirstRun"`
	Timestamp   int64 `json:"timestamp"`
	MultiTenant bool  `json:"multiTenant"`
}

type RefreshTokenRequest struct {
	Token string `json:"token"`
}

type StartPublicSignupRequest struct {
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	InviteToken string `json:"inviteToken,omitempty"`
}

type VerifyPublicSignupRequest struct {
	Token string `json:"token"`
}

type ResendPublicSignupVerificationRequest struct {
	Email string `json:"email"`
}

func (h *AuthHandler) CheckFirstRun() http.HandlerFunc {
	return Handle(http.MethodGet, func(w http.ResponseWriter, r *http.Request) error {
		_, totalCount, err := h.userStore.List(r.Context(), 0, 1, "")
		if err != nil {
			h.logger.Error("Failed to check existing users", zap.Error(err))
			return apperror.InternalServerError("Failed to check system status")
		}

		return WriteSuccess(w, FirstRunResponse{
			IsFirstRun:  totalCount == 0,
			Timestamp:   time.Now().UnixMilli(),
			MultiTenant: h.multiTenant,
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
		_, totalCount, err := h.userStore.List(r.Context(), 0, 1, "")
		if err != nil {
			h.logger.Error("Failed to check existing users", zap.Error(err))
			return apperror.InternalServerError("Failed to check system status")
		}

		if totalCount > 0 {
			return apperror.Conflict("Admin user already exists. System is already initialized.")
		}

		// Convert to RegisterRequest for user creation
		userReq := RegisterRequest{
			DisplayName: req.DisplayName,
			Username:    req.Username,
			Password:    req.Password,
		}

		response, err := h.createUser(r.Context(), userReq, "admin")
		if err != nil {
			return err
		}

		// Determine default language (fallback to "en" if not provided)
		defaultLanguage := req.DefaultLanguage
		if defaultLanguage == "" {
			defaultLanguage = "en"
		}

		// Populate default app settings for first admin
		defaultEntries := []*registrystore.Registry{
			{
				Key:         "config.app_default_language",
				Value:       defaultLanguage,
				IsEncrypted: false,
			},
		}

		if _, err := h.registryStore.SetMulti(r.Context(), registrystore.SystemOwnerID, defaultEntries); err != nil {
			h.logger.Warn("Failed to populate default gallery settings", zap.Error(err))
		}

		h.logger.Info("First admin user created via API",
			zap.String("userID", response.User.ID),
			zap.String("displayName", response.User.DisplayName),
			zap.String("username", response.User.Username))

		return WriteCreated(w, response)
	})
}

func (h *AuthHandler) Register() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		if !h.cloudEnabled() {
			return apperror.Forbidden("Public sign-up is not available in this deployment.")
		}

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

func (h *AuthHandler) StartPublicSignup() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		if !h.cloudEnabled() {
			return apperror.Forbidden("Public sign-up is not available in this deployment.")
		}
		if h.signupRuntime == nil {
			return apperror.Forbidden("Email verification sign-up is not available in this deployment.")
		}

		var req StartPublicSignupRequest
		if err := DecodeJSON(r, &req); err != nil {
			return err
		}

		validationRequest := RegisterRequest{
			DisplayName: req.DisplayName,
			Email:       req.Email,
			Password:    req.Password,
		}
		if err := h.validateRegisterRequest(&validationRequest, false); err != nil {
			return err
		}

		result, err := h.signupRuntime.StartPublicSignup(r.Context(), signup.StartPublicSignupParams{
			DisplayName: validation.NormalizeDisplayName(req.DisplayName),
			Email:       validation.NormalizeEmail(req.Email),
			Password:    req.Password,
			InviteToken: strings.TrimSpace(req.InviteToken),
		})
		if err != nil {
			if errors.Is(err, signup.ErrEmailAlreadyExists) {
				return apperror.Conflict("Email already exists", "email")
			}
			if errors.Is(err, signup.ErrInviteTokenInvalid) {
				return apperror.BadRequest("Invitation is no longer valid", map[string]interface{}{"field": "inviteToken"})
			}
			if errors.Is(err, signup.ErrInviteEmailMismatch) {
				return apperror.BadRequest("This invitation was sent to a different email address", map[string]interface{}{"field": "email"})
			}
			if errors.Is(err, signup.ErrVerificationCooldownActive) {
				return apperror.TooManyRequests("Please wait before requesting another verification email", map[string]interface{}{"field": "email"}, "email")
			}
			h.logger.Error("Failed to start public sign-up verification", zap.Error(err))
			return apperror.InternalServerError("Failed to start sign-up")
		}

		return WriteCreated(w, result)
	})
}

func (h *AuthHandler) VerifyPublicSignup() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		if !h.cloudEnabled() {
			return apperror.Forbidden("Public sign-up is not available in this deployment.")
		}
		if h.signupRuntime == nil {
			return apperror.Forbidden("Email verification sign-up is not available in this deployment.")
		}

		var req VerifyPublicSignupRequest
		if err := DecodeJSON(r, &req); err != nil {
			return err
		}
		if strings.TrimSpace(req.Token) == "" {
			return apperror.BadRequest("Verification token is required", map[string]interface{}{"field": "token"})
		}

		result, err := h.signupRuntime.VerifyPublicSignup(r.Context(), strings.TrimSpace(req.Token))
		if err != nil {
			if errors.Is(err, signup.ErrVerificationTokenInvalid) {
				return apperror.BadRequest("Verification link is invalid or has expired", map[string]interface{}{"field": "token"})
			}
			if errors.Is(err, signup.ErrInviteTokenInvalid) {
				return apperror.BadRequest("Invitation is no longer valid", map[string]interface{}{"field": "inviteToken"})
			}
			if errors.Is(err, signup.ErrEmailAlreadyExists) {
				return apperror.Conflict("Email already exists", "email")
			}
			h.logger.Error("Failed to verify public sign-up", zap.Error(err))
			return apperror.InternalServerError("Failed to verify sign-up")
		}

		user, err := h.userStore.GetByID(r.Context(), result.UserID)
		if err != nil {
			h.logger.Error("Failed to load verified user", zap.String("userID", result.UserID), zap.Error(err))
			return apperror.InternalServerError("Failed to complete sign-up")
		}
		if user == nil {
			return apperror.InternalServerError("Failed to complete sign-up")
		}

		orgID := strings.TrimSpace(result.OrgID)
		if orgID == "" {
			orgID = h.resolvePrimaryOrgID(r.Context(), result.UserID)
		}

		response, err := h.generateAuthResponse(user.ID, user.DisplayName, user.Username, user.Role, orgID)
		if err != nil {
			return err
		}
		response.RedirectPath = strings.TrimSpace(result.RedirectPath)

		return WriteSuccess(w, response)
	})
}

func (h *AuthHandler) ResendPublicSignupVerification() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		if !h.cloudEnabled() {
			return apperror.Forbidden("Public sign-up is not available in this deployment.")
		}
		if h.signupRuntime == nil {
			return apperror.Forbidden("Email verification sign-up is not available in this deployment.")
		}

		var req ResendPublicSignupVerificationRequest
		if err := DecodeJSON(r, &req); err != nil {
			return err
		}
		if err := validation.ValidateEmail(req.Email); err != nil {
			return apperror.BadRequest("Invalid email", map[string]interface{}{"field": "email"})
		}

		result, err := h.signupRuntime.ResendPublicSignupVerification(r.Context(), validation.NormalizeEmail(req.Email))
		if err != nil {
			if errors.Is(err, signup.ErrPendingSignupNotFound) {
				return apperror.BadRequest("No pending sign-up found for this email", map[string]interface{}{"field": "email"})
			}
			if errors.Is(err, signup.ErrVerificationCooldownActive) {
				return apperror.TooManyRequests("Please wait before requesting another verification email", map[string]interface{}{"field": "email"}, "email")
			}
			h.logger.Error("Failed to resend public sign-up verification", zap.Error(err))
			return apperror.InternalServerError("Failed to resend sign-up verification")
		}

		return WriteSuccess(w, result)
	})
}

func (h *AuthHandler) Login() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		var req LoginRequest
		if err := DecodeJSON(r, &req); err != nil {
			return err
		}

		// Validate input - return validation error for missing credentials
		if strings.TrimSpace(req.Username) == "" {
			return apperror.BadRequest("Username is required", nil)
		}
		if strings.TrimSpace(req.Password) == "" {
			return apperror.BadRequest("Password is required", nil)
		}

		identifier := strings.TrimSpace(req.Username)

		var user *model.User
		var err error

		if strings.Contains(identifier, "@") {
			email := strings.ToLower(identifier)
			emailUser, lookupErr := h.userStore.GetByEmail(r.Context(), email)
			if lookupErr != nil {
				h.logger.Error("Failed to get user", zap.Error(lookupErr))
				return apperror.InternalServerError("Database connection failed")
			}

			if emailUser != nil {
				user, err = h.userStore.GetByIDWithPassword(r.Context(), emailUser.ID)
			}
		} else {
			username := validation.NormalizeUsername(identifier)
			user, err = h.userStore.GetByUsername(r.Context(), username)
		}
		if err != nil {
			h.logger.Error("Failed to get user", zap.Error(err))
			return apperror.InternalServerError("Database connection failed")
		}

		// Return generic login failed for user not found or inactive account
		if user == nil || !user.IsActive {
			return apperror.InvalidCredentials("LOGIN_FAILED")
		}

		// Check password - return generic login failed for wrong password
		if err := auth.CheckPassword(user.HashedPassword, req.Password); err != nil {
			return apperror.InvalidCredentials("LOGIN_FAILED")
		}

		// Update last login
		if err := h.userStore.UpdateLastLogin(r.Context(), user.ID); err != nil {
			h.logger.Warn("Failed to update last login", zap.Error(err), zap.String("userID", user.ID))
		}

		orgID, redirectPath, err := h.resolveLoginOrgID(r.Context(), user, strings.TrimSpace(req.InviteToken))
		if err != nil {
			return err
		}

		response, err := h.generateAuthResponse(user.ID, user.DisplayName, user.Username, user.Role, orgID)
		if err != nil {
			return err
		}
		response.RedirectPath = redirectPath

		return WriteSuccess(w, response)
	})
}

func (h *AuthHandler) GuestLogin() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		var req GuestLoginRequest
		if r.Body != nil {
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
				return apperror.BadRequest("Invalid request body", map[string]interface{}{"error": err.Error()})
			}
		}

		allowed, err := h.isGuestLoginAllowed(r.Context(), strings.TrimSpace(req.SpaceKey))
		if err != nil {
			return err
		}

		if !allowed {
			return apperror.Forbidden("Guest mode is not enabled")
		}

		guestID := uuid.GenerateUUID()

		token, err := h.tokenManager.GenerateToken(guestID, "guest", []string{"read"}, "")
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
				Username:    "guest",
				Role:        "guest",
			},
		}

		h.logger.Info("Guest login successful", zap.String("guestID", guestID))
		return WriteSuccess(w, response)
	})
}

func (h *AuthHandler) isGuestLoginAllowed(ctx context.Context, spaceKey string) (bool, error) {
	guestModeMetadata, err := h.registryStore.Get(ctx, registrystore.SystemOwnerID, "config.allow_guest_mode")
	if err != nil {
		h.logger.Error("Failed to check guest mode setting", zap.Error(err))
		return false, apperror.InternalServerError("Failed to check system configuration")
	}

	if guestModeMetadata == nil {
		guestModeMetadata, err = h.registryStore.Get(ctx, registrystore.SystemOwnerID, "auth.enableGuestMode")
		if err != nil {
			h.logger.Error("Failed to check legacy guest mode setting", zap.Error(err))
			return false, apperror.InternalServerError("Failed to check system configuration")
		}
	}

	if guestModeMetadata != nil && guestModeMetadata.Value == "true" {
		return true, nil
	}

	if spaceKey == "" || h.spaceStore == nil || h.registryStore == nil {
		return false, nil
	}

	spaceRecord, err := h.spaceStore.GetByKey(ctx, spaceKey)
	if err != nil {
		h.logger.Error("Failed to load public space", zap.String("spaceKey", spaceKey), zap.Error(err))
		return false, apperror.InternalServerError("Failed to check space configuration")
	}
	if spaceRecord == nil {
		return false, nil
	}

	publicAccess, err := h.registryStore.Get(ctx, registrystore.SpaceOwnerID(spaceRecord.ID), "config.allow_guest_mode")
	if err != nil {
		h.logger.Error("Failed to check space public access", zap.String("spaceKey", spaceKey), zap.Error(err))
		return false, apperror.InternalServerError("Failed to check space configuration")
	}

	return publicAccess != nil && publicAccess.Value == "true", nil
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
			return apperror.Unauthorized("Invalid token")
		}

		// Verify user still exists and is active
		user, err := h.userStore.GetByID(r.Context(), claims.UserID)
		if err != nil {
			h.logger.Error("Failed to get user for token refresh", zap.Error(err))
			return apperror.InternalServerError("Failed to refresh token")
		}

		if user == nil {
			return apperror.Unauthorized("User not found or inactive")
		}

		currentOrgID := h.resolvePrimaryOrgID(r.Context(), claims.UserID)
		response, err := h.generateAuthResponse(user.ID, user.DisplayName, user.Username, user.Role, currentOrgID)
		if err != nil {
			h.logger.Error("Failed to refresh token", zap.Error(err))
			return apperror.InternalServerError("Failed to refresh token")
		}

		return WriteSuccess(w, response)
	})
}

func (h *AuthHandler) EmbeddedGuestLogin() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		// Check if embedded mode is enabled
		if !h.embeddedMode {
			return apperror.Forbidden("Embedded mode is not enabled")
		}

		// Extract JWT token from Authorization header
		authHeader := r.Header.Get("Authorization")
		jwtToken, err := auth.ExtractTokenFromHeader(authHeader)
		if err != nil {
			return apperror.Unauthorized("Authorization header is missing or invalid")
		}

		// Validate the JWT token (this validates the token from the CMS)
		claims, err := h.tokenManager.ValidateToken(jwtToken)
		if err != nil {
			return apperror.Unauthorized("Invalid or expired JWT token")
		}

		pathPrefix := claims.PathPrefix

		// Validate path prefix format if provided
		if pathPrefix != "" {
			// Normalize path prefix - ensure it starts with / and doesn't end with / (unless it's root)
			if !strings.HasPrefix(pathPrefix, "/") {
				pathPrefix = "/" + pathPrefix
			}
			if len(pathPrefix) > 1 && strings.HasSuffix(pathPrefix, "/") {
				pathPrefix = strings.TrimSuffix(pathPrefix, "/")
			}

			// Basic security check - prevent path traversal
			if strings.Contains(pathPrefix, "..") {
				return apperror.BadRequest("Invalid path prefix: path traversal not allowed", nil)
			}
		}

		// Generate embedded guest user ID
		embeddedGuestID := uuid.GenerateUUID()

		// Generate session token for embedded guest with editor permissions and path prefix
		sessionToken, err := h.tokenManager.GenerateTokenWithOptions(embeddedGuestID, "guest", []string{"read", "edit"}, true, pathPrefix)
		if err != nil {
			h.logger.Error("Failed to generate embedded guest token", zap.Error(err))
			return apperror.InternalServerError("Failed to generate session token")
		}

		response := LoginResponse{
			Token:     sessionToken,
			ExpiresIn: h.tokenManager.TokenDuration().Milliseconds() / 1000,
			User: UserResponse{
				ID:          embeddedGuestID,
				DisplayName: "Embedded Guest",
				Username:    "embedded-guest",
				Role:        "guest",
			},
			PathPrefix: pathPrefix,
		}

		h.logger.Info("Embedded guest login successful",
			zap.String("embeddedGuestID", embeddedGuestID),
			zap.String("pathPrefix", pathPrefix),
			zap.String("userAgent", r.Header.Get("User-Agent")))

		return WriteSuccess(w, response)
	})
}

func (h *AuthHandler) createUser(ctx context.Context, req RegisterRequest, role string) (*LoginResponse, error) {
	isPublicSignup := role == "user" && h.cloudEnabled()
	if isPublicSignup {
		if strings.TrimSpace(req.Email) == "" {
			return nil, apperror.BadRequest("Email is required", map[string]interface{}{
				"field": "email",
			})
		}
		if strings.TrimSpace(req.Username) == "" {
			req.Username = validation.GenerateSystemUsername()
		}
	}

	// Validate input with field-specific errors
	if err := h.validateRegisterRequest(&req, !isPublicSignup); err != nil {
		return nil, err
	}

	// Normalize inputs
	normalizedEmail := validation.NormalizeEmail(req.Email)
	normalizedUsername := validation.NormalizeUsername(req.Username)
	normalizedDisplayName := validation.NormalizeDisplayName(req.DisplayName)

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		h.logger.Error("Failed to hash password", zap.Error(err))
		return nil, apperror.InternalServerError("Failed to process registration")
	}

	// Create user
	var user *userstore.User
	if normalizedEmail != "" {
		if creator, ok := h.userStore.(interface {
			CreateWithEmail(context.Context, string, string, string, string, string) (*userstore.User, error)
		}); ok {
			user, err = creator.CreateWithEmail(ctx, normalizedDisplayName, normalizedUsername, hashedPassword, role, normalizedEmail)
		} else {
			return nil, apperror.InternalServerError("Failed to create user")
		}
	} else {
		user, err = h.userStore.Create(ctx, normalizedDisplayName, normalizedUsername, hashedPassword, role)
	}
	if err != nil {
		if errors.Is(err, userstore.ErrUsernameAlreadyExists) {
			return nil, apperror.Conflict("Username already exists", "username")
		}
		if errors.Is(err, userstore.ErrEmailAlreadyExists) {
			return nil, apperror.Conflict("Email already exists", "email")
		}
		h.logger.Error("Failed to create user", zap.Error(err))
		return nil, apperror.InternalServerError("Failed to create user")
	}

	return h.provisionWorkspaceOwner(ctx, user)
}

func (h *AuthHandler) provisionWorkspaceOwner(ctx context.Context, user *userstore.User) (*LoginResponse, error) {
	if user == nil {
		return nil, apperror.InternalServerError("Failed to create user")
	}

	// multi-tenant mode: direct signup provisions the initial workspace org for the user.
	// Self-hosted: orgStore is nil — skip org creation.
	orgID := ""
	if h.cloudEnabled() {
		trialEndsAt := time.Now().UTC().Add(14 * 24 * time.Hour)
		org, err := h.orgStore.CreateWithMember(ctx, user.ID, user.DisplayName, user.Username, &trialEndsAt)
		if err != nil {
			h.logger.Error("Failed to provision workspace org for new user",
				zap.String("userID", user.ID), zap.Error(err))
			return nil, apperror.InternalServerError("Failed to initialize organization")
		}
		orgID = org.ID
	}

	return h.generateAuthResponse(user.ID, user.DisplayName, user.Username, user.Role, orgID)
}

func (h *AuthHandler) provisionWorkspaceMember(_ context.Context, user *userstore.User, orgID string) (*LoginResponse, error) {
	if user == nil || strings.TrimSpace(orgID) == "" {
		return nil, apperror.InternalServerError("Failed to initialize organization")
	}

	return h.generateAuthResponse(user.ID, user.DisplayName, user.Username, user.Role, orgID)
}

func (h *AuthHandler) resolveLoginOrgID(ctx context.Context, user *model.User, inviteToken string) (string, string, error) {
	orgID := h.resolvePrimaryOrgID(ctx, user.ID)
	if inviteToken == "" || h.inviteStore == nil || !h.cloudEnabled() {
		return orgID, "", nil
	}

	invitation, err := h.inviteStore.GetPendingByToken(ctx, inviteToken)
	if err != nil {
		h.logger.Error("Failed to resolve invitation on login", zap.String("userID", user.ID), zap.Error(err))
		return "", "", apperror.InternalServerError("Failed to complete sign-in")
	}
	if invitation == nil || invitation.AcceptedAt != nil || invitation.ExpiresAt.Before(time.Now().UTC()) {
		return "", "", apperror.BadRequest("Invitation is no longer valid", map[string]interface{}{"field": "inviteToken"})
	}

	redirectPath, err := h.resolveInvitationRedirectPath(ctx, invitation)
	if err != nil {
		h.logger.Error("Failed to resolve invitation redirect path on login", zap.String("userID", user.ID), zap.Error(err))
		return "", "", apperror.InternalServerError("Failed to complete sign-in")
	}

	userEmail := ""
	if user.Email != nil {
		userEmail = validation.NormalizeEmail(*user.Email)
	}
	if userEmail == "" || userEmail != validation.NormalizeEmail(invitation.Email) {
		return "", "", apperror.BadRequest("This invitation was sent to a different email address", map[string]interface{}{"field": "username"})
	}

	isSpaceInvite := strings.TrimSpace(invitation.SpaceID) != ""
	if !isSpaceInvite && orgID != "" && orgID != invitation.OrgID {
		return "", "", apperror.Conflict("This invitation belongs to a different organization", "inviteToken")
	}

	if !isSpaceInvite {
		if err := h.orgStore.AddMember(ctx, invitation.OrgID, user.ID, invitation.Role); err != nil {
			h.logger.Error("Failed to add invited organization member on login",
				zap.String("userID", user.ID),
				zap.String("orgID", invitation.OrgID),
				zap.Error(err))
			return "", "", apperror.InternalServerError("Failed to complete sign-in")
		}
	}

	if isSpaceInvite && h.spaceStore != nil {
		if err := h.spaceStore.AddMember(ctx, invitation.SpaceID, user.ID, invitation.Role); err != nil {
			h.logger.Error("Failed to add invited space member on login",
				zap.String("userID", user.ID),
				zap.String("spaceID", invitation.SpaceID),
				zap.Error(err))
			return "", "", apperror.InternalServerError("Failed to complete sign-in")
		}
	}

	if err := h.inviteStore.MarkAccepted(ctx, invitation.ID, time.Now().UTC()); err != nil {
		h.logger.Error("Failed to mark invitation accepted on login",
			zap.String("userID", user.ID),
			zap.String("inviteID", invitation.ID),
			zap.Error(err))
		return "", "", apperror.InternalServerError("Failed to complete sign-in")
	}

	if isSpaceInvite {
		return orgID, redirectPath, nil
	}

	return invitation.OrgID, redirectPath, nil
}

func (h *AuthHandler) resolveInvitationRedirectPath(ctx context.Context, invitation *space.Invitation) (string, error) {
	if invitation == nil || strings.TrimSpace(invitation.SpaceID) == "" || h.spaceStore == nil {
		return "", nil
	}

	resolvedSpace, err := h.spaceStore.GetByID(ctx, invitation.SpaceID)
	if err != nil {
		return "", err
	}
	if resolvedSpace == nil || strings.TrimSpace(resolvedSpace.Key) == "" {
		return "", nil
	}

	return "/spaces/" + resolvedSpace.Key, nil
}

func (h *AuthHandler) resolvePrimaryOrgID(ctx context.Context, userID string) string {
	if !h.cloudEnabled() {
		return ""
	}

	org, err := h.orgStore.GetByUserID(ctx, userID)
	if err != nil {
		h.logger.Warn("Failed to look up org for user on login",
			zap.String("userID", userID), zap.Error(err))
		return ""
	}
	if org == nil {
		return ""
	}

	return org.ID
}

func (h *AuthHandler) generateAuthResponse(userID, displayName, username, role, orgID string) (*LoginResponse, error) {
	// Determine scopes based on role
	scopes := []string{"read", "write"}
	if role == "admin" {
		scopes = append(scopes, "admin")
	}

	// Use org-aware token when an org is known (multi-tenant mode).
	var token string
	var err error
	if orgID != "" {
		token, err = h.tokenManager.GenerateTokenForUser(userID, role, scopes, orgID)
	} else {
		token, err = h.tokenManager.GenerateToken(userID, role, scopes, "")
	}
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
			Username:    username,
			Role:        role,
		},
	}, nil
}

func (h *AuthHandler) validateRegisterRequest(req *RegisterRequest, requireUsername bool) error {
	// Validate displayName
	if err := validation.ValidateDisplayName(req.DisplayName); err != nil {
		return apperror.BadRequest("Invalid display name", map[string]interface{}{
			"field": "displayName",
		})
	}

	if requireUsername || strings.TrimSpace(req.Username) != "" {
		if err := validation.ValidateUsername(req.Username); err != nil {
			return apperror.BadRequest("Invalid username", map[string]interface{}{
				"field": "username",
			})
		}
	}

	if strings.TrimSpace(req.Email) != "" {
		if err := validation.ValidateEmail(req.Email); err != nil {
			return apperror.BadRequest("Invalid email", map[string]interface{}{
				"field": "email",
			})
		}
	}

	// Validate password
	if err := validation.ValidatePassword(req.Password); err != nil {
		return apperror.BadRequest("Invalid password", map[string]interface{}{
			"field": "password",
		})
	}

	return nil
}
