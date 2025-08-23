package validation

import (
	"fmt"
	"strings"
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

// NormalizeDisplayName normalizes a displayName
func NormalizeDisplayName(displayName string) string {
	return strings.TrimSpace(displayName)
}
