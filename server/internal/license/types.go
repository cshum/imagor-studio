package license

type LicensePayload struct {
	Type      string `json:"type"`
	Email     string `json:"email"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt *int64 `json:"exp,omitempty"`
}

// LicenseStatus represents license status information with optional detailed fields
type LicenseStatus struct {
	IsLicensed           bool   `json:"isLicensed"`
	LicenseType          string `json:"licenseType"`
	Email                string `json:"email"`
	Message              string `json:"message"`
	IsOverriddenByConfig bool   `json:"isOverriddenByConfig"`

	// Optional detailed fields (only populated when includeDetails=true)
	SupportMessage   *string `json:"supportMessage,omitempty"`
	MaskedLicenseKey *string `json:"maskedLicenseKey,omitempty"`
	ActivatedAt      *string `json:"activatedAt,omitempty"`
}
