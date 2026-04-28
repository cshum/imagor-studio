package validation

import (
	"fmt"
	"net/mail"
	"regexp"
	"strings"

	"github.com/cshum/imagor-studio/server/pkg/uuid"
)

// ValidateDisplayName validates a displayName according to common rules
func ValidateDisplayName(displayName string) error {
	displayName = strings.TrimSpace(displayName)

	if displayName == "" {
		return fmt.Errorf("display name is required")
	}

	if len(displayName) < 1 {
		return fmt.Errorf("display name must be at least 1 character long")
	}

	if len(displayName) > 100 {
		return fmt.Errorf("display name must be at most 100 characters long")
	}

	return nil
}

// ValidatePassword validates a password according to security rules
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	if len(password) > 72 { // bcrypt limit
		return fmt.Errorf("password must be at most 72 characters long")
	}
	return nil
}

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_-]*$`)

// ValidateUsername validates a username according to common rules
func ValidateUsername(username string) error {
	username = strings.TrimSpace(username)

	if username == "" {
		return fmt.Errorf("username is required")
	}

	if len(username) < 3 {
		return fmt.Errorf("username must be at least 3 characters long")
	}

	if len(username) > 30 {
		return fmt.Errorf("username must be at most 30 characters long")
	}

	if !usernameRegex.MatchString(username) {
		return fmt.Errorf("username must start with an alphanumeric character and can only contain alphanumeric characters, underscores, and hyphens")
	}

	return nil
}

// NormalizeUsername normalizes a username
func NormalizeUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

// NormalizeDisplayName normalizes a displayName
func NormalizeDisplayName(displayName string) string {
	return strings.TrimSpace(displayName)
}

// ValidateEmail validates an email address according to common rules.
func ValidateEmail(email string) error {
	email = strings.TrimSpace(email)

	if email == "" {
		return fmt.Errorf("email is required")
	}

	parsed, err := mail.ParseAddress(email)
	if err != nil || parsed.Address != email {
		return fmt.Errorf("email must be a valid email address")
	}

	return nil
}

// NormalizeEmail normalizes an email address.
func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// GenerateSystemUsername returns a guaranteed-unique internal username.
func GenerateSystemUsername() string {
	return "u-" + uuid.GenerateUUID()[:12]
}
