package auth

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name        string
		password    string
		expectError bool
		errorMsg    string
	}{
		{
			name:     "Simple password",
			password: "password123",
		},
		{
			name:     "Complex password",
			password: "P@ssw0rd!@#$%^&*()_+-=[]{}|;:,.<>?",
		},
		{
			name:     "Empty password",
			password: "",
		},
		{
			name:     "Unicode password",
			password: "пароль123测试",
		},
		{
			name:     "Maximum length password (72 bytes)",
			password: strings.Repeat("a", 72),
		},
		{
			name:        "Password too long (73 bytes)",
			password:    strings.Repeat("a", 73),
			expectError: true,
			errorMsg:    "password length exceeds 72 bytes",
		},
		{
			name:     "Single character",
			password: "a",
		},
		{
			name:     "Password with spaces",
			password: "my password with spaces",
		},
		{
			name:     "Password with newlines",
			password: "password\nwith\nnewlines",
		},
		{
			name:     "Password with tabs",
			password: "password\twith\ttabs",
		},
		{
			name:     "High Unicode",
			password: "🔐🛡️🔑",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
				assert.Empty(t, hash)
				return
			}

			require.NoError(t, err)
			assert.NotEmpty(t, hash)
			assert.NotEqual(t, tt.password, hash)

			// Verify hash format (bcrypt hashes start with $2a$, $2b$, or $2y$)
			assert.True(t, strings.HasPrefix(hash, "$2"), "Hash should be in bcrypt format")

			// Verify password can be checked
			err = CheckPassword(hash, tt.password)
			assert.NoError(t, err)
		})
	}
}

func TestCheckPassword(t *testing.T) {
	password := "testpassword123"

	// Hash the password
	hash, err := HashPassword(password)
	require.NoError(t, err)

	tests := []struct {
		name        string
		hashedPwd   string
		plainPwd    string
		expectError bool
		errorMsg    string
	}{
		{
			name:      "Correct password",
			hashedPwd: hash,
			plainPwd:  password,
		},
		{
			name:        "Wrong password",
			hashedPwd:   hash,
			plainPwd:    "wrongpassword",
			expectError: true,
		},
		{
			name:        "Empty password",
			hashedPwd:   hash,
			plainPwd:    "",
			expectError: true,
		},
		{
			name:        "Invalid hash",
			hashedPwd:   "invalid-hash",
			plainPwd:    password,
			expectError: true,
		},
		{
			name:        "Empty hash",
			hashedPwd:   "",
			plainPwd:    password,
			expectError: true,
		},
		{
			name:        "Password too long",
			hashedPwd:   hash,
			plainPwd:    strings.Repeat("a", 73),
			expectError: true,
			errorMsg:    "password length exceeds 72 bytes",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckPassword(tt.hashedPwd, tt.plainPwd)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Test edge cases with updated expectations
func TestHashPassword_EdgeCases(t *testing.T) {
	tests := []struct {
		name        string
		password    string
		expectError bool
		errorMsg    string
	}{
		{"Null bytes", "password\x00with\x00nulls", false, ""},
		{"Only spaces", "     ", false, ""},
		{"Only numbers", "123456789", false, ""},
		{"Only special chars", "!@#$%^&*()", false, ""},
		{"Very short", "a", false, ""},
		{"Mixed encodings", "café🔐тест", false, ""},
		{"At limit", strings.Repeat("x", 72), false, ""},
		{"Over limit", strings.Repeat("x", 73), true, "password length exceeds 72 bytes"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
				assert.Empty(t, hash)
			} else {
				require.NoError(t, err)
				assert.NotEmpty(t, hash)

				err = CheckPassword(hash, tt.password)
				assert.NoError(t, err)

				// Should fail with different password
				if len(tt.password+"different") <= 72 { // Only test if within bcrypt limit
					err = CheckPassword(hash, tt.password+"different")
					assert.Error(t, err)
				}
			}
		})
	}
}

func TestHashPassword_Uniqueness(t *testing.T) {
	password := "testpassword123"

	// Hash the same password multiple times
	var hashes []string
	for i := 0; i < 10; i++ {
		hash, err := HashPassword(password)
		require.NoError(t, err)
		hashes = append(hashes, hash)
	}

	// All hashes should be different (due to bcrypt salt)
	for i := 0; i < len(hashes); i++ {
		for j := i + 1; j < len(hashes); j++ {
			assert.NotEqual(t, hashes[i], hashes[j], "Hashes should be different due to unique salts")
		}
	}

	// But all should verify correctly
	for _, hash := range hashes {
		assert.NoError(t, CheckPassword(hash, password))
	}
}

func TestHashPassword_ConsistentVerification(t *testing.T) {
	password := "testpassword123"

	hash, err := HashPassword(password)
	require.NoError(t, err)

	// Verify multiple times should always work
	for i := 0; i < 5; i++ {
		assert.NoError(t, CheckPassword(hash, password))
	}
}

func TestHashPassword_CaseSensitive(t *testing.T) {
	password := "Password123"
	hash, err := HashPassword(password)
	require.NoError(t, err)

	// Correct case should work
	assert.NoError(t, CheckPassword(hash, password))

	// Wrong case should fail
	assert.Error(t, CheckPassword(hash, "password123"))
	assert.Error(t, CheckPassword(hash, "PASSWORD123"))
}

func TestHashPassword_DefaultCost(t *testing.T) {
	password := "testpassword"
	hash, err := HashPassword(password)
	require.NoError(t, err)

	// Verify the hash uses the expected cost
	// bcrypt cost is encoded in the hash, should contain "$12$" for cost 12
	assert.Contains(t, hash, "$12$", "Hash should use cost 12")
}

func BenchmarkHashPassword(b *testing.B) {
	password := "benchmarkpassword123"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := HashPassword(password)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkCheckPassword(b *testing.B) {
	password := "benchmarkpassword123"

	hash, err := HashPassword(password)
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := CheckPassword(hash, password)
		if err != nil {
			b.Fatal(err)
		}
	}
}
