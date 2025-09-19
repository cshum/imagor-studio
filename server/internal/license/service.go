package license

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/registrystore"
)

type Service struct {
	registry  registrystore.Store
	publicKey ed25519.PublicKey
}

func NewService(registry registrystore.Store) *Service {
	return &Service{
		registry:  registry,
		publicKey: LicensePublicKey,
	}
}

func (s *Service) GetLicenseStatus(ctx context.Context) (*LicenseStatus, error) {
	// Check if public key is configured
	if !HasValidPublicKey() {
		return &LicenseStatus{
			IsLicensed:     false,
			Message:        "License system not configured",
			SupportMessage: stringPtr("Support ongoing development with a license"),
		}, nil
	}

	// Get license key from registry
	entry, err := s.registry.Get(ctx, "system", "license_key")
	if err != nil {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    "Error checking license",
		}, err
	}

	if entry == nil {
		return &LicenseStatus{
			IsLicensed:     false,
			Message:        "No license found",
			SupportMessage: stringPtr("Support ongoing development with a license"),
		}, nil
	}

	// Verify license key
	payload, err := s.verifyLicense(entry.Value)
	if err != nil {
		return &LicenseStatus{
			IsLicensed:     false,
			Message:        fmt.Sprintf("Invalid license: %v", err),
			SupportMessage: stringPtr("Please check your license key"),
		}, nil
	}

	return &LicenseStatus{
		IsLicensed:  true,
		LicenseType: &payload.Type,
		Email:       &payload.Email,
		Message:     "Licensed - Thank you for supporting development!",
	}, nil
}

func (s *Service) ActivateLicense(ctx context.Context, licenseKey string) (*LicenseStatus, error) {
	// Check if public key is configured
	if !HasValidPublicKey() {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    "License system not configured",
		}, nil
	}

	// Verify the license key first
	payload, err := s.verifyLicense(licenseKey)
	if err != nil {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    fmt.Sprintf("Invalid license key: %v", err),
		}, nil
	}

	// Store in registry
	_, err = s.registry.Set(ctx, "system", "license_key", licenseKey, false)
	if err != nil {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    "Failed to save license key",
		}, err
	}

	return &LicenseStatus{
		IsLicensed:  true,
		LicenseType: &payload.Type,
		Email:       &payload.Email,
		Message:     "License activated successfully! Thank you for supporting development.",
	}, nil
}

func (s *Service) verifyLicense(licenseKey string) (*LicensePayload, error) {
	if !strings.HasPrefix(licenseKey, "IMGR-") {
		return nil, fmt.Errorf("invalid license key format")
	}

	parts := strings.Split(licenseKey[5:], ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid license key structure")
	}

	// Decode payload and signature
	payloadBytes, err := base64.URLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid payload encoding")
	}

	signature, err := base64.URLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid signature encoding")
	}

	// Verify signature
	if !ed25519.Verify(s.publicKey, payloadBytes, signature) {
		return nil, fmt.Errorf("invalid license signature")
	}

	// Parse payload
	var payload LicensePayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("invalid payload format")
	}

	// Check expiry (if set)
	if payload.ExpiresAt != nil && time.Now().Unix() > *payload.ExpiresAt {
		return nil, fmt.Errorf("license expired")
	}

	return &payload, nil
}

func stringPtr(s string) *string {
	return &s
}
