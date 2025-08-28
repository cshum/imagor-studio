package httphandler

import (
	"encoding/json"
	"net/http"

	"github.com/cshum/imagor-studio/server/internal/imageservice"
	"go.uber.org/zap"
)

type ImagorMetaHandler struct {
	imageService imageservice.Service
	logger       *zap.Logger
}

func NewImagorMetaHandler(imageService imageservice.Service, logger *zap.Logger) http.Handler {
	h := &ImagorMetaHandler{
		imageService: imageService,
		logger:       logger,
	}
	return http.HandlerFunc(h.handleImagorMeta)
}

func (h *ImagorMetaHandler) handleImagorMeta(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get image path from query parameter
	imagePath := r.URL.Query().Get("path")
	if imagePath == "" {
		http.Error(w, "Missing 'path' query parameter", http.StatusBadRequest)
		return
	}

	// Fetch metadata from imagor
	metadata, err := h.imageService.GetMetadata(r.Context(), imagePath)
	if err != nil {
		h.logger.Error("Failed to fetch imagor metadata",
			zap.String("path", imagePath),
			zap.Error(err))
		http.Error(w, "Failed to fetch imagor metadata", http.StatusInternalServerError)
		return
	}

	// Set response headers
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	// Encode and send response
	if err := json.NewEncoder(w).Encode(metadata); err != nil {
		h.logger.Error("Failed to encode imagor metadata response", zap.Error(err))
		return
	}
}
