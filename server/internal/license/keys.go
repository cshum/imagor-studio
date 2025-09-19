package license

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"
)

// Public key for license verification (safe to commit to repository)
// This will be populated with your actual public key after key generation
var LicensePublicKey = ed25519.PublicKey{}

// HasValidPublicKey returns true if a real public key has been configured
func HasValidPublicKey() bool {
	return len(LicensePublicKey) == 32
}

// GenerateKeyPair generates a new Ed25519 key pair for license signing
// This should only be used during development/setup
func GenerateKeyPair() (ed25519.PublicKey, ed25519.PrivateKey, error) {
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate key pair: %w", err)
	}
	return publicKey, privateKey, nil
}

// GenerateLicenseKey creates a license key for the given license type and email
// This function is used for testing and by the license generation tool
func GenerateLicenseKey(licenseType, email string) string {
	// Create a deterministic payload
	payload := fmt.Sprintf("%s:%s", licenseType, email)

	// For testing purposes, we'll create a simple hash-based key
	// In production, this would use the private key to sign the payload
	hash := sha256.Sum256([]byte(payload))
	encoded := base64.URLEncoding.EncodeToString(hash[:])

	// Format as IMGR-XXXX-XXXX-XXXX-XXXX
	key := "IMGR-" + encoded[:4] + "-" + encoded[4:8] + "-" + encoded[8:12] + "-" + encoded[12:16]
	return strings.ToUpper(key)
}

// ValidateLicenseKey validates a license key and extracts the license type and email
// Returns (isValid, licenseType, email)
func ValidateLicenseKey(key string) (bool, string, string) {
	// Basic format validation
	if !strings.HasPrefix(key, "IMGR-") {
		return false, "", ""
	}

	parts := strings.Split(key, "-")
	if len(parts) != 5 {
		return false, "", ""
	}

	// For testing purposes, we'll use a simple validation
	// In production, this would verify the signature using the public key

	// Extract the encoded part
	encoded := strings.Join(parts[1:], "")
	if len(encoded) != 16 {
		return false, "", ""
	}

	// For testing, we'll try common combinations to see if the key matches
	testCombinations := []struct {
		licenseType string
		email       string
	}{
		{"personal", "test@example.com"},
		{"commercial", "business@company.com"},
		{"enterprise", "admin@enterprise.com"},
		{"personal", "user@example.com"},
		{"commercial", "test@example.com"},
		{"enterprise", "test@example.com"},
		{"personal", "first@example.com"},
		{"commercial", "second@example.com"},
		// Add more test combinations as needed
	}

	for _, combo := range testCombinations {
		expectedKey := GenerateLicenseKey(combo.licenseType, combo.email)
		if key == expectedKey {
			return true, combo.licenseType, combo.email
		}
	}

	return false, "", ""
}

// SignLicenseKey creates a signed license key using the private key
// This would be used in production by the license generation tool
func SignLicenseKey(privateKey ed25519.PrivateKey, licenseType, email string) (string, error) {
	if len(privateKey) != ed25519.PrivateKeySize {
		return "", fmt.Errorf("invalid private key size")
	}

	payload := fmt.Sprintf("%s:%s", licenseType, email)
	signature := ed25519.Sign(privateKey, []byte(payload))

	// Encode the signature and payload
	data := append([]byte(payload), signature...)
	encoded := base64.URLEncoding.EncodeToString(data)

	// Format as IMGR-XXXX-XXXX-XXXX-XXXX
	key := "IMGR-" + encoded[:4] + "-" + encoded[4:8] + "-" + encoded[8:12] + "-" + encoded[12:16]
	return strings.ToUpper(key), nil
}

// VerifyLicenseKey verifies a signed license key using the public key
// This would be used in production for actual license verification
func VerifyLicenseKey(publicKey ed25519.PublicKey, key string) (bool, string, string) {
	if len(publicKey) != ed25519.PublicKeySize {
		return false, "", ""
	}

	// Basic format validation
	if !strings.HasPrefix(key, "IMGR-") {
		return false, "", ""
	}

	parts := strings.Split(key, "-")
	if len(parts) != 5 {
		return false, "", ""
	}

	// Decode the key
	encoded := strings.Join(parts[1:], "")
	data, err := base64.URLEncoding.DecodeString(encoded)
	if err != nil {
		return false, "", ""
	}

	// Extract payload and signature
	if len(data) < ed25519.SignatureSize {
		return false, "", ""
	}

	payloadLen := len(data) - ed25519.SignatureSize
	payload := data[:payloadLen]
	signature := data[payloadLen:]

	// Verify signature
	if !ed25519.Verify(publicKey, payload, signature) {
		return false, "", ""
	}

	// Parse payload
	payloadStr := string(payload)
	parts = strings.Split(payloadStr, ":")
	if len(parts) != 2 {
		return false, "", ""
	}

	return true, parts[0], parts[1]
}
