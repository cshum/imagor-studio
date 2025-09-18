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

	// Check for valid characters (alphanumeric, underscore, hyphen)
	for i, r := range username {
		if i == 0 {
			// First character must be alphanumeric
			if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')) {
				return fmt.Errorf("username must start with an alphanumeric character")
			}
		} else {
			// Other characters can be alphanumeric, underscore, or hyphen
			if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-') {
				return fmt.Errorf("username can only contain alphanumeric characters, underscores, and hyphens")
			}
		}
	}

	// Check for reserved usernames
	reservedUsernames := []string{"admin", "root", "user", "guest", "system", "api", "www", "mail", "ftp"}
	lowerUsername := strings.ToLower(username)
	for _, reserved := range reservedUsernames {
		if lowerUsername == reserved {
			return fmt.Errorf("username '%s' is reserved", username)
		}
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
