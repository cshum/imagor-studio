package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// pkg/validation/email_test.go
func TestIsValidEmail(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		// Valid emails with TLD
		{"Valid simple email", "test@example.com", true},
		{"Valid email with subdomain", "user@mail.example.com", true},
		{"Valid email with plus", "user+tag@example.com", true},
		{"Valid email with dots", "first.last@example.com", true},
		{"Valid email with numbers", "user123@example123.com", true},
		{"Valid email with hyphens", "user-name@example-domain.com", true},
		{"Valid email with display name", "John Doe <john@example.com>", true},
		{"Valid email with quotes", `"test user"@example.com`, true},
		{"Valid email with country TLD", "test@example.co.uk", true},
		{"Valid email with new TLD", "test@example.tech", true},

		// Invalid emails
		{"Empty email", "", false},
		{"Missing @", "testexample.com", false},
		{"Missing domain", "test@", false},
		{"Missing local part", "@example.com", false},
		{"Multiple @", "test@@example.com", false},
		{"Invalid characters", "test@exam ple.com", false},
		{"Starts with @", "@test@example.com", false},
		{"Ends with @", "test@example.com@", false},

		// TLD requirement tests (should fail with default validator)
		{"Local domain (no TLD)", "test@localhost", false},
		{"Domain without TLD", "test@internal", false},
		{"Domain ending with dot", "test@example.com.", false},
		{"Domain with single char TLD", "test@example.c", false},
		{"TLD with numbers", "test@example.c0m", false},

		// IP address tests (should be rejected when TLD is required)
		{"Email with IPv4", "test@[192.168.1.1]", false},
		{"Email with IPv6", "test@[2001:db8::1]", false},
		{"Email with invalid IP format", "test@[999.999.999.999]", false},
		{"Email with malformed IP brackets", "test@192.168.1.1]", false},

		// Edge cases
		{"Just spaces", "   ", false},
		{"Email with spaces (trimmed)", " test@example.com ", true},
		{"Unicode domain", "test@测试.com", true},
		{"Very long email", "verylongemailaddressthatmightbetoolongbutshouldbechecked@verylongdomainnamethatmightbetoolongbutshouldbechecked.com", true},
		{"Email with subdomain", "user@sub.domain.example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidEmail(tt.email)
			assert.Equal(t, tt.expected, result, "Email: %s", tt.email)
		})
	}
}

func TestEmailValidator_LocalDomains(t *testing.T) {
	// Test validator that allows local domains (no TLD requirement)
	validator := NewEmailValidator(false)

	tests := []struct {
		email    string
		expected bool
	}{
		{"test@localhost", true},
		{"user@internal", true},
		{"admin@dev", true},
		{"test@example.com", true},
		{"test@[192.168.1.1]", true}, // IP addresses should be allowed when no TLD required
		{"test@[2001:db8::1]", true}, // IPv6 should also be allowed
		{"invalid@@domain", false},   // Still invalid due to multiple @
		{"@localhost", false},        // Still invalid due to missing local part
		{"test@", false},             // Still invalid due to missing domain
		{"test@[invalid-ip]", false}, // Invalid IP should still be rejected
	}

	for _, tt := range tests {
		t.Run(tt.email, func(t *testing.T) {
			result := validator.IsValid(tt.email)
			assert.Equal(t, tt.expected, result, "Email: %s", tt.email)
		})
	}
}

