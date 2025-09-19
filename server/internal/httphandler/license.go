package httphandler

import (
	"net/http"

	"github.com/cshum/imagor-studio/server/internal/license"
	"go.uber.org/zap"
)

type LicenseHandler struct {
	licenseService *license.Service
	logger         *zap.Logger
}

func NewLicenseHandler(licenseService *license.Service, logger *zap.Logger) *LicenseHandler {
	return &LicenseHandler{
		licenseService: licenseService,
		logger:         logger,
	}
}

// GetPublicStatus returns the public license status (no authentication required)
func (h *LicenseHandler) GetPublicStatus() http.HandlerFunc {
	return Handle("GET", func(w http.ResponseWriter, r *http.Request) error {
		status, err := h.licenseService.GetPublicLicenseStatus(r.Context())
		if err != nil {
			h.logger.Error("Failed to get public license status", zap.Error(err))
			// Return a safe default status instead of exposing the error
			status = &license.PublicLicenseStatus{
				IsLicensed:     false,
				Message:        "Support ongoing development",
				SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
				Features:       []string{},
			}
		}
		return WriteSuccess(w, status)
	})
}

func stringPtr(s string) *string {
	return &s
}
