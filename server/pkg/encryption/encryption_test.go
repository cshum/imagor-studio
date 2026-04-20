package encryption

import (
	"crypto/rand"
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewService(t *testing.T) {
	tests := []struct {
		name   string
		dbPath string
		jwtKey string
	}{
		{
			name:   "Valid parameters",
			dbPath: "/path/to/db",
			jwtKey: "test-jwt-key",
		},
		{
			name:   "Empty database path",
			dbPath: "",
			jwtKey: "test-jwt-key",
		},
		{
			name:   "Empty JWT key",
			dbPath: "/path/to/db",
			jwtKey: "",
		},
		{
			name:   "Both parameters empty",
			dbPath: "",
			jwtKey: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewServiceWithJwtLey(tt.dbPath, tt.jwtKey)

			assert.NotNil(t, service)
			assert.NotNil(t, service.masterKey)
			assert.NotNil(t, service.jwtKey)
			assert.Len(t, service.masterKey, 32) // AES-256 key length
			assert.Len(t, service.jwtKey, 32)    // AES-256 key length
		})
	}
}

func TestMasterKeyDerivation(t *testing.T) {
	// Test that same database path produces same master key
	service1 := NewServiceWithJwtLey("/test/path", "jwt-key")
	service2 := NewServiceWithJwtLey("/test/path", "jwt-key")

	assert.Equal(t, service1.masterKey, service2.masterKey, "Same database path should produce same master key")

	// Test that different database paths produce different master keys
	service3 := NewServiceWithJwtLey("/different/path", "jwt-key")

	assert.NotEqual(t, service1.masterKey, service3.masterKey, "Different database paths should produce different master keys")
}

func TestJWTKeyDerivation(t *testing.T) {
	// Test that same JWT key produces same derived key
	service1 := NewServiceWithJwtLey("/test/path", "same-jwt-key")
	service2 := NewServiceWithJwtLey("/test/path", "same-jwt-key")

	assert.Equal(t, service1.jwtKey, service2.jwtKey, "Same JWT key should produce same derived key")

	// Test that different JWT keys produce different derived keys
	service3 := NewServiceWithJwtLey("/test/path", "different-jwt-key")

	assert.NotEqual(t, service1.jwtKey, service3.jwtKey, "Different JWT keys should produce different derived keys")
}

