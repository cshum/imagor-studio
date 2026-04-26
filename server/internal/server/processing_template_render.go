package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"

	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/cshum/imagor/imagorpath"
	"go.uber.org/zap"
)

func registerProcessingInternalRoutes(mux *http.ServeMux, services *bootstrap.Services) {
	if services == nil || services.SpaceConfigStore == nil || services.ProcessingConfig == nil || services.ImagorProvider == nil {
		return
	}

	mux.HandleFunc(sharedprocessing.InternalTemplatePreviewRenderPath, newProcessingTemplatePreviewRenderHandler(
		services.ImagorProvider.Imagor(),
		services.SpaceConfigStore,
		services.ProcessingConfig.Runtime.SpaceBaseDomain,
		services.ProcessingConfig.Runtime.InternalAPISecret,
		services.Logger,
	))
}

func newProcessingTemplatePreviewRenderHandler(imagorHandler http.Handler, spaceConfigStore sharedprocessing.SpaceConfigReader, baseDomain, internalAPISecret string, logger *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}
		if imagorHandler == nil || spaceConfigStore == nil {
			http.Error(w, "processing render service unavailable", http.StatusServiceUnavailable)
			return
		}
		if strings.TrimSpace(internalAPISecret) == "" || r.Header.Get(sharedprocessing.InternalAPISecretHeader) != internalAPISecret {
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}

		var req sharedprocessing.TemplatePreviewRenderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, fmt.Sprintf("invalid render request: %v", err), http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(req.SpaceKey) == "" {
			http.Error(w, "spaceKey is required", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(req.SourceImagePath) == "" {
			http.Error(w, "sourceImagePath is required", http.StatusBadRequest)
			return
		}

		spaceConfig, ok := spaceConfigStore.Get(req.SpaceKey)
		if !ok || spaceConfig == nil {
			http.Error(w, "space config not found", http.StatusNotFound)
			return
		}

		imagorPath, err := generateProcessingImagorPath(req.SourceImagePath, req.PreviewParams, spaceConfig)
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to generate imagor path: %v", err), http.StatusBadRequest)
			return
		}

		host, err := processingRenderHost(req.SpaceKey, spaceConfig, baseDomain)
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to resolve processing host: %v", err), http.StatusBadRequest)
			return
		}

		imagorReq, err := http.NewRequestWithContext(r.Context(), http.MethodGet, imagorPath, nil)
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to create imagor request: %v", err), http.StatusInternalServerError)
			return
		}
		imagorReq = imagorReq.WithContext(sharedprocessing.WithRequestMetadata(imagorReq.Context(), sharedprocessing.RequestMetadata{
			OrgID:   spaceConfig.GetOrgID(),
			SpaceID: spaceConfig.GetKey(),
			Class:   sharedprocessing.UsageClassInternalNonBillable,
		}))
		imagorReq.Host = host

		recorder := httptest.NewRecorder()
		imagorHandler.ServeHTTP(recorder, imagorReq)
		if recorder.Code != http.StatusOK {
			logger.Warn("internal template preview render failed",
				zap.Int("status", recorder.Code),
				zap.String("spaceKey", req.SpaceKey),
				zap.String("host", host),
				zap.String("path", imagorPath),
			)
			http.Error(w, fmt.Sprintf("imagor returned status %d", recorder.Code), http.StatusBadGateway)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(sharedprocessing.TemplatePreviewRenderResponse{
			Image:       recorder.Body.Bytes(),
			ContentType: recorder.Header().Get("Content-Type"),
		})
	}
}

func processingRenderHost(spaceKey string, spaceConfig sharedprocessing.SpaceConfig, baseDomain string) (string, error) {
	normalizedBaseDomain := strings.TrimPrefix(strings.TrimSpace(baseDomain), ".")
	if normalizedBaseDomain != "" {
		return spaceKey + "." + normalizedBaseDomain, nil
	}
	if customDomain := strings.TrimSpace(spaceConfig.GetCustomDomain()); customDomain != "" {
		return customDomain, nil
	}
	return "", fmt.Errorf("no base domain or custom domain available for space %q", spaceKey)
}

func generateProcessingImagorPath(imagePath string, params imagorpath.Params, spaceConfig sharedprocessing.SpaceConfig) (string, error) {
	if strings.TrimSpace(spaceConfig.GetImagorSecret()) == "" {
		return "", fmt.Errorf("space %q has no imagor secret", spaceConfig.GetKey())
	}

	params.Image = imagePath
	if strings.Contains(imagePath, " ") || strings.ContainsAny(imagePath, "?#&()") {
		params.Base64Image = true
	}

	signer := imagorprovider.NewSigner(spaceConfig.GetImagorSecret(), spaceConfig.GetSignerAlgorithm(), spaceConfig.GetSignerTruncate())
	if signer == nil {
		return "", fmt.Errorf("space %q has no valid imagor signer", spaceConfig.GetKey())
	}

	return fmt.Sprintf("/%s", imagorpath.Generate(params, signer)), nil
}
