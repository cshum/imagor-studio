package resolver

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/internal/auth"
	validation2 "github.com/cshum/imagor-studio/server/internal/validation"
	"go.uber.org/zap"
)

// Me returns the current authenticated user
func (r *queryResolver) Me(ctx context.Context) (*gql.User, error) {
	ownerID, err := GetUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	// Handle guest users - they don't exist in the database
	if IsGuestUser(ctx) {
		return &gql.User{
			ID:          ownerID,
			DisplayName: "guest",
			Email:       "guest@temporary.local",
			Role:        "guest",
			IsActive:    true,
			CreatedAt:   time.Now().Format(time.RFC3339), // Use current time for guests
			UpdatedAt:   time.Now().Format(time.RFC3339),
		}, nil
	}

	// For regular users, get from database
	user, err := r.userStore.GetByID(ctx, ownerID)
	if err != nil {
		r.logger.Error("Failed to get current user", zap.Error(err), zap.String("userID", ownerID))
		return nil, fmt.Errorf("failed to get user information")
	}

	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	return &gql.User{
		ID:          user.ID,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		Role:        user.Role,
		IsActive:    user.IsActive,
		CreatedAt:   user.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   user.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// User returns a user by ID (admin only)
func (r *queryResolver) User(ctx context.Context, id string) (*gql.User, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	user, err := r.userStore.GetByID(ctx, id)
	if err != nil {
		r.logger.Error("Failed to get user by ID", zap.Error(err), zap.String("userID", id))
		return nil, fmt.Errorf("failed to get user information")
	}

	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	return &gql.User{
		ID:          user.ID,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		Role:        user.Role,
		IsActive:    user.IsActive,
		CreatedAt:   user.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   user.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// Users returns a list of users (admin only)
func (r *queryResolver) Users(ctx context.Context, offset *int, limit *int) (*gql.UserList, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	// Handle default values for nullable parameters
	offsetVal := 0
	if offset != nil {
		offsetVal = *offset
	}

	limitVal := 20
	if limit != nil {
		limitVal = *limit
	}

	// Validate parameters
	if offsetVal < 0 {
		offsetVal = 0
	}
	if limitVal <= 0 || limitVal > 100 {
		limitVal = 20
	}

	users, totalCount, err := r.userStore.List(ctx, offsetVal, limitVal)
	if err != nil {
		r.logger.Error("Failed to list users", zap.Error(err))
		return nil, fmt.Errorf("failed to list users")
	}

	gqlUsers := make([]*gql.User, len(users))
	for i, user := range users {
		gqlUsers[i] = &gql.User{
			ID:          user.ID,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Role:        user.Role,
			IsActive:    user.IsActive,
			CreatedAt:   user.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   user.UpdatedAt.Format(time.RFC3339),
		}
	}

	return &gql.UserList{
		Items:      gqlUsers,
		TotalCount: totalCount,
	}, nil
}

// UpdateProfile updates a user's profile (self or admin operation)
func (r *mutationResolver) UpdateProfile(ctx context.Context, input gql.UpdateProfileInput, userID *string) (*gql.User, error) {
	targetUserID, err := GetEffectiveTargetUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get current user
	currentUser, err := r.userStore.GetByID(ctx, targetUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if currentUser == nil {
		return nil, fmt.Errorf("user not found")
	}

	// Update fields if provided
	if input.DisplayName != nil && strings.TrimSpace(*input.DisplayName) != "" {
		displayName := strings.TrimSpace(*input.DisplayName)

		// Use validation package
		if err := validation2.ValidateDisplayName(displayName); err != nil {
			return nil, fmt.Errorf("invalid display name: %w", err)
		}

		// Normalize displayName
		normalizedDisplayName := validation2.NormalizeDisplayName(displayName)

		err = r.userStore.UpdateDisplayName(ctx, targetUserID, normalizedDisplayName)
		if err != nil {
			return nil, fmt.Errorf("failed to update display name: %w", err)
		}
	}

	if input.Email != nil && strings.TrimSpace(*input.Email) != "" {
		email := strings.TrimSpace(*input.Email)

		// Use validation package
		if !validation2.IsValidEmailRequired(email) {
			return nil, fmt.Errorf("invalid email format")
		}

		// Normalize email
		normalizedEmail := validation2.NormalizeEmail(email)

		err = r.userStore.UpdateEmail(ctx, targetUserID, normalizedEmail)
		if err != nil {
			return nil, fmt.Errorf("failed to update email: %w", err)
		}
	}

	// Get updated user
	updatedUser, err := r.userStore.GetByID(ctx, targetUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated user: %w", err)
	}

	return &gql.User{
		ID:          updatedUser.ID,
		DisplayName: updatedUser.DisplayName,
		Email:       updatedUser.Email,
		Role:        updatedUser.Role,
		IsActive:    updatedUser.IsActive,
		CreatedAt:   updatedUser.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   updatedUser.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// ChangePassword changes a user's password (self or admin operation)
func (r *mutationResolver) ChangePassword(ctx context.Context, input gql.ChangePasswordInput, userID *string) (bool, error) {
	isAdminOperation := userID != nil
	targetUserID, err := GetEffectiveTargetUserID(ctx, userID)
	if err != nil {
		return false, err
	}

	// Use validation package for new password
	if err := validation2.ValidatePassword(input.NewPassword); err != nil {
		return false, fmt.Errorf("invalid new password: %w", err)
	}

	// Get current user with password
	currentUser, err := r.userStore.GetByIDWithPassword(ctx, targetUserID)
	if err != nil {
		return false, fmt.Errorf("failed to get user: %w", err)
	}

	if currentUser == nil {
		return false, fmt.Errorf("user not found")
	}

	// Verify current password (only required for self-operation)
	if !isAdminOperation {
		if input.CurrentPassword == nil || *input.CurrentPassword == "" {
			return false, fmt.Errorf("current password is required")
		}
		if err := auth.CheckPassword(currentUser.HashedPassword, *input.CurrentPassword); err != nil {
			return false, fmt.Errorf("current password is incorrect")
		}
	}

	// Hash new password
	hashedNewPassword, err := auth.HashPassword(input.NewPassword)
	if err != nil {
		return false, fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update password
	if err := r.userStore.UpdatePassword(ctx, targetUserID, hashedNewPassword); err != nil {
		return false, fmt.Errorf("failed to update password: %w", err)
	}

	return true, nil
}

// DeactivateAccount deactivates a user's account (self or admin operation)
func (r *mutationResolver) DeactivateAccount(ctx context.Context, userID *string) (bool, error) {
	targetUserID, err := GetEffectiveTargetUserID(ctx, userID)
	if err != nil {
		return false, err
	}
	currentUserID, err := GetUserIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to get current user ID: %w", err)
	}
	isAdminOperation := userID != nil

	if isAdminOperation && targetUserID == currentUserID {
		return false, fmt.Errorf("use self-deactivation (no userID parameter) to deactivate your own account")
	}

	// Check if target user exists
	targetUser, err := r.userStore.GetByID(ctx, targetUserID)
	if err != nil {
		return false, fmt.Errorf("failed to get target user: %w", err)
	}
	if targetUser == nil {
		return false, fmt.Errorf("target user not found")
	}

	if err := r.userStore.SetActive(ctx, targetUserID, false); err != nil {
		return false, fmt.Errorf("failed to deactivate account: %w", err)
	}

	r.logger.Info("Account deactivated",
		zap.String("targetUserID", targetUserID),
		zap.String("deactivatedByUserID", currentUserID),
		zap.Bool("isAdminOperation", userID != nil))

	return true, nil
}

// CreateUser creates a new user (admin only)
func (r *mutationResolver) CreateUser(ctx context.Context, input gql.CreateUserInput) (*gql.User, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	// Get current admin user ID for logging
	currentUserID, err := GetUserIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get current user ID: %w", err)
	}

	// Validate input
	if err := r.validateCreateUserInput(&input); err != nil {
		return nil, err
	}

	// Normalize inputs
	normalizedDisplayName := validation2.NormalizeDisplayName(input.DisplayName)
	normalizedEmail := validation2.NormalizeEmail(input.Email)
	normalizedRole := strings.TrimSpace(input.Role)

	// Validate role
	if !r.isValidRole(normalizedRole) {
		return nil, fmt.Errorf("invalid role: %s (valid roles: user, admin)", normalizedRole)
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(input.Password)
	if err != nil {
		r.logger.Error("Failed to hash password for new user", zap.Error(err))
		return nil, fmt.Errorf("failed to process password")
	}

	// Create user
	user, err := r.userStore.Create(ctx, normalizedDisplayName, normalizedEmail, hashedPassword, normalizedRole)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			return nil, fmt.Errorf("user creation failed: %w", err)
		}
		r.logger.Error("Failed to create user", zap.Error(err))
		return nil, fmt.Errorf("failed to create user")
	}

	r.logger.Info("User created by admin",
		zap.String("newUserID", user.ID),
		zap.String("newDisplayName", user.DisplayName),
		zap.String("newUserRole", user.Role),
		zap.String("createdByAdminID", currentUserID))

	return &gql.User{
		ID:          user.ID,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		Role:        user.Role,
		IsActive:    user.IsActive,
		CreatedAt:   user.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   user.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// Helper function to validate CreateUserInput
func (r *mutationResolver) validateCreateUserInput(input *gql.CreateUserInput) error {
	// Validate displayName
	if err := validation2.ValidateDisplayName(input.DisplayName); err != nil {
		return fmt.Errorf("invalid display name: %w", err)
	}

	// Validate email
	if !validation2.IsValidEmailRequired(input.Email) {
		return fmt.Errorf("invalid email format")
	}

	// Validate password
	if err := validation2.ValidatePassword(input.Password); err != nil {
		return fmt.Errorf("invalid password: %w", err)
	}

	// Validate role (if provided)
	role := strings.TrimSpace(input.Role)
	if role == "" {
		return fmt.Errorf("role cannot be empty")
	}

	return nil
}

// Helper function to check if role is valid
func (r *mutationResolver) isValidRole(role string) bool {
	validRoles := []string{"user", "admin"}
	for _, validRole := range validRoles {
		if role == validRole {
			return true
		}
	}
	return false
}
