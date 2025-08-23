package firstrun

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/userstore"
	"go.uber.org/zap"
)

func EnsureAdminUser(ctx context.Context, cfg *config.Config, userStore userstore.Store) error {
	if !cfg.CreateAdminOnFirstRun {
		cfg.Logger.Info("Admin user creation on first run is disabled")
		return nil
	}

	// Check if any users exist
	_, totalCount, err := userStore.List(ctx, 0, 1)
	if err != nil {
		return fmt.Errorf("failed to check existing users: %w", err)
	}

	if totalCount > 0 {
		cfg.Logger.Info("Users already exist, skipping admin creation", zap.Int("userCount", totalCount))
		return nil
	}

	// No users exist, create default admin
	adminPassword := cfg.DefaultAdminPassword
	if adminPassword == "" {
		// Generate random password if none provided
		adminPassword = generateRandomPassword(16)
		cfg.Logger.Warn("Generated random admin password",
			zap.String("password", adminPassword),
			zap.String("username", cfg.DefaultAdminUsername))
	}

	// Hash the password
	hashedPassword, err := auth.HashPassword(adminPassword)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	// Create admin user
	adminUser, err := userStore.Create(ctx,
		cfg.DefaultAdminUsername,
		cfg.DefaultAdminEmail,
		hashedPassword,
		"admin")
	if err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	cfg.Logger.Info("Default admin user created successfully",
		zap.String("userID", adminUser.ID),
		zap.String("username", adminUser.Username),
		zap.String("email", adminUser.Email))

	// Print credentials to console for first-time setup
	fmt.Printf("\n" + strings.Repeat("=", 60) + "\n")
	fmt.Printf("🎉 FIRST RUN: Default admin user created!\n")
	fmt.Printf("Username: %s\n", cfg.DefaultAdminUsername)
	fmt.Printf("Email: %s\n", cfg.DefaultAdminEmail)
	fmt.Printf("Password: %s\n", adminPassword)
	fmt.Printf("⚠️  Please change the password after first login!\n")
	fmt.Printf(strings.Repeat("=", 60) + "\n\n")

	return nil
}

// Helper function to generate random password
func generateRandomPassword(length int) string {
	bytes := make([]byte, length/2)
	if _, err := rand.Read(bytes); err != nil {
		return "changeme123" // fallback
	}
	return hex.EncodeToString(bytes)
}