func TestEncryptDecryptWithMaster(t *testing.T) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	tests := []struct {
		name      string
		plaintext string
	}{
		{
			name:      "Simple text",
			plaintext: "hello world",
		},
		// Note: Empty strings are handled specially - they return empty without encryption
		{
			name:      "Empty string",
			plaintext: "",
		},
		{
			name:      "Long text",
			plaintext: strings.Repeat("This is a long test string. ", 100),
		},
		{
			name:      "Special characters",
			plaintext: "!@#$%^&*()_+-=[]{}|;':\",./<>?`~",
		},
		{
			name:      "Unicode characters",
			plaintext: "Hello 世界 🌍 Здравствуй мир",
		},
		{
			name:      "JSON-like data",
			plaintext: `{"aws_access_key_id":"AKIAIOSFODNN7EXAMPLE","aws_secret_access_key":"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Encrypt
			encrypted, err := service.EncryptWithMaster(tt.plaintext)
			assert.NoError(t, err)

			if tt.plaintext == "" {
				// Empty strings are returned as-is
				assert.Empty(t, encrypted)
			} else {
				assert.NotEmpty(t, encrypted)
				assert.NotEqual(t, tt.plaintext, encrypted, "Encrypted text should be different from plaintext")
			}

			// Decrypt
			decrypted, err := service.DecryptWithMaster(encrypted)
			assert.NoError(t, err)
			assert.Equal(t, tt.plaintext, decrypted, "Decrypted text should match original plaintext")
		})
	}
}

func TestEncryptDecryptWithJWT(t *testing.T) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	tests := []struct {
		name      string
		plaintext string
	}{
		{
			name:      "JWT secret",
			plaintext: "super-secret-jwt-key-12345",
		},
		// Note: Empty strings are handled specially - they return empty without encryption
		{
			name:      "Empty string",
			plaintext: "",
		},
		{
			name:      "Long JWT secret",
			plaintext: strings.Repeat("abcdef123456", 10),
		},
		{
			name:      "Base64-like JWT secret",
			plaintext: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Encrypt
			encrypted, err := service.EncryptWithJWT(tt.plaintext)
			assert.NoError(t, err)

			if tt.plaintext == "" {
				// Empty strings are returned as-is
				assert.Empty(t, encrypted)
			} else {
				assert.NotEmpty(t, encrypted)
				assert.NotEqual(t, tt.plaintext, encrypted, "Encrypted text should be different from plaintext")
			}

			// Decrypt
			decrypted, err := service.DecryptWithJWT(encrypted)
			assert.NoError(t, err)
			assert.Equal(t, tt.plaintext, decrypted, "Decrypted text should match original plaintext")
		})
	}
}

func TestEncryptionUniqueness(t *testing.T) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	plaintext := "test message"

	// Encrypt the same message multiple times
	encrypted1, err := service.EncryptWithMaster(plaintext)
	require.NoError(t, err)

	encrypted2, err := service.EncryptWithMaster(plaintext)
	require.NoError(t, err)

	encrypted3, err := service.EncryptWithMaster(plaintext)
	require.NoError(t, err)

	// Each encryption should produce different ciphertext (due to random nonce)
	assert.NotEqual(t, encrypted1, encrypted2, "Multiple encryptions should produce different ciphertext")
	assert.NotEqual(t, encrypted2, encrypted3, "Multiple encryptions should produce different ciphertext")
	assert.NotEqual(t, encrypted1, encrypted3, "Multiple encryptions should produce different ciphertext")

	// But all should decrypt to the same plaintext
	decrypted1, err := service.DecryptWithMaster(encrypted1)
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted1)

	decrypted2, err := service.DecryptWithMaster(encrypted2)
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted2)

	decrypted3, err := service.DecryptWithMaster(encrypted3)
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted3)
}

func TestDecryptionErrors(t *testing.T) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	tests := []struct {
		name        string
		ciphertext  string
		decryptFunc func(string) (string, error)
		expectError bool
		errorMsg    string
	}{
		{
			name:        "Empty ciphertext - master",
			ciphertext:  "",
			decryptFunc: service.DecryptWithMaster,
			expectError: false, // Empty ciphertext returns empty string
			errorMsg:    "",
		},
		{
			name:        "Empty ciphertext - JWT",
			ciphertext:  "",
			decryptFunc: service.DecryptWithJWT,
			expectError: false, // Empty ciphertext returns empty string
			errorMsg:    "",
		},
		{
			name:        "Invalid base64 - master",
			ciphertext:  "invalid-base64!@#",
			decryptFunc: service.DecryptWithMaster,
			expectError: true,
			errorMsg:    "failed to decode base64",
		},
		{
			name:        "Invalid base64 - JWT",
			ciphertext:  "invalid-base64!@#",
			decryptFunc: service.DecryptWithJWT,
			expectError: true,
			errorMsg:    "failed to decode base64",
		},
		{
			name:        "Too short ciphertext - master",
			ciphertext:  "dGVzdA==", // "test" in base64, too short for nonce + ciphertext
			decryptFunc: service.DecryptWithMaster,
			expectError: true,
			errorMsg:    "ciphertext too short",
		},
		{
			name:        "Too short ciphertext - JWT",
			ciphertext:  "dGVzdA==", // "test" in base64, too short for nonce + ciphertext
			decryptFunc: service.DecryptWithJWT,
			expectError: true,
			errorMsg:    "ciphertext too short",
		},
		{
			name:        "Corrupted ciphertext - master",
			ciphertext:  "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbW5vcA==", // Valid base64 but corrupted data
			decryptFunc: service.DecryptWithMaster,
			expectError: true,
			errorMsg:    "failed to decrypt",
		},
		{
			name:        "Corrupted ciphertext - JWT",
			ciphertext:  "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwYWJjZGVmZ2hpamtsbW5vcA==", // Valid base64 but corrupted data
			decryptFunc: service.DecryptWithJWT,
			expectError: true,
			errorMsg:    "failed to decrypt",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := tt.decryptFunc(tt.ciphertext)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Empty(t, result)
			} else {
				assert.NoError(t, err)
				// For empty ciphertext tests, result will be empty
				if tt.ciphertext == "" {
					assert.Empty(t, result)
				}
			}
		})
	}
}

func TestCrossKeyDecryption(t *testing.T) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	plaintext := "test message"

	// Encrypt with master key
	encryptedWithMaster, err := service.EncryptWithMaster(plaintext)
	require.NoError(t, err)

	// Encrypt with JWT key
	encryptedWithJWT, err := service.EncryptWithJWT(plaintext)
	require.NoError(t, err)

	// Try to decrypt master-encrypted data with JWT key (should fail)
	_, err = service.DecryptWithJWT(encryptedWithMaster)
	assert.Error(t, err, "Should not be able to decrypt master-encrypted data with JWT key")

	// Try to decrypt JWT-encrypted data with master key (should fail)
	_, err = service.DecryptWithMaster(encryptedWithJWT)
	assert.Error(t, err, "Should not be able to decrypt JWT-encrypted data with master key")
}

func TestServiceIsolation(t *testing.T) {
	// Create two services with different parameters
	service1 := NewServiceWithJwtLey("/path1", "jwt-key1")
	service2 := NewServiceWithJwtLey("/path2", "jwt-key2")

	plaintext := "test message"

	// Encrypt with service1
	encrypted1, err := service1.EncryptWithMaster(plaintext)
	require.NoError(t, err)

	// Try to decrypt with service2 (should fail due to different master key)
	_, err = service2.DecryptWithMaster(encrypted1)
	assert.Error(t, err, "Service with different database path should not be able to decrypt")

	// Test JWT encryption isolation
	encryptedJWT1, err := service1.EncryptWithJWT(plaintext)
	require.NoError(t, err)

	_, err = service2.DecryptWithJWT(encryptedJWT1)
	assert.Error(t, err, "Service with different JWT key should not be able to decrypt")
}

func TestLargeDataEncryption(t *testing.T) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	// Test with large data (1MB)
	largeData := make([]byte, 1024*1024)
	_, err := rand.Read(largeData)
	require.NoError(t, err)

	plaintext := string(largeData)

	// Encrypt
	encrypted, err := service.EncryptWithMaster(plaintext)
	assert.NoError(t, err)
	assert.NotEmpty(t, encrypted)

	// Decrypt
	decrypted, err := service.DecryptWithMaster(encrypted)
	assert.NoError(t, err)
	assert.Equal(t, plaintext, decrypted)
}

func TestConcurrentEncryption(t *testing.T) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	const numGoroutines = 100
	const numOperations = 10

	results := make(chan error, numGoroutines*numOperations*2) // *2 for encrypt+decrypt

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			for j := 0; j < numOperations; j++ {
				plaintext := fmt.Sprintf("test message %d-%d", id, j)

				// Encrypt
				encrypted, err := service.EncryptWithMaster(plaintext)
				if err != nil {
					results <- err
					continue
				}

				// Decrypt
				decrypted, err := service.DecryptWithMaster(encrypted)
				if err != nil {
					results <- err
					continue
				}

				if decrypted != plaintext {
					results <- fmt.Errorf("decrypted text doesn't match: expected %s, got %s", plaintext, decrypted)
					continue
				}

				results <- nil // Success
			}
		}(i)
	}

	// Collect results
	for i := 0; i < numGoroutines*numOperations; i++ {
		err := <-results
		assert.NoError(t, err, "Concurrent encryption/decryption should not fail")
	}
}

func TestKeyDerivationConsistency(t *testing.T) {
	// Test that key derivation is consistent across multiple service creations
	dbPath := "/consistent/test/path"
	jwtKey := "consistent-jwt-key"

	var masterKeys [][]byte
	var jwtKeys [][]byte

	// Create multiple services with same parameters
	for i := 0; i < 10; i++ {
		service := NewServiceWithJwtLey(dbPath, jwtKey)

		masterKeys = append(masterKeys, service.masterKey)
		jwtKeys = append(jwtKeys, service.jwtKey)
	}

	// All master keys should be identical
	for i := 1; i < len(masterKeys); i++ {
		assert.Equal(t, masterKeys[0], masterKeys[i], "Master keys should be consistent")
	}

	// All JWT keys should be identical
	for i := 1; i < len(jwtKeys); i++ {
		assert.Equal(t, jwtKeys[0], jwtKeys[i], "JWT keys should be consistent")
	}
}

func BenchmarkEncryptWithMaster(b *testing.B) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	plaintext := "This is a test message for benchmarking encryption performance"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.EncryptWithMaster(plaintext)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkDecryptWithMaster(b *testing.B) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	plaintext := "This is a test message for benchmarking decryption performance"
	encrypted, err := service.EncryptWithMaster(plaintext)
	require.NoError(b, err)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.DecryptWithMaster(encrypted)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkEncryptWithJWT(b *testing.B) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	plaintext := "This is a test JWT secret for benchmarking"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.EncryptWithJWT(plaintext)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkDecryptWithJWT(b *testing.B) {
	service := NewServiceWithJwtLey("/test/path", "jwt-key")

	plaintext := "This is a test JWT secret for benchmarking"
	encrypted, err := service.EncryptWithJWT(plaintext)
	require.NoError(b, err)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.DecryptWithJWT(encrypted)
		if err != nil {
			b.Fatal(err)
		}
	}
}