func TestNormalizeEmail(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"Simple email", "Test@Example.Com", "test@example.com"},
		{"Email with spaces", "  test@example.com  ", "test@example.com"},
		{"Email with display name", "John Doe <john@example.com>", "john@example.com"},
		{"Email with quotes in display", `"John Doe" <john@example.com>`, "john@example.com"},
		{"Already normalized", "test@example.com", "test@example.com"},
		{"Complex display name", "John Q. Public <john.q.public@example.com>", "john.q.public@example.com"},
		{"Empty string", "", ""},
		{"Just spaces", "   ", ""},
		{"Invalid email", "not-an-email", "not-an-email"}, // Falls back to lowercase
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeEmail(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestDomainValidation(t *testing.T) {
	// Test specific domain validation scenarios
	validator := NewEmailValidator(true) // Requires TLD

	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		// Valid domains
		{"Standard domain", "test@example.com", true},
		{"Subdomain", "test@mail.example.com", true},
		{"Country code TLD", "test@example.co.uk", true},
		{"New generic TLD", "test@example.tech", true},
		{"Multiple subdomains", "test@mail.server.example.com", true},

		// Invalid domains for TLD requirement
		{"No TLD", "test@example", false},
		{"Localhost", "test@localhost", false},
		{"Internal domain", "test@server", false},
		{"Numeric TLD", "test@example.123", false},
		{"Mixed alphanumeric TLD", "test@example.c0m", false},
		{"Single char TLD", "test@example.c", false},
		{"Trailing dot", "test@example.com.", false},

		// IP addresses (should be rejected with TLD requirement)
		{"IPv4 address", "test@[192.168.1.1]", false},
		{"IPv6 address", "test@[2001:db8::1]", false},
		{"Invalid IPv4", "test@[999.999.999.999]", false},
		{"Malformed IP brackets", "test@[192.168.1.1", false},

		// Edge cases
		{"Domain with hyphen", "test@sub-domain.example.com", true},
		{"Domain starting with number", "test@2example.com", true},
		{"Very long domain", "test@verylongsubdomainnamethatmightbetoolongbutshouldbechecked.example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validator.IsValid(tt.email)
			assert.Equal(t, tt.expected, result, "Email: %s", tt.email)
		})
	}
}

func TestIPAddressHandling(t *testing.T) {
	strictValidator := NewEmailValidator(true)   // Requires TLD, should reject IPs
	lenientValidator := NewEmailValidator(false) // Allows IPs

	ipTests := []struct {
		name    string
		email   string
		strict  bool // Expected result for strict validator
		lenient bool // Expected result for lenient validator
	}{
		{"Valid IPv4", "test@[192.168.1.1]", false, true},
		{"Valid IPv6", "test@[2001:db8::1]", false, true},
		{"Valid IPv6 full", "test@[2001:0db8:85a3:0000:0000:8a2e:0370:7334]", false, true},
		{"Valid IPv6 compressed", "test@[2001:db8:85a3::8a2e:370:7334]", false, true},
		{"Invalid IPv4", "test@[999.999.999.999]", false, false},
		{"Invalid IPv6", "test@[gggg::1]", false, false},
		{"Malformed brackets", "test@192.168.1.1]", false, false},
		{"Missing closing bracket", "test@[192.168.1.1", false, false},
		{"Empty brackets", "test@[]", false, false},
		{"Not an IP in brackets", "test@[notanip]", false, false},
	}

	for _, tt := range ipTests {
		t.Run(tt.name+"_strict", func(t *testing.T) {
			result := strictValidator.IsValid(tt.email)
			assert.Equal(t, tt.strict, result, "Email: %s (strict)", tt.email)
		})

		t.Run(tt.name+"_lenient", func(t *testing.T) {
			result := lenientValidator.IsValid(tt.email)
			assert.Equal(t, tt.lenient, result, "Email: %s (lenient)", tt.email)
		})
	}
}

func TestIsValidEmailRequired(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{"Valid email", "test@example.com", true},
		{"Empty string", "", false},
		{"Just spaces", "   ", false},
		{"Invalid email", "invalid-email", false},
		{"Valid email with spaces", "  test@example.com  ", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidEmailRequired(tt.email)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Benchmark tests
func BenchmarkIsValidEmail(b *testing.B) {
	email := "test@example.com"
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		IsValidEmail(email)
	}
}

func BenchmarkNormalizeEmail(b *testing.B) {
	email := "John Doe <JOHN@EXAMPLE.COM>"
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		NormalizeEmail(email)
	}
}
