package validation

import (
	"net"
	"net/mail"
	"strings"
)

// EmailValidator provides email validation functionality
type EmailValidator struct {
	requireTLD bool
}

// NewEmailValidator creates a new email validator
func NewEmailValidator(requireTLD bool) *EmailValidator {
	return &EmailValidator{
		requireTLD: requireTLD,
	}
}

// IsValid validates an email address
func (ev *EmailValidator) IsValid(email string) bool {
	email = strings.TrimSpace(email)
	if email == "" {
		return false
	}

	// Use standard library for RFC-compliant validation
	addr, err := mail.ParseAddress(email)
	if err != nil {
		return false
	}

	// Extract just the email part (removes any display name)
	cleanEmail := addr.Address

	if ev.requireTLD {
		// Check if domain has a TLD
		parts := strings.Split(cleanEmail, "@")
		if len(parts) != 2 {
			return false
		}
		domain := parts[1]

		// Check if domain is an IP address in square brackets [192.168.1.1]
		if strings.HasPrefix(domain, "[") && strings.HasSuffix(domain, "]") {
			// Extract IP from brackets
			ipStr := domain[1 : len(domain)-1]
			// Check if it's a valid IP address
			if net.ParseIP(ipStr) != nil {
				// IP addresses don't have TLD, so reject if TLD is required
				return false
			}
			// If it's not a valid IP, let it fall through to regular domain checks
		}

		// Domain must contain at least one dot for TLD
		if !strings.Contains(domain, ".") {
			return false
		}

		// Domain must not end with a dot
		if strings.HasSuffix(domain, ".") {
			return false
		}

		// Check that there's something after the last dot (actual TLD)
		lastDotIndex := strings.LastIndex(domain, ".")
		if lastDotIndex == len(domain)-1 || lastDotIndex == -1 {
			return false
		}

		tld := domain[lastDotIndex+1:]
		if len(tld) < 2 { // TLD should be at least 2 characters
			return false
		}

		// Additional check: TLD should only contain letters
		for _, r := range tld {
			if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')) {
				return false
			}
		}
	}

	return true
}

// Normalize normalizes an email address
func (ev *EmailValidator) Normalize(email string) string {
	email = strings.TrimSpace(email)
	if email == "" {
		return ""
	}

	if addr, err := mail.ParseAddress(email); err == nil {
		// Extract just the email address part, removing display name
		return strings.ToLower(addr.Address)
	}

	// If parsing fails, just return the lowercase trimmed version
	return strings.ToLower(email)
}

// Default validator instance (requires TLD)
var Default = NewEmailValidator(true)

// IsValidEmail validates using the default validator
func IsValidEmail(email string) bool {
	return Default.IsValid(email)
}

// NormalizeEmail normalizes using the default validator
func NormalizeEmail(email string) string {
	return Default.Normalize(email)
}

// IsValidEmailRequired validates that email is present and valid
func IsValidEmailRequired(email string) bool {
	email = strings.TrimSpace(email)
	return email != "" && IsValidEmail(email)
}
