package license

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Public key for license verification
var LicensePublicKey = ed25519.PublicKey{
	0xbf, 0x92, 0x13, 0xf9, 0xfb, 0xd9, 0x3d, 0x43,
	0x99, 0x22, 0x4a, 0x69, 0xd1, 0xf7, 0x3e, 0x7d,
	0xe8, 0x4f, 0x9c, 0xca, 0xa3, 0xde, 0x5d, 0x00,
	0x0f, 0x9e, 0xa2, 0xb2, 0xff, 0x2e, 0x07, 0xf7,
}

// GenerateSignedLicense creates a cryptographically signed license key using Ed25519
func GenerateSignedLicense(privateKey ed25519.PrivateKey, licenseType, email string) (string, error) {
	if len(privateKey) != ed25519.PrivateKeySize {
		return "", fmt.Errorf("invalid private key size")
	}

	// Create license payload with proper structure
	payload := LicensePayload{
		Type:     licenseType,
		Email:    email,
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
