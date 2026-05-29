package licensekey

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type Payload struct {
	Type      string `json:"type"`
	Email     string `json:"email"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt *int64 `json:"exp,omitempty"`
}

func GenerateSignedLicense(privateKey ed25519.PrivateKey, licenseType, email string) (string, error) {
	if len(privateKey) != ed25519.PrivateKeySize {
		return "", fmt.Errorf("invalid private key size")
	}

	payload := Payload{
		Type:     licenseType,
		Email:    email,
		IssuedAt: time.Now().Unix(),
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal payload: %w", err)
	}

	signature := ed25519.Sign(privateKey, payloadBytes)
	payloadB64 := strings.TrimRight(base64.URLEncoding.EncodeToString(payloadBytes), "=")
	signatureB64 := strings.TrimRight(base64.URLEncoding.EncodeToString(signature), "=")

	return fmt.Sprintf("IMGR-%s.%s", payloadB64, signatureB64), nil
}

func VerifySignedLicense(publicKey ed25519.PublicKey, licenseKey string) (*Payload, error) {
	if len(publicKey) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("invalid public key size")
	}
	if !strings.HasPrefix(licenseKey, "IMGR-") {
		return nil, fmt.Errorf("invalid license key format")
	}

	parts := strings.Split(licenseKey[5:], ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid license key structure")
	}

	payloadBytes, err := base64.URLEncoding.DecodeString(addBase64Padding(parts[0]))
	if err != nil {
		return nil, fmt.Errorf("invalid payload encoding: %w", err)
	}
	signature, err := base64.URLEncoding.DecodeString(addBase64Padding(parts[1]))
	if err != nil {
		return nil, fmt.Errorf("invalid signature encoding: %w", err)
	}

	if !ed25519.Verify(publicKey, payloadBytes, signature) {
		return nil, fmt.Errorf("invalid license signature")
	}

	var payload Payload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("invalid payload format: %w", err)
	}
	if payload.ExpiresAt != nil && time.Now().Unix() > *payload.ExpiresAt {
		return nil, fmt.Errorf("license expired")
	}

	return &payload, nil
}

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
