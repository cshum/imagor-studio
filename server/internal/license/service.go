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
	// Get license key from registry
	entry, err := s.registry.Get(ctx, registrystore.SystemOwnerID, "license.key")
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

	// Validate license key using simple validation for testing
	isValid, licenseType, email := ValidateLicenseKey(entry.Value)
	if !isValid {
		return &LicenseStatus{
			IsLicensed:     false,
			Message:        "Invalid license key",
			SupportMessage: stringPtr("Please check your license key"),
		}, nil
	}

	return &LicenseStatus{
		IsLicensed:  true,
		LicenseType: &licenseType,
		Email:       &email,
		Message:     "Licensed",
	}, nil
}

func (s *Service) ActivateLicense(ctx context.Context, licenseKey string) (*LicenseStatus, error) {
	// Validate license key using simple validation for testing
	isValid, licenseType, email := ValidateLicenseKey(licenseKey)
	if !isValid {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    "Invalid license key",
		}, nil
	}

	// Store in registry
	_, err := s.registry.Set(ctx, registrystore.SystemOwnerID, "license.key", licenseKey, true)
	if err != nil {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    "Failed to save license key",
		}, err
	}

	return &LicenseStatus{
		IsLicensed:  true,
		LicenseType: &licenseType,
		Email:       &email,
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
