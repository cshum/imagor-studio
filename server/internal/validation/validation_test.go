package validation

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateDisplayName(t *testing.T) {
	tests := []struct {
		name        string
		displayName string
		expectErr   bool
		errMsg      string
	}{
		{"Valid displayName", "testuser", false, ""},
		{"Valid with numbers", "user123", false, ""},
		{"Valid with underscore", "test_user", false, ""},
		{"Valid with hyphen", "test-user", false, ""},
		{"Valid with dot", "test.user", false, ""},

		{"Empty displayName", "", true, "display name is required"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateDisplayName(tt.displayName)
			if tt.expectErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name      string
		password  string
		expectErr bool
		errMsg    string
	}{
		{"Valid password", "password123", false, ""},
		{"Valid complex password", "P@ssw0rd!123", false, ""},
		{"Valid long password", strings.Repeat("a", 72), false, ""},

		{"Too short", "1234567", true, "password must be at least 8 characters long"},
		{"Too long", strings.Repeat("a", 73), true, "password must be at most 72 characters long"},
		{"Empty password", "", true, "password must be at least 8 characters long"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePassword(tt.password)
			if tt.expectErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateUsername(t *testing.T) {
	tests := []struct {
		name      string
		username  string
		expectErr bool
		errMsg    string
	}{
		// Valid usernames
		{"Valid username", "testuser", false, ""},
		{"Valid with numbers", "user123", false, ""},
		{"Valid with underscore", "test_user", false, ""},
		{"Valid with hyphen", "test-user", false, ""},
		{"Valid mixed case", "TestUser", false, ""},
		{"Valid starting with number", "1user", false, ""},
		{"Valid starting with letter", "user1", false, ""},
		{"Valid minimum length", "abc", false, ""},
		{"Valid maximum length", strings.Repeat("a", 30), false, ""},
		{"Valid complex", "user_123-test", false, ""},

		// Invalid usernames
		{"Empty username", "", true, "username is required"},
		{"Too short", "ab", true, "username must be at least 3 characters long"},
		{"Too long", strings.Repeat("a", 31), true, "username must be at most 30 characters long"},
		{"Starting with underscore", "_user", true, "username must start with an alphanumeric character"},
		{"Starting with hyphen", "-user", true, "username must start with an alphanumeric character"},
		{"Contains space", "test user", true, "username must start with an alphanumeric character"},
		{"Contains special chars", "user@test", true, "username must start with an alphanumeric character"},
		{"Contains dot", "user.test", true, "username must start with an alphanumeric character"},
		{"Contains plus", "user+test", true, "username must start with an alphanumeric character"},
		{"Only spaces", "   ", true, "username is required"},
		{"Whitespace trimmed", "  user  ", false, ""}, // Should pass after trimming
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUsername(tt.username)
			if tt.expectErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
