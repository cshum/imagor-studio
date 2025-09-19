package httphandler

import (
	"encoding/json"
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
	return Handle(http.MethodGet, func(w http.ResponseWriter, r *http.Request) error {
		// Use the unified method with includeDetails=false for public access
		status, err := h.licenseService.GetLicenseStatus(r.Context(), false)
		if err != nil {
			h.logger.Error("Failed to get public license status", zap.Error(err))
			// Return a safe default status instead of exposing the error
			status = &license.LicenseStatus{
				IsLicensed:     false,
				Message:        "Support ongoing development",
				SupportMessage: stringPtr("From the creator of imagor & vipsgen"),
			}
		}

		return WriteSuccess(w, status)
	})
}

// ActivateLicense activates a license with the provided key (no authentication required)
func (h *LicenseHandler) ActivateLicense() http.HandlerFunc {
	return Handle(http.MethodPost, func(w http.ResponseWriter, r *http.Request) error {
		var request struct {
			Key string `json:"key"`
		}

		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		}

		if request.Key == "" {
			return WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "License key is required"})
		}

		status, err := h.licenseService.ActivateLicense(r.Context(), request.Key)
		if err != nil {
			h.logger.Error("Failed to activate license", zap.Error(err))
			return WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "Failed to activate license: " + err.Error()})
		}

		return WriteSuccess(w, status)
	})
}

// GetAdminStatus returns detailed license status for authenticated admin users
func (h *LicenseHandler) GetAdminStatus() http.HandlerFunc {
	return Handle(http.MethodGet, func(w http.ResponseWriter, r *http.Request) error {
		// Use the unified method with includeDetails=true for admin access
		status, err := h.licenseService.GetLicenseStatus(r.Context(), true)
		if err != nil {
			h.logger.Error("Failed to get admin license status", zap.Error(err))
			return WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get license status"})
		}

		return WriteSuccess(w, status)
	})
}

func stringPtr(s string) *string {
	return &s
}
