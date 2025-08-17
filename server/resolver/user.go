package resolver

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/validation"
	"go.uber.org/zap"
)

// Me returns the current authenticated user
func (r *queryResolver) Me(ctx context.Context) (*gql.User, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	user, err := r.userStore.GetByID(ctx, ownerID)
	if err != nil {
		r.logger.Error("Failed to get current user", zap.Error(err), zap.String("userID", ownerID))
		return nil, fmt.Errorf("failed to get user information")
	}

	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	return &gql.User{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Role:      user.Role,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
		UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// User returns a user by ID (admin only)
func (r *queryResolver) User(ctx context.Context, id string) (*gql.User, error) {
	// Check if the current user has admin privileges
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	hasAdminScope := false
	for _, scope := range claims.Scopes {
		if scope == "admin" {
			hasAdminScope = true
			break
		}
	}

	if !hasAdminScope {
		return nil, fmt.Errorf("insufficient permissions: admin access required")
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
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Role:      user.Role,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
		UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// Users returns a list of users (admin only)
func (r *queryResolver) Users(ctx context.Context, offset *int, limit *int) (*gql.UserList, error) {
	// Check if the current user has admin privileges
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("unauthorized")
	}

	hasAdminScope := false
	for _, scope := range claims.Scopes {
		if scope == "admin" {
			hasAdminScope = true
			break
		}
	}

	if !hasAdminScope {
		return nil, fmt.Errorf("insufficient permissions: admin access required")
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
			ID:        user.ID,
			Username:  user.Username,
			Email:     user.Email,
			Role:      user.Role,
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt.Format(time.RFC3339),
			UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
		}
	}

	return &gql.UserList{
		Items:      gqlUsers,
		TotalCount: totalCount,
	}, nil
}

// UpdateProfile updates a user's profile (self or admin operation)
func (r *mutationResolver) UpdateProfile(ctx context.Context, input gql.UpdateProfileInput, userID *string) (*gql.User, error) {
	currentUserID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get current user ID: %w", err)
	}

	// Determine target user ID and check permissions
	targetUserID := currentUserID // Default to self
	if userID != nil {
		// Admin operation - check permissions
		if err := r.requireAdminPermission(ctx); err != nil {
			return nil, err
		}
		targetUserID = *userID
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
	if input.Username != nil && strings.TrimSpace(*input.Username) != "" {
		username := strings.TrimSpace(*input.Username)

		// Use validation package
		if err := validation.ValidateUsername(username); err != nil {
			return nil, fmt.Errorf("invalid username: %w", err)
		}

		// Normalize username
		normalizedUsername := validation.NormalizeUsername(username)

		err = r.userStore.UpdateUsername(ctx, targetUserID, normalizedUsername)
		if err != nil {
			return nil, fmt.Errorf("failed to update username: %w", err)
		}
	}

	if input.Email != nil && strings.TrimSpace(*input.Email) != "" {
		email := strings.TrimSpace(*input.Email)

		// Use validation package
		if !validation.IsValidEmailRequired(email) {
			return nil, fmt.Errorf("invalid email format")
		}

		// Normalize email
		normalizedEmail := validation.NormalizeEmail(email)

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

	r.logger.Info("User profile updated",
		zap.String("targetUserID", targetUserID),
		zap.String("updatedByUserID", currentUserID),
		zap.Bool("isAdminOperation", userID != nil))

	return &gql.User{
		ID:        updatedUser.ID,
		Username:  updatedUser.Username,
		Email:     updatedUser.Email,
		Role:      updatedUser.Role,
		IsActive:  updatedUser.IsActive,
		CreatedAt: updatedUser.CreatedAt.Format(time.RFC3339),
		UpdatedAt: updatedUser.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// ChangePassword changes a user's password (self or admin operation)
func (r *mutationResolver) ChangePassword(ctx context.Context, input gql.ChangePasswordInput, userID *string) (bool, error) {
	currentUserID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to get current user ID: %w", err)
	}

	// Determine target user ID and check permissions
	targetUserID := currentUserID // Default to self
	isAdminOperation := userID != nil
	if isAdminOperation {
		// Admin operation - check permissions
		if err := r.requireAdminPermission(ctx); err != nil {
			return false, err
		}
		targetUserID = *userID
	}

	// Use validation package for new password
	if err := validation.ValidatePassword(input.NewPassword); err != nil {
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
	} else {
		// Admin operation - log the override
		r.logger.Warn("Admin password change without current password verification",
			zap.String("targetUserID", targetUserID),
			zap.String("adminUserID", currentUserID))
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

	r.logger.Info("Password changed",
		zap.String("targetUserID", targetUserID),
		zap.String("changedByUserID", currentUserID),
		zap.Bool("isAdminOperation", isAdminOperation))

	return true, nil
}

// DeactivateAccount deactivates a user's account (self or admin operation)
func (r *mutationResolver) DeactivateAccount(ctx context.Context, userID *string) (bool, error) {
	currentUserID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to get current user ID: %w", err)
	}

	// Determine target user ID and check permissions
	targetUserID := currentUserID // Default to self
	if userID != nil {
		// Admin operation - check permissions
		if err := r.requireAdminPermission(ctx); err != nil {
			return false, err
		}
		targetUserID = *userID

		// Prevent admin from deactivating themselves through this method
		if targetUserID == currentUserID {
			return false, fmt.Errorf("use self-deactivation (no userID parameter) to deactivate your own account")
		}
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
