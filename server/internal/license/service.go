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
	"github.com/cshum/imagor-studio/server/internal/registryutil"
)

type Service struct {
	registry  registrystore.Store
	config    registryutil.ConfigProvider
	publicKey ed25519.PublicKey
}

func NewService(registry registrystore.Store, config registryutil.ConfigProvider) *Service {
	return &Service{
		registry:  registry,
		config:    config,
		publicKey: LicensePublicKey,
	}
}

// GetLicenseStatus retrieves license status with optional detailed information
// includeDetails=false: Safe for public/unauthenticated access (no sensitive info)
// includeDetails=true: Full details for authenticated/admin users
func (s *Service) GetLicenseStatus(ctx context.Context, includeDetails bool) (*LicenseStatus, error) {
	// Use registryutil to get effective value with config override support
	result := registryutil.GetEffectiveValue(ctx, s.registry, s.config, "config.license_key")
	
	if !result.Exists || result.Value == "" {
		return s.buildUnlicensedStatus(includeDetails, result.IsOverriddenByConfig), nil
	}
	
	// Verify the license key
	payload, err := s.verifyLicense(result.Value)
	if err != nil {
		if includeDetails {
			// For authenticated users, show the actual error
			return &LicenseStatus{
				IsLicensed:           false,
				Message:              fmt.Sprintf("Invalid license: %v", err),
				IsOverriddenByConfig: result.IsOverriddenByConfig,
				Features:             []string{},
			}, nil
		} else {
			// For public access, don't expose verification errors
			return s.buildUnlicensedStatus(false, result.IsOverriddenByConfig), nil
		}
	}
	
	status := &LicenseStatus{
		IsLicensed:           true,
		LicenseType:          payload.Type,
		Features:             getFeaturesByType(payload.Type),
		Message:              "Licensed",
		IsOverriddenByConfig: result.IsOverriddenByConfig,
	}
	
	if includeDetails {
		// Add detailed information for authenticated users
		status.Email = payload.Email
		maskedKey := maskLicenseKey(result.Value)
		status.MaskedLicenseKey = &maskedKey
		activatedAt := time.Unix(payload.IssuedAt, 0).Format("January 2, 2006")
		status.ActivatedAt = &activatedAt
	} else {
		// For public access, don't include sensitive information
		status.Email = ""
	}
	
	return status, nil
}

// ActivateLicense validates and stores a new license key
func (s *Service) ActivateLicense(ctx context.Context, licenseKey string) (*LicenseStatus, error) {
	// Check if license key is overridden by config (CLI/env)
	_, configExists := s.config.GetByRegistryKey("config.license_key")
	if configExists {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    "Cannot set license key: this configuration is managed by external config",
			Features:   []string{},
		}, nil
	}
	
	// Verify the license key first
	payload, err := s.verifyLicense(licenseKey)
	if err != nil {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    fmt.Sprintf("Invalid license key: %v", err),
			Features:   []string{},
		}, nil
	}
	
	// Store in registry as config.license_key (encrypted)
	_, err = s.registry.Set(ctx, registrystore.SystemOwnerID, "config.license_key", licenseKey, true)
	if err != nil {
		return &LicenseStatus{
			IsLicensed: false,
			Message:    "Failed to save license key",
			Features:   []string{},
		}, err
	}
	
	return &LicenseStatus{
		IsLicensed:  true,
		LicenseType: payload.Type,
		Features:    getFeaturesByType(payload.Type),
		Email:       payload.Email,
		Message:     "License activated successfully",
	}, nil
}


// PRIVATE HELPER METHODS

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

func (s *Service) buildUnlicensedStatus(includeDetails bool, isOverriddenByConfig bool) *LicenseStatus {
	status := &LicenseStatus{
		IsLicensed:           false,
		Message:              "Support ongoing development",
		IsOverriddenByConfig: isOverriddenByConfig,
		Features:             []string{},
	}
	
	if !includeDetails {
		// For public access, add support message
		status.SupportMessage = stringPtr("From the creator of imagor & vipsgen")
	} else {
		// For authenticated users, show more specific message
		if isOverriddenByConfig {
			status.Message = "No license key found (configuration managed externally)"
		} else {
			status.Message = "No license key found"
		}
	}
	
	return status
}

// getFeaturesByType returns the features available for a license type
func getFeaturesByType(licenseType string) []string {
	switch licenseType {
	case "early_bird":
		return []string{"full_access"}
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

// formatLicenseTypeForDisplay converts license type to display-friendly format
func formatLicenseTypeForDisplay(licenseType string) string {
	switch licenseType {
	case "early_bird":
		return "Early Bird Licensed"
	case "commercial":
		return "Commercial Licensed"
	case "enterprise":
		return "Enterprise Licensed"
	default:
		return "Licensed"
	}
}

// maskLicenseKey masks a license key for display (shows first 8 and last 4 characters)
func maskLicenseKey(licenseKey string) string {
	if len(licenseKey) <= 12 {
		return licenseKey // Too short to mask meaningfully
	}
	
	return licenseKey[:8] + "..." + licenseKey[len(licenseKey)-4:]
}

func stringPtr(s string) *string {
	return &s
}
