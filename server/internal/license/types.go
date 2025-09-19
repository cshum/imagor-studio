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
	LicenseType    *string `json:"licenseType"`
	Email          *string `json:"email"`
	Message        string  `json:"message"`
	SupportMessage *string `json:"supportMessage"`
}
