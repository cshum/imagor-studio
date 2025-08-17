package validation

import (
	"fmt"
	"strings"
	"unicode"
)

// ValidateUsername validates a username according to common rules
func ValidateUsername(username string) error {
	username = strings.TrimSpace(username)

	if username == "" {
		return fmt.Errorf("username is required")
	}

	if len(username) < 3 {
		return fmt.Errorf("username must be at least 3 characters long")
	}

	if len(username) > 50 {
		return fmt.Errorf("username must be at most 50 characters long")
	}

	// Check for invalid characters (optional - adjust as needed)
	for _, r := range username {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) && r != '_' && r != '-' && r != '.' {
			return fmt.Errorf("username contains invalid character: %c", r)
		}
	}

	// Username cannot start or end with special characters
	if username[0] == '_' || username[0] == '-' || username[0] == '.' {
		return fmt.Errorf("username cannot start with special character")
	}

	if username[len(username)-1] == '_' || username[len(username)-1] == '-' || username[len(username)-1] == '.' {
		return fmt.Errorf("username cannot end with special character")
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

	// Optional: Add complexity requirements
	// hasUpper, hasLower, hasDigit, hasSpecial := false, false, false, false
	// for _, r := range password {
	// 	switch {
	// 	case unicode.IsUpper(r):
	// 		hasUpper = true
	// 	case unicode.IsLower(r):
	// 		hasLower = true
	// 	case unicode.IsDigit(r):
	// 		hasDigit = true
	// 	case unicode.IsPunct(r) || unicode.IsSymbol(r):
	// 		hasSpecial = true
	// 	}
	// }
	//
	// if !hasUpper || !hasLower || !hasDigit {
	// 	return fmt.Errorf("password must contain at least one uppercase letter, one lowercase letter, and one digit")
	// }

	return nil
}

// NormalizeUsername normalizes a username
func NormalizeUsername(username string) string {
	return strings.TrimSpace(username)
}
