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
