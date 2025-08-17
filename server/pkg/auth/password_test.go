package auth

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
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
		//{
		//	name:     "Very long password",
		//	password: strings.Repeat("a", 1000),
		//},
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckPassword(tt.hashedPwd, tt.plainPwd)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
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

// Test edge cases
func TestHashPassword_EdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		password string
	}{
		{"Null bytes", "password\x00with\x00nulls"},
		{"Only spaces", "     "},
		{"Only numbers", "123456789"},
		{"Only special chars", "!@#$%^&*()"},
		{"Very short", "a"},
		{"Mixed encodings", "café🔐тест"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)
			require.NoError(t, err)

			err = CheckPassword(hash, tt.password)
			assert.NoError(t, err)

			// Should fail with different password
			err = CheckPassword(hash, tt.password+"different")
			assert.Error(t, err)
		})
	}
}
