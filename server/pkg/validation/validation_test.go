package validation

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateUsername(t *testing.T) {
	tests := []struct {
		name      string
		username  string
		expectErr bool
		errMsg    string
	}{
		{"Valid username", "testuser", false, ""},
		{"Valid with numbers", "user123", false, ""},
		{"Valid with underscore", "test_user", false, ""},
		{"Valid with hyphen", "test-user", false, ""},
		{"Valid with dot", "test.user", false, ""},

		{"Empty username", "", true, "username is required"},
		{"Too short", "ab", true, "username must be at least 3 characters long"},
		{"Too long", strings.Repeat("a", 51), true, "username must be at most 50 characters long"},
		{"Starts with underscore", "_testuser", true, "username cannot start with special character"},
		{"Starts with hyphen", "-testuser", true, "username cannot start with special character"},
		{"Starts with dot", ".testuser", true, "username cannot start with special character"},
		{"Ends with underscore", "testuser_", true, "username cannot end with special character"},
		{"Invalid character", "test@user", true, "username contains invalid character: @"},
		{"With spaces", "test user", true, "username contains invalid character:  "},
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
