package license

type LicensePayload struct {
	Type      string   `json:"type"`
	Email     string   `json:"email"`
	Features  []string `json:"features"`
	IssuedAt  int64    `json:"iat"`
	ExpiresAt *int64   `json:"exp,omitempty"`
}

type LicenseStatus struct {
	IsLicensed     bool    `json:"isLicensed"`
	LicenseType    *string `json:"licenseType,omitempty"`
	Email          *string `json:"email,omitempty"`
	Message        string  `json:"message"`
	SupportMessage *string `json:"supportMessage,omitempty"`
}

// PublicLicenseStatus represents license status information safe for public access
type PublicLicenseStatus struct {
	IsLicensed     bool     `json:"isLicensed"`
	LicenseType    *string  `json:"licenseType,omitempty"`
	Message        string   `json:"message"`
	SupportMessage *string  `json:"supportMessage,omitempty"`
	Features       []string `json:"features"`
}
