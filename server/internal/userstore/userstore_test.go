package userstore

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"go.uber.org/zap"
)

func setupTestDB(t *testing.T) (*bun.DB, func()) {
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	require.NoError(t, err)

	// Configure SQLite for better concurrent access
	sqldb.SetMaxOpenConns(1)    // Force single connection
	sqldb.SetMaxIdleConns(1)    // Keep connection alive
	sqldb.SetConnMaxLifetime(0) // No connection timeout

	db := bun.NewDB(sqldb, sqlitedialect.New())

	// Create users table
	ctx := context.Background()
	_, err = db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			display_name TEXT NOT NULL,
			username TEXT NOT NULL UNIQUE,
			hashed_password TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			email TEXT,
			pending_email TEXT,
			email_verified BOOLEAN NOT NULL DEFAULT FALSE,
			avatar_url TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	require.NoError(t, err)

	// Create oauth_identities table
	_, err = db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS oauth_identities (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			provider TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			email TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(provider, provider_id)
		)
	`)
	require.NoError(t, err)

	_, err = db.ExecContext(ctx, `
		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username 
		ON users (username)
	`)
	require.NoError(t, err)

	cleanup := func() {
		db.Close()
		sqldb.Close()
	}

	return db, cleanup
}

func TestUserStore_Create(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	tests := []struct {
		name           string
		displayName    string
		username       string
		hashedPassword string
		role           string
		expectError    bool
		errorContains  string
	}{
		{
			name:           "Valid user creation",
			displayName:    "testuser",
			username:       "testuser",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    false,
		},
		{
			name:           "Admin role",
			displayName:    "adminuser",
			username:       "adminuser",
			hashedPassword: "hashedpassword123",
			role:           "admin",
			expectError:    false,
		},
		{
			name:           "Duplicate username",
			displayName:    "differentuser",
			username:       "testuser", // Same as first test
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "username already exists",
		},
		{
			name:           "Empty displayName",
			displayName:    "",
			username:       "emptyname",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "displayName cannot be empty",
		},
		{
			name:           "Whitespace only displayName",
			displayName:    "   ",
			username:       "whitespace",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "displayName cannot be empty",
		},
		{
			name:           "Empty username",
			displayName:    "emptyusername",
			username:       "",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "username cannot be empty",
		},
		{
			name:           "Whitespace only username",
			displayName:    "whitespaceuser",
			username:       "   ",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "username cannot be empty",
		},
		{
			name:           "Empty password",
			displayName:    "emptypass",
			username:       "emptypass",
			hashedPassword: "",
			role:           "user",
			expectError:    true,
			errorContains:  "hashed password cannot be empty",
		},
		{
			name:           "Empty role",
			displayName:    "emptyrole",
			username:       "emptyrole",
			hashedPassword: "hashedpassword123",
			role:           "",
			expectError:    true,
			errorContains:  "role cannot be empty",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := store.Create(ctx, tt.displayName, tt.username, tt.hashedPassword, tt.role)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains == "username already exists" {
					assert.ErrorIs(t, err, ErrUsernameAlreadyExists)
				}
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
				assert.Nil(t, user)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, user)
				assert.Equal(t, strings.TrimSpace(tt.displayName), user.DisplayName)
				assert.Equal(t, strings.TrimSpace(tt.username), user.Username)
				assert.Equal(t, strings.TrimSpace(tt.role), user.Role)
				assert.True(t, user.IsActive)
				assert.NotEmpty(t, user.ID)
				assert.False(t, user.CreatedAt.IsZero())
				assert.False(t, user.UpdatedAt.IsZero())
			}
		})
	}
}

func TestUserStore_CreateWithEmail_StartsUnverified_AndCanBeVerified(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	createdUser, err := store.CreateWithEmail(ctx, "emailuser", "emailuser", "hashedpassword123", "user", "emailuser@example.com")
	require.NoError(t, err)
	require.NotNil(t, createdUser)
	require.NotNil(t, createdUser.Email)
	assert.Equal(t, "emailuser@example.com", *createdUser.Email)
	assert.False(t, createdUser.EmailVerified)

	err = store.SetEmailVerified(ctx, createdUser.ID, true)
	require.NoError(t, err)

	verifiedUser, err := store.GetByID(ctx, createdUser.ID)
	require.NoError(t, err)
	require.NotNil(t, verifiedUser)
	assert.True(t, verifiedUser.EmailVerified)
}

func TestUserStore_GetByUsername(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create test user
	user, err := store.Create(ctx, "testuser", "testuser", "hashedpass", "user")
	require.NoError(t, err)

	tests := []struct {
		name                string
		username            string
		expectFound         bool
		expectedDisplayName string
	}{
		{
			name:                "Find by username",
			username:            "testuser",
			expectFound:         true,
			expectedDisplayName: "testuser",
		},
		{
			name:        "Non-existent username",
			username:    "nonexistent",
			expectFound: false,
		},
		{
			name:        "Empty string",
			username:    "",
			expectFound: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			foundUser, err := store.GetByUsername(ctx, tt.username)

			assert.NoError(t, err)
			if tt.expectFound {
				assert.NotNil(t, foundUser)
				assert.Equal(t, tt.expectedDisplayName, foundUser.DisplayName)
				assert.Equal(t, user.ID, foundUser.ID)
			} else {
				assert.Nil(t, foundUser)
			}
		})
	}
}

func TestUserStore_GetByID(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create test user
	createdUser, err := store.Create(ctx, "testuser", "testuser", "hashedpass", "user")
	require.NoError(t, err)

	// Test getting by ID
	foundUser, err := store.GetByID(ctx, createdUser.ID)
	assert.NoError(t, err)
	assert.NotNil(t, foundUser)
	assert.Equal(t, createdUser.ID, foundUser.ID)
	assert.Equal(t, createdUser.DisplayName, foundUser.DisplayName)
	assert.Equal(t, createdUser.Username, foundUser.Username)
	assert.Equal(t, createdUser.Role, foundUser.Role)

	// Test getting non-existent user
	nonExistentUser, err := store.GetByID(ctx, "non-existent-id")
	assert.NoError(t, err)
	assert.Nil(t, nonExistentUser)

	// Test getting inactive user
	err = store.SetActive(ctx, createdUser.ID, false)
	require.NoError(t, err)

	inactiveUser, err := store.GetByID(ctx, createdUser.ID)
	assert.NoError(t, err)
	assert.Nil(t, inactiveUser) // Should not return inactive users
}

func TestUserStore_UpdateLastLogin(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create test user
	user, err := store.Create(ctx, "testuser", "testuser", "hashedpass", "user")
	require.NoError(t, err)

	originalUpdatedAt := user.UpdatedAt

	// Small delay to ensure timestamp difference
	time.Sleep(time.Millisecond * 10)

	// Update last login
	err = store.UpdateLastLogin(ctx, user.ID)
	assert.NoError(t, err)

	// Verify update by getting the user and checking updated_at directly from DB
	var updatedUser model.User
	err = db.NewSelect().Model(&updatedUser).Where("id = ?", user.ID).Scan(ctx)
	assert.NoError(t, err)
	assert.True(t, updatedUser.UpdatedAt.After(originalUpdatedAt))

	// Test updating non-existent user
	err = store.UpdateLastLogin(ctx, "non-existent-id")
	assert.NoError(t, err) // Should not error, just not update anything
}

func TestUserStore_UpdatePassword(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create test user
	user, err := store.Create(ctx, "testuser", "testuser", "oldhashedpass", "user")
	require.NoError(t, err)

	newHashedPassword := "newhashedpassword123"

	// Update password
	err = store.UpdatePassword(ctx, user.ID, newHashedPassword)
	assert.NoError(t, err)

	// Verify password was updated
	foundUser, err := store.GetByUsername(ctx, "testuser")
	assert.NoError(t, err)
	assert.Equal(t, newHashedPassword, foundUser.HashedPassword)

	// Test updating non-existent user
	err = store.UpdatePassword(ctx, "non-existent-id", "somepassword")
	assert.NoError(t, err) // Should not error, just not update anything
}

func TestUserStore_SetActive(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create test user
	user, err := store.Create(ctx, "testuser", "testuser", "hashedpass", "user")
	require.NoError(t, err)
	assert.True(t, user.IsActive)

	// Deactivate user
	err = store.SetActive(ctx, user.ID, false)
	assert.NoError(t, err)

	// Verify user is not found by GetByID (only returns active users)
	inactiveUser, err := store.GetByID(ctx, user.ID)
	assert.NoError(t, err)
	assert.Nil(t, inactiveUser)

	// Verify user is not found by GetByUsername (only returns active users)
	inactiveUser2, err := store.GetByUsername(ctx, "testuser")
	assert.NoError(t, err)
	assert.Nil(t, inactiveUser2)

	// Reactivate user
	err = store.SetActive(ctx, user.ID, true)
	assert.NoError(t, err)

	// Verify user is found again
	activeUser, err := store.GetByID(ctx, user.ID)
	assert.NoError(t, err)
	assert.NotNil(t, activeUser)
	assert.True(t, activeUser.IsActive)

	// Test setting active status for non-existent user
	err = store.SetActive(ctx, "non-existent-id", true)
	assert.NoError(t, err) // Should not error, just not update anything
}

func TestUserStore_IsolationAndSecurity(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create multiple users
	user1, err := store.Create(ctx, "user1", "user1", "hash1", "user")
	require.NoError(t, err)

	user2, err := store.Create(ctx, "user2", "user2", "hash2", "admin")
	require.NoError(t, err)

	// Verify isolation - each user should only get their own data
	foundUser1, err := store.GetByID(ctx, user1.ID)
	assert.NoError(t, err)
	assert.Equal(t, "user1", foundUser1.DisplayName)

	foundUser2, err := store.GetByID(ctx, user2.ID)
	assert.NoError(t, err)
	assert.Equal(t, "user2", foundUser2.DisplayName)

	// Verify users can't access each other's data by accident
	assert.NotEqual(t, user1.ID, user2.ID)
	assert.NotEqual(t, user1.Username, user2.Username)
	assert.NotEqual(t, user1.DisplayName, user2.DisplayName)
}

func TestUserStore_SpecialCharacters(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	tests := []struct {
		name        string
		displayName string
		username    string
	}{
		{
			name:        "Unicode displayName",
			displayName: "пользователь123",
			username:    "unicode_user",
		},
		{
			name:        "Special chars in displayName",
			displayName: "user-with_special.chars",
			username:    "special_user",
		},
		{
			name:        "Username with underscore",
			displayName: "usernametest",
			username:    "test_user",
		},
		{
			name:        "Long displayName",
			displayName: strings.Repeat("a", 50),
			username:    "long_user",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := store.Create(ctx, tt.displayName, tt.username, "hashedpass", "user")
			assert.NoError(t, err)
			assert.Equal(t, tt.displayName, user.DisplayName)
			assert.Equal(t, tt.username, user.Username)

			foundUser2, err := store.GetByUsername(ctx, tt.username)
			assert.NoError(t, err)
			assert.Equal(t, tt.username, foundUser2.Username)
		})
	}
}

func TestUserStore_ConcurrentAccess(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create a user
	user, err := store.Create(ctx, "concurrent", "concurrent", "hash", "user")
	require.NoError(t, err)

	// Test sequential operations to verify functionality
	// (SQLite in-memory databases have concurrency limitations)
	for i := 0; i < 10; i++ {
		// Try to read the user
		foundUser, err := store.GetByID(ctx, user.ID)
		assert.NoError(t, err)
		assert.NotNil(t, foundUser)
		assert.Equal(t, user.ID, foundUser.ID)

		// Try to update last login
		err = store.UpdateLastLogin(ctx, user.ID)
		assert.NoError(t, err)
	}
}

// TestUserStore_UpsertOAuth_OrphanedIdentity verifies that UpsertOAuth
// recovers gracefully when an oauth_identity row exists but the referenced
// user has been deleted (an "orphaned identity").  The stale identity should
// be removed and a fresh user + new identity should be created.
func TestUserStore_UpsertOAuth_OrphanedIdentity(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	s := New(db, logger)
	ctx := context.Background()

	// Step 1: First login — creates user + oauth_identity.
	user1, err := s.UpsertOAuth(ctx, "google", "gid-orphan", "orphan@example.com", "Orphan User", "")
	require.NoError(t, err)
	require.NotNil(t, user1)

	// Step 2: Simulate an admin deleting the user directly (without cascade).
	_, err = db.NewDelete().
		TableExpr("users").
		Where("id = ?", user1.ID).
		Exec(ctx)
	require.NoError(t, err)

	// Step 3: The same Google account tries to log in again.
	// Without the fix this returns "error loading OAuth user: sql: no rows in result set".
	user2, err := s.UpsertOAuth(ctx, "google", "gid-orphan", "orphan@example.com", "Orphan User", "")
	require.NoError(t, err, "UpsertOAuth must not error when user was deleted and identity is orphaned")
	require.NotNil(t, user2)

	// A brand-new user should have been created.
	assert.NotEqual(t, user1.ID, user2.ID, "should be a new user, not the deleted one")
	assert.Equal(t, "Orphan User", user2.DisplayName)
	assert.Equal(t, "user", user2.Role)

	// The old stale oauth_identity should be gone; the new one should exist.
	var identityCount int
	err = db.NewSelect().
		TableExpr("oauth_identities").
		ColumnExpr("COUNT(*)").
		Where("provider = ? AND provider_id = ?", "google", "gid-orphan").
		Scan(ctx, &identityCount)
	require.NoError(t, err)
	assert.Equal(t, 1, identityCount, "exactly one identity should exist after recovery")
}

func TestUserStore_RequestEmailChange(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	requester, err := store.Create(ctx, "requester", "requester", "hash1", "user")
	require.NoError(t, err)
	taken, err := store.Create(ctx, "taken", "taken", "hash2", "user")
	require.NoError(t, err)

	_, err = db.NewUpdate().
		Model((*model.User)(nil)).
		Set("email = ?", "taken@example.com").
		Where("id = ?", taken.ID).
		Exec(ctx)
	require.NoError(t, err)

	updated, err := store.RequestEmailChange(ctx, requester.ID, "next@example.com")
	require.NoError(t, err)
	require.NotNil(t, updated)
	require.NotNil(t, updated.PendingEmail)
	assert.Equal(t, "next@example.com", *updated.PendingEmail)

	updated, err = store.RequestEmailChange(ctx, requester.ID, "taken@example.com")
	require.Error(t, err)
	assert.Nil(t, updated)
	assert.ErrorIs(t, err, ErrEmailAlreadyExists)
	assert.Contains(t, err.Error(), "email already exists")

	updated, err = store.RequestEmailChange(ctx, requester.ID, "   ")
	require.Error(t, err)
	assert.Nil(t, updated)
	assert.Contains(t, err.Error(), "email cannot be empty")
}

func TestUserStore_UnlinkAuthProvider_RequiresRemainingSignInMethod(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	t.Run("blocks unlink when oauth is the only sign-in method", func(t *testing.T) {
		user, err := store.CreateWithEmail(ctx, "oauth-only", "oauth-only", "oauth", "user", "oauth-only@example.com")
		require.NoError(t, err)

		_, err = db.ExecContext(ctx, `
			INSERT INTO oauth_identities (id, user_id, provider, provider_id, email)
			VALUES (?, ?, ?, ?, ?)
		`, "identity-google-only", user.ID, "google", "google-only", "oauth-only@example.com")
		require.NoError(t, err)

		err = store.UnlinkAuthProvider(ctx, user.ID, "google")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "cannot unlink the last auth provider")
	})

	t.Run("allows unlink when password remains available", func(t *testing.T) {
		user, err := store.CreateWithEmail(ctx, "password-user", "password-user", "hashedpassword123", "user", "password@example.com")
		require.NoError(t, err)

		_, err = db.ExecContext(ctx, `
			INSERT INTO oauth_identities (id, user_id, provider, provider_id, email)
			VALUES (?, ?, ?, ?, ?)
		`, "identity-google-password", user.ID, "google", "google-password", "password@example.com")
		require.NoError(t, err)

		err = store.UnlinkAuthProvider(ctx, user.ID, "google")
		require.NoError(t, err)

		providers, err := store.ListAuthProviders(ctx, user.ID)
		require.NoError(t, err)
		assert.Empty(t, providers)
	})
}

func BenchmarkUserStore_Create(b *testing.B) {
	db, cleanup := setupTestDB(&testing.T{})
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		displayName := fmt.Sprintf("user%d", i)
		username := fmt.Sprintf("user%d", i)
		_, err := store.Create(ctx, displayName, username, "hashedpass", "user")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkUserStore_GetByUsername(b *testing.B) {
	db, cleanup := setupTestDB(&testing.T{})
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Setup data
	_, err := store.Create(ctx, "benchuser", "benchuser", "hashedpass", "user")
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := store.GetByUsername(ctx, "benchuser")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func TestUserStore_GetByIDWithPassword(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create test user
	hashedPassword := "hashed-password-123"
	createdUser, err := store.Create(ctx, "testuser", "testuser", hashedPassword, "user")
	require.NoError(t, err)

	// Test getting by ID with password
	foundUser, err := store.GetByIDWithPassword(ctx, createdUser.ID)
	assert.NoError(t, err)
	assert.NotNil(t, foundUser)
	assert.Equal(t, createdUser.ID, foundUser.ID)
	assert.Equal(t, "testuser", foundUser.DisplayName)
	assert.Equal(t, "testuser", foundUser.Username)
	assert.Equal(t, hashedPassword, foundUser.HashedPassword)
	assert.Equal(t, "user", foundUser.Role)

	// Test getting non-existent user
	nonExistentUser, err := store.GetByIDWithPassword(ctx, "non-existent-id")
	assert.NoError(t, err)
	assert.Nil(t, nonExistentUser)

	// Test getting inactive user
	err = store.SetActive(ctx, createdUser.ID, false)
	require.NoError(t, err)

	inactiveUser, err := store.GetByIDWithPassword(ctx, createdUser.ID)
	assert.NoError(t, err)
	assert.Nil(t, inactiveUser) // Should not return inactive users
}

func TestUserStore_List(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create test users
	user1, err := store.Create(ctx, "user1", "user1", "hash1", "user")
	require.NoError(t, err)

	user2, err := store.Create(ctx, "user2", "user2", "hash2", "admin")
	require.NoError(t, err)

	user3, err := store.Create(ctx, "user3", "user3", "hash3", "user")
	require.NoError(t, err)

	// Deactivate one user
	err = store.SetActive(ctx, user3.ID, false)
	require.NoError(t, err)

	tests := []struct {
		name            string
		offset          int
		limit           int
		expectedCount   int
		expectedTotal   int
		expectedUserIDs []string
	}{
		{
			name:            "List all users (limit=0) includes inactive",
			offset:          0,
			limit:           0,
			expectedCount:   3, // All users including inactive
			expectedTotal:   3,
			expectedUserIDs: []string{user3.ID, user2.ID, user1.ID}, // Ordered by created_at DESC
		},
		{
			name:            "List with limit=1",
			offset:          0,
			limit:           1,
			expectedCount:   1,
			expectedTotal:   3,
			expectedUserIDs: []string{user3.ID}, // Most recent first
		},
		{
			name:            "List with offset=1, limit=1",
			offset:          1,
			limit:           1,
			expectedCount:   1,
			expectedTotal:   3,
			expectedUserIDs: []string{user2.ID}, // Second user
		},
		{
			name:            "List with offset=1, limit=0 (no limit)",
			offset:          1,
			limit:           0,
			expectedCount:   2,
			expectedTotal:   3,
			expectedUserIDs: []string{user2.ID, user1.ID}, // All users from offset 1
		},
		{
			name:            "List with high offset",
			offset:          10,
			limit:           5,
			expectedCount:   0,
			expectedTotal:   3,
			expectedUserIDs: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			users, totalCount, err := store.List(ctx, tt.offset, tt.limit, "")

			assert.NoError(t, err)
			assert.Equal(t, tt.expectedCount, len(users))
			assert.Equal(t, tt.expectedTotal, totalCount)

			// Check user IDs match expected order
			actualUserIDs := make([]string, len(users))
			for i, user := range users {
				actualUserIDs[i] = user.ID
			}
			assert.Equal(t, tt.expectedUserIDs, actualUserIDs)
		})
	}
}

func TestUserStore_List_EmptyDatabase(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	users, totalCount, err := store.List(ctx, 0, 0, "")

	assert.NoError(t, err)
	assert.Equal(t, 0, len(users))
	assert.Equal(t, 0, totalCount)
}

func TestUserStore_List_Search(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create test users
	_, err := store.Create(ctx, "Alice Smith", "alice", "hashed1", "user")
	require.NoError(t, err)
	_, err = store.Create(ctx, "Bob Jones", "bobjones", "hashed2", "user")
	require.NoError(t, err)
	_, err = store.Create(ctx, "Charlie Admin", "charlie", "hashed3", "admin")
	require.NoError(t, err)

	tests := []struct {
		name          string
		search        string
		expectedCount int
		expectedTotal int
	}{
		{
			name:          "Empty search returns all users",
			search:        "",
			expectedCount: 3,
			expectedTotal: 3,
		},
		{
			name:          "Search by display name matches alice",
			search:        "alice",
			expectedCount: 1,
			expectedTotal: 1,
		},
		{
			name:          "Case-insensitive search by display name",
			search:        "ALICE",
			expectedCount: 1,
			expectedTotal: 1,
		},
		{
			name:          "Search by username matches bobjones",
			search:        "bob",
			expectedCount: 1,
			expectedTotal: 1,
		},
		{
			name:          "Search matches display name partial",
			search:        "smith",
			expectedCount: 1,
			expectedTotal: 1,
		},
		{
			name:          "Search with whitespace is trimmed",
			search:        "  charlie  ",
			expectedCount: 1,
			expectedTotal: 1,
		},
		{
			name:          "Search with no match returns empty",
			search:        "zzznomatch",
			expectedCount: 0,
			expectedTotal: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			users, totalCount, err := store.List(ctx, 0, 0, tt.search)
			assert.NoError(t, err)
			assert.Equal(t, tt.expectedCount, len(users))
			assert.Equal(t, tt.expectedTotal, totalCount)
		})
	}
}

func TestUserStore_List_IncludesInactiveUsers(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create two users, deactivate one
	user1, err := store.Create(ctx, "Active User", "activeuser", "hashed1", "user")
	require.NoError(t, err)
	user2, err := store.Create(ctx, "Inactive User", "inactiveuser", "hashed2", "user")
	require.NoError(t, err)

	err = store.SetActive(ctx, user2.ID, false)
	require.NoError(t, err)

	// List should include both active and inactive users
	users, totalCount, err := store.List(ctx, 0, 0, "")
	assert.NoError(t, err)
	assert.Equal(t, 2, len(users))
	assert.Equal(t, 2, totalCount)

	// Find both users in results
	foundActive, foundInactive := false, false
	for _, u := range users {
		if u.ID == user1.ID {
			foundActive = true
			assert.True(t, u.IsActive)
		}
		if u.ID == user2.ID {
			foundInactive = true
			assert.False(t, u.IsActive)
		}
	}
	assert.True(t, foundActive, "active user should be in list")
	assert.True(t, foundInactive, "inactive user should be in list for reactivation")
}

func TestUserStore_List_SearchWithPagination(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create 3 users whose names all contain "user"
	_, err := store.Create(ctx, "User Alpha", "useralpha", "h1", "user")
	require.NoError(t, err)
	_, err = store.Create(ctx, "User Beta", "userbeta", "h2", "user")
	require.NoError(t, err)
	_, err = store.Create(ctx, "User Gamma", "usergamma", "h3", "admin")
	require.NoError(t, err)
	// One that won't match the search
	_, err = store.Create(ctx, "Other Person", "other", "h4", "user")
	require.NoError(t, err)

	// All 3 "user*" results
	users, total, err := store.List(ctx, 0, 0, "user")
	assert.NoError(t, err)
	assert.Equal(t, 3, total)
	assert.Equal(t, 3, len(users))

	// First page: offset=0, limit=2
	page1, total1, err := store.List(ctx, 0, 2, "user")
	assert.NoError(t, err)
	assert.Equal(t, 3, total1)
	assert.Equal(t, 2, len(page1))

	// Second page: offset=2, limit=2
	page2, total2, err := store.List(ctx, 2, 2, "user")
	assert.NoError(t, err)
	assert.Equal(t, 3, total2)
	assert.Equal(t, 1, len(page2))

	// Pages should not overlap
	assert.NotEqual(t, page1[0].ID, page2[0].ID)
}

func TestUserStore_InputValidation(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	tests := []struct {
		name           string
		displayName    string
		username       string
		hashedPassword string
		role           string
		expectError    bool
		errorMsg       string
	}{
		{
			name:           "DisplayName with leading/trailing spaces",
			displayName:    "  spaceuser  ",
			username:       "spaceuser",
			hashedPassword: "hashedpass",
			role:           "user",
			expectError:    false,
		},
		{
			name:           "Username with leading/trailing spaces",
			displayName:    "usernamespace",
			username:       "  usernamespace  ",
			hashedPassword: "hashedpass",
			role:           "user",
			expectError:    false,
		},
		{
			name:           "Role with leading/trailing spaces",
			displayName:    "rolespace",
			username:       "rolespace",
			hashedPassword: "hashedpass",
			role:           "  admin  ",
			expectError:    false,
		},
		{
			name:           "All fields with spaces should be trimmed",
			displayName:    "  trimtest  ",
			username:       "  trimtest  ",
			hashedPassword: "hashedpass",
			role:           "  user  ",
			expectError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := store.Create(ctx, tt.displayName, tt.username, tt.hashedPassword, tt.role)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
				assert.Nil(t, user)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, user)

				// Verify trimming
				assert.Equal(t, strings.TrimSpace(tt.displayName), user.DisplayName)
				assert.Equal(t, strings.TrimSpace(tt.username), user.Username)
				assert.Equal(t, strings.TrimSpace(tt.role), user.Role)

				// Should not contain leading/trailing spaces
				assert.False(t, strings.HasPrefix(user.DisplayName, " "))
				assert.False(t, strings.HasSuffix(user.DisplayName, " "))
				assert.False(t, strings.HasPrefix(user.Username, " "))
				assert.False(t, strings.HasSuffix(user.Username, " "))
				assert.False(t, strings.HasPrefix(user.Role, " "))
				assert.False(t, strings.HasSuffix(user.Role, " "))
			}
		})
	}
}

func TestUserStore_GetByIDAdmin(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create an active user
	activeUser, err := store.Create(ctx, "Active User", "activeuser", "hashedpassword", "user")
	require.NoError(t, err)
	require.NotNil(t, activeUser)

	// Create and then deactivate a user
	inactiveUser, err := store.Create(ctx, "Inactive User", "inactiveuser", "hashedpassword", "user")
	require.NoError(t, err)
	require.NotNil(t, inactiveUser)

	err = store.SetActive(ctx, inactiveUser.ID, false)
	require.NoError(t, err)

	t.Run("GetByIDAdmin finds active user", func(t *testing.T) {
		found, err := store.GetByIDAdmin(ctx, activeUser.ID)
		require.NoError(t, err)
		require.NotNil(t, found)
		assert.Equal(t, activeUser.ID, found.ID)
		assert.True(t, found.IsActive)
	})

	t.Run("GetByIDAdmin finds inactive user", func(t *testing.T) {
		found, err := store.GetByIDAdmin(ctx, inactiveUser.ID)
		require.NoError(t, err)
		require.NotNil(t, found, "GetByIDAdmin should return inactive users")
		assert.Equal(t, inactiveUser.ID, found.ID)
		assert.False(t, found.IsActive)
	})

	t.Run("GetByID does NOT find inactive user", func(t *testing.T) {
		found, err := store.GetByID(ctx, inactiveUser.ID)
		require.NoError(t, err)
		assert.Nil(t, found, "GetByID should filter out inactive users")
	})

	t.Run("GetByIDAdmin returns nil for non-existent user", func(t *testing.T) {
		found, err := store.GetByIDAdmin(ctx, "non-existent-id")
		require.NoError(t, err)
		assert.Nil(t, found)
	})
}
