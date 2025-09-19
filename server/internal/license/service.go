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

	// Use real cryptographic verification
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
		Message:     "Licensed",
	}, nil
}

func (s *Service) ActivateLicense(ctx context.Context, licenseKey string) (*LicenseStatus, error) {
	// Use real cryptographic verification
	payload, err := s.verifyLicense(licenseKey)
	if err != nil {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    fmt.Sprintf("Invalid license key: %v", err),
		}, nil
	}

	// Store in registry
	_, err = s.registry.Set(ctx, registrystore.SystemOwnerID, "license.key", licenseKey, true)
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

	// Verify signature
	if !ed25519.Verify(s.publicKey, payloadBytes, signature) {
		return nil, fmt.Errorf("invalid license signature")
	}

	// Parse payload
	var payload LicensePayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("invalid payload format: %w", err)
	}

	// Check expiry (if set)
	if payload.ExpiresAt != nil && time.Now().Unix() > *payload.ExpiresAt {
		return nil, fmt.Errorf("license expired")
	}

	return &payload, nil
}

// GetPublicLicenseStatus retrieves license status without sensitive information
// This method is safe to call without authentication
func (s *Service) GetPublicLicenseStatus(ctx context.Context) (*PublicLicenseStatus, error) {
	// Get license key from registry
	entry, err := s.registry.Get(ctx, registrystore.SystemOwnerID, "license.key")
	if err != nil {
		// Don't expose internal errors publicly
		return &PublicLicenseStatus{
			IsLicensed:     false,
			Message:        "Support ongoing development",
			SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
		}, nil
	}

	if entry == nil {
		return &PublicLicenseStatus{
			IsLicensed:     false,
			Message:        "Support ongoing development",
			SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
		}, nil
	}

	// Verify the license key
	payload, err := s.verifyLicense(entry.Value)
	if err != nil {
		// Don't expose verification errors publicly
		return &PublicLicenseStatus{
			IsLicensed:     false,
			Message:        "Support ongoing development",
			SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
		}, nil
	}

	// Return public-safe information
	return &PublicLicenseStatus{
		IsLicensed:  true,
		LicenseType: &payload.Type,
		Message:     "Licensed",
		Features:    getFeaturesByType(payload.Type),
	}, nil
}

// getFeaturesByType returns the features available for a license type
func getFeaturesByType(licenseType string) []string {
	switch licenseType {
	case "personal":
		return []string{"batch_export", "api_access"}
	case "commercial":
		return []string{"batch_export", "api_access", "white_label", "priority_support"}
	case "enterprise":
		return []string{"batch_export", "api_access", "white_label", "priority_support", "custom_branding", "sso"}
	default:
		return []string{}
	}
}

func stringPtr(s string) *string {
	return &s
}
