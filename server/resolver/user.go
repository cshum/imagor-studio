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

// UpdateProfile updates the current user's profile
func (r *mutationResolver) UpdateProfile(ctx context.Context, input gql.UpdateProfileInput) (*gql.User, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	// Get current user
	currentUser, err := r.userStore.GetByID(ctx, ownerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current user: %w", err)
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

		err = r.userStore.UpdateUsername(ctx, ownerID, normalizedUsername)
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

		err = r.userStore.UpdateEmail(ctx, ownerID, normalizedEmail)
		if err != nil {
			return nil, fmt.Errorf("failed to update email: %w", err)
		}
	}

	// Get updated user
	updatedUser, err := r.userStore.GetByID(ctx, ownerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated user: %w", err)
	}

	r.logger.Info("User updated profile", zap.String("userID", ownerID))

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

// ChangePassword changes the current user's password
func (r *mutationResolver) ChangePassword(ctx context.Context, input gql.ChangePasswordInput) (bool, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to get owner ID: %w", err)
	}

	// Use validation package for new password
	if err := validation.ValidatePassword(input.NewPassword); err != nil {
		return false, fmt.Errorf("invalid new password: %w", err)
	}

	// Get current user with password
	currentUser, err := r.userStore.GetByIDWithPassword(ctx, ownerID)
	if err != nil {
		return false, fmt.Errorf("failed to get current user: %w", err)
	}

	if currentUser == nil {
		return false, fmt.Errorf("user not found")
	}

	// Verify current password
	if err := auth.CheckPassword(currentUser.HashedPassword, input.CurrentPassword); err != nil {
		return false, fmt.Errorf("current password is incorrect")
	}

	// Hash new password
	hashedNewPassword, err := auth.HashPassword(input.NewPassword)
	if err != nil {
		return false, fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update password
	if err := r.userStore.UpdatePassword(ctx, ownerID, hashedNewPassword); err != nil {
		return false, fmt.Errorf("failed to update password: %w", err)
	}

	r.logger.Info("User changed password", zap.String("userID", ownerID))
	return true, nil
}

// DeactivateAccount deactivates the current user's account
func (r *mutationResolver) DeactivateAccount(ctx context.Context) (bool, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to get owner ID: %w", err)
	}

	if err := r.userStore.SetActive(ctx, ownerID, false); err != nil {
		return false, fmt.Errorf("failed to deactivate account: %w", err)
	}

	r.logger.Info("User deactivated account", zap.String("userID", ownerID))
	return true, nil
}
