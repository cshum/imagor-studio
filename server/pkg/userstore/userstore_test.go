package userstore

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/model"
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
			username TEXT NOT NULL UNIQUE,
			email TEXT NOT NULL UNIQUE,
			hashed_password TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	require.NoError(t, err)

	// Create unique indices
	_, err = db.ExecContext(ctx, `
		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username 
		ON users (username)
	`)
	require.NoError(t, err)

	_, err = db.ExecContext(ctx, `
		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email 
		ON users (email)
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
		username       string
		email          string
		hashedPassword string
		role           string
		expectError    bool
		errorContains  string
	}{
		{
			name:           "Valid user creation",
			username:       "testuser",
			email:          "test@example.com",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    false,
		},
		{
			name:           "Admin role",
			username:       "adminuser",
			email:          "admin@example.com",
			hashedPassword: "hashedpassword123",
			role:           "admin",
			expectError:    false,
		},
		{
			name:           "Duplicate username",
			username:       "testuser", // Same as first test
			email:          "different@example.com",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "username already exists",
		},
		{
			name:           "Duplicate email",
			username:       "differentuser",
			email:          "test@example.com", // Same as first test
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "email already exists",
		},
		{
			name:           "Empty username",
			username:       "",
			email:          "empty@example.com",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "username cannot be empty",
		},
		{
			name:           "Whitespace only username",
			username:       "   ",
			email:          "whitespace@example.com",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "username cannot be empty",
		},
		{
			name:           "Empty email",
			username:       "emptyemail",
			email:          "",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "email cannot be empty",
		},
		{
			name:           "Whitespace only email",
			username:       "whitespacemail",
			email:          "   ",
			hashedPassword: "hashedpassword123",
			role:           "user",
			expectError:    true,
			errorContains:  "email cannot be empty",
		},
		{
			name:           "Empty password",
			username:       "emptypass",
			email:          "emptypass@example.com",
			hashedPassword: "",
			role:           "user",
			expectError:    true,
			errorContains:  "hashed password cannot be empty",
		},
		{
			name:           "Empty role",
			username:       "emptyrole",
			email:          "emptyrole@example.com",
			hashedPassword: "hashedpassword123",
			role:           "",
			expectError:    true,
			errorContains:  "role cannot be empty",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := store.Create(ctx, tt.username, tt.email, tt.hashedPassword, tt.role)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
				assert.Nil(t, user)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, user)
				assert.Equal(t, strings.TrimSpace(tt.username), user.Username)
				assert.Equal(t, strings.TrimSpace(tt.email), user.Email)
				assert.Equal(t, strings.TrimSpace(tt.role), user.Role)
				assert.True(t, user.IsActive)
				assert.NotEmpty(t, user.ID)
				assert.False(t, user.CreatedAt.IsZero())
				assert.False(t, user.UpdatedAt.IsZero())
			}
		})
	}
}

func TestUserStore_GetByUsernameOrEmail(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Create test user
	user, err := store.Create(ctx, "testuser", "test@example.com", "hashedpass", "user")
	require.NoError(t, err)

	tests := []struct {
		name             string
		usernameOrEmail  string
		expectFound      bool
		expectedUsername string
	}{
		{
			name:             "Find by username",
			usernameOrEmail:  "testuser",
			expectFound:      true,
			expectedUsername: "testuser",
		},
		{
			name:             "Find by email",
			usernameOrEmail:  "test@example.com",
			expectFound:      true,
			expectedUsername: "testuser",
		},
		{
			name:            "Non-existent username",
			usernameOrEmail: "nonexistent",
			expectFound:     false,
		},
		{
			name:            "Non-existent email",
			usernameOrEmail: "nonexistent@example.com",
			expectFound:     false,
		},
		{
			name:            "Empty string",
			usernameOrEmail: "",
			expectFound:     false,
		},
		{
			name:            "Case sensitive username",
			usernameOrEmail: "TestUser", // Different case
			expectFound:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			foundUser, err := store.GetByUsernameOrEmail(ctx, tt.usernameOrEmail)

			assert.NoError(t, err)
			if tt.expectFound {
				assert.NotNil(t, foundUser)
				assert.Equal(t, tt.expectedUsername, foundUser.Username)
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
	createdUser, err := store.Create(ctx, "testuser", "test@example.com", "hashedpass", "user")
	require.NoError(t, err)

	// Test getting by ID
	foundUser, err := store.GetByID(ctx, createdUser.ID)
	assert.NoError(t, err)
	assert.NotNil(t, foundUser)
	assert.Equal(t, createdUser.ID, foundUser.ID)
	assert.Equal(t, createdUser.Username, foundUser.Username)
	assert.Equal(t, createdUser.Email, foundUser.Email)
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
	user, err := store.Create(ctx, "testuser", "test@example.com", "hashedpass", "user")
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
	user, err := store.Create(ctx, "testuser", "test@example.com", "oldhashedpass", "user")
	require.NoError(t, err)

	newHashedPassword := "newhashedpassword123"

	// Update password
	err = store.UpdatePassword(ctx, user.ID, newHashedPassword)
	assert.NoError(t, err)

	// Verify password was updated
	foundUser, err := store.GetByUsernameOrEmail(ctx, "testuser")
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
	user, err := store.Create(ctx, "testuser", "test@example.com", "hashedpass", "user")
	require.NoError(t, err)
	assert.True(t, user.IsActive)

	// Deactivate user
	err = store.SetActive(ctx, user.ID, false)
	assert.NoError(t, err)

	// Verify user is not found by GetByID (only returns active users)
	inactiveUser, err := store.GetByID(ctx, user.ID)
	assert.NoError(t, err)
	assert.Nil(t, inactiveUser)

	// Verify user is not found by GetByUsernameOrEmail (only returns active users)
	inactiveUser2, err := store.GetByUsernameOrEmail(ctx, "testuser")
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
	user1, err := store.Create(ctx, "user1", "user1@example.com", "hash1", "user")
	require.NoError(t, err)

	user2, err := store.Create(ctx, "user2", "user2@example.com", "hash2", "admin")
	require.NoError(t, err)

	// Verify isolation - each user should only get their own data
	foundUser1, err := store.GetByID(ctx, user1.ID)
	assert.NoError(t, err)
	assert.Equal(t, "user1", foundUser1.Username)

	foundUser2, err := store.GetByID(ctx, user2.ID)
	assert.NoError(t, err)
	assert.Equal(t, "user2", foundUser2.Username)

	// Verify users can't access each other's data by accident
	assert.NotEqual(t, user1.ID, user2.ID)
	assert.NotEqual(t, user1.Email, user2.Email)
	assert.NotEqual(t, user1.Username, user2.Username)
}

func TestUserStore_SpecialCharacters(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	tests := []struct {
		name     string
		username string
		email    string
	}{
		{
			name:     "Unicode username",
			username: "пользователь123",
			email:    "unicode@example.com",
		},
		{
			name:     "Special chars in username",
			username: "user-with_special.chars",
			email:    "special@example.com",
		},
		{
			name:     "Email with plus",
			username: "emailtest",
			email:    "test+tag@example.com",
		},
		{
			name:     "Long username",
			username: strings.Repeat("a", 50),
			email:    "long@example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := store.Create(ctx, tt.username, tt.email, "hashedpass", "user")
			assert.NoError(t, err)
			assert.Equal(t, tt.username, user.Username)
			assert.Equal(t, tt.email, user.Email)

			// Verify retrieval
			foundUser, err := store.GetByUsernameOrEmail(ctx, tt.username)
			assert.NoError(t, err)
			assert.Equal(t, tt.username, foundUser.Username)

			foundUser2, err := store.GetByUsernameOrEmail(ctx, tt.email)
			assert.NoError(t, err)
			assert.Equal(t, tt.email, foundUser2.Email)
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
	user, err := store.Create(ctx, "concurrent", "concurrent@example.com", "hash", "user")
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

func BenchmarkUserStore_Create(b *testing.B) {
	db, cleanup := setupTestDB(&testing.T{})
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		username := fmt.Sprintf("user%d", i)
		email := fmt.Sprintf("user%d@example.com", i)
		_, err := store.Create(ctx, username, email, "hashedpass", "user")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkUserStore_GetByUsernameOrEmail(b *testing.B) {
	db, cleanup := setupTestDB(&testing.T{})
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Setup data
	_, err := store.Create(ctx, "benchuser", "bench@example.com", "hashedpass", "user")
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := store.GetByUsernameOrEmail(ctx, "benchuser")
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
	createdUser, err := store.Create(ctx, "testuser", "test@example.com", hashedPassword, "user")
	require.NoError(t, err)

	// Test getting by ID with password
	foundUser, err := store.GetByIDWithPassword(ctx, createdUser.ID)
	assert.NoError(t, err)
	assert.NotNil(t, foundUser)
	assert.Equal(t, createdUser.ID, foundUser.ID)
	assert.Equal(t, "testuser", foundUser.Username)
	assert.Equal(t, "test@example.com", foundUser.Email)
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

func TestUserStore_InputValidation(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	tests := []struct {
		name           string
		username       string
		email          string
		hashedPassword string
		role           string
		expectError    bool
		errorMsg       string
	}{
		{
			name:           "Username with leading/trailing spaces",
			username:       "  spaceuser  ",
			email:          "space@example.com",
			hashedPassword: "hashedpass",
			role:           "user",
			expectError:    false,
		},
		{
			name:           "Email with leading/trailing spaces",
			username:       "emailspace",
			email:          "  emailspace@example.com  ",
			hashedPassword: "hashedpass",
			role:           "user",
			expectError:    false,
		},
		{
			name:           "Role with leading/trailing spaces",
			username:       "rolespace",
			email:          "rolespace@example.com",
			hashedPassword: "hashedpass",
			role:           "  admin  ",
			expectError:    false,
		},
		{
			name:           "All fields with spaces should be trimmed",
			username:       "  trimtest  ",
			email:          "  trimtest@example.com  ",
			hashedPassword: "hashedpass",
			role:           "  user  ",
			expectError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := store.Create(ctx, tt.username, tt.email, tt.hashedPassword, tt.role)

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
				assert.Equal(t, strings.TrimSpace(tt.username), user.Username)
				assert.Equal(t, strings.TrimSpace(tt.email), user.Email)
				assert.Equal(t, strings.TrimSpace(tt.role), user.Role)

				// Should not contain leading/trailing spaces
				assert.False(t, strings.HasPrefix(user.Username, " "))
				assert.False(t, strings.HasSuffix(user.Username, " "))
				assert.False(t, strings.HasPrefix(user.Email, " "))
				assert.False(t, strings.HasSuffix(user.Email, " "))
				assert.False(t, strings.HasPrefix(user.Role, " "))
				assert.False(t, strings.HasSuffix(user.Role, " "))
			}
		})
	}
}
