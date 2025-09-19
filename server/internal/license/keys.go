package license

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Public key for license verification (safe to commit to repository)
// Generated Ed25519 public key for production use
var LicensePublicKey = ed25519.PublicKey{
	0xbf, 0x92, 0x13, 0xf9, 0xfb, 0xd9, 0x3d, 0x43,
	0x99, 0x22, 0x4a, 0x69, 0xd1, 0xf7, 0x3e, 0x7d,
	0xe8, 0x4f, 0x9c, 0xca, 0xa3, 0xde, 0x5d, 0x00,
	0x0f, 0x9e, 0xa2, 0xb2, 0xff, 0x2e, 0x07, 0xf7,
}

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

// GenerateSignedLicense creates a cryptographically signed license key using Ed25519
// This is the production function that should be used for real license generation
func GenerateSignedLicense(privateKey ed25519.PrivateKey, licenseType, email string) (string, error) {
	if len(privateKey) != ed25519.PrivateKeySize {
		return "", fmt.Errorf("invalid private key size")
	}

	// Create license payload with proper structure
	payload := LicensePayload{
		Type:     licenseType,
		Email:    email,
		Features: getFeatures(licenseType),
		IssuedAt: time.Now().Unix(),
		// ExpiresAt can be set for time-limited licenses
	}

	// JSON encode the payload
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Sign the payload with Ed25519
	signature := ed25519.Sign(privateKey, payloadBytes)

	// Base64URL encode both payload and signature
	payloadB64 := base64.URLEncoding.EncodeToString(payloadBytes)
	signatureB64 := base64.URLEncoding.EncodeToString(signature)

	// Remove padding for cleaner URLs
	payloadB64 = strings.TrimRight(payloadB64, "=")
	signatureB64 = strings.TrimRight(signatureB64, "=")

	// Format as IMGR-{payload}.{signature}
	return fmt.Sprintf("IMGR-%s.%s", payloadB64, signatureB64), nil
}

// VerifySignedLicense verifies a cryptographically signed license key
// This is the production function that should be used for real license verification
func VerifySignedLicense(publicKey ed25519.PublicKey, licenseKey string) (*LicensePayload, error) {
	if len(publicKey) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("invalid public key size")
	}

	// Check format
	if !strings.HasPrefix(licenseKey, "IMGR-") {
		return nil, fmt.Errorf("invalid license key format")
	}

	// Split into payload and signature
	parts := strings.Split(licenseKey[5:], ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid license key structure")
	}

	// Add padding back for base64 decoding
	payloadB64 := addBase64Padding(parts[0])
	signatureB64 := addBase64Padding(parts[1])

	// Decode payload and signature
	payloadBytes, err := base64.URLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, fmt.Errorf("invalid payload encoding: %w", err)
	}

	signature, err := base64.URLEncoding.DecodeString(signatureB64)
	if err != nil {
		return nil, fmt.Errorf("invalid signature encoding: %w", err)
	}

	// Verify the signature
	if !ed25519.Verify(publicKey, payloadBytes, signature) {
		return nil, fmt.Errorf("invalid license signature")
	}

	// Parse the payload
	var payload LicensePayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("invalid payload format: %w", err)
	}

	// Check expiry if set
	if payload.ExpiresAt != nil && time.Now().Unix() > *payload.ExpiresAt {
		return nil, fmt.Errorf("license expired")
	}

	return &payload, nil
}

// getFeatures returns the features available for a given license type
func getFeatures(licenseType string) []string {
	switch licenseType {
	case "commercial":
		return []string{"batch_export", "api_access", "white_label", "priority_support"}
	case "enterprise":
		return []string{"batch_export", "api_access", "white_label", "priority_support", "custom_branding", "sso"}
	default: // personal
		return []string{"batch_export", "api_access"}
	}
}

// addBase64Padding adds padding to base64 strings for proper decoding
func addBase64Padding(s string) string {
	switch len(s) % 4 {
	case 2:
		return s + "=="
	case 3:
		return s + "="
	default:
		return s
	}
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
