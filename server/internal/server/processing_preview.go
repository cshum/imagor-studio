package server

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
	"go.uber.org/zap"
)

func registerProcessingPreviewRoutes(mux *http.ServeMux, services *bootstrap.Services) {
	if services == nil || services.SpaceConfigStore == nil || services.ImagorProvider == nil || services.TokenManager == nil {
		return
	}

	baseDomain := ""
	if services.ProcessingConfig != nil {
		baseDomain = services.ProcessingConfig.Runtime.SpaceBaseDomain
	}

	mux.HandleFunc(sharedprocessing.PreviewPathPrefix, newProcessingPreviewHandler(
		services.ImagorProvider.Imagor(),
		services.TokenManager,
		services.SpaceConfigStore,
		baseDomain,
		services.Logger,
	))
}

func newProcessingPreviewHandler(
	imagorHandler http.Handler,
	tokenManager *auth.TokenManager,
	spaceConfigStore sharedprocessing.SpaceConfigReader,
	baseDomain string,
	logger *zap.Logger,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}
		if imagorHandler == nil || tokenManager == nil || spaceConfigStore == nil {
			http.Error(w, "processing preview service unavailable", http.StatusServiceUnavailable)
			return
		}

		previewToken := strings.TrimSpace(r.URL.Query().Get(sharedprocessing.PreviewTokenQuery))
		if previewToken == "" {
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}

		claims, err := tokenManager.ValidateToken(previewToken)
		if err != nil || claims == nil || claims.Kind != sharedprocessing.PreviewTokenKind || !hasPreviewAudience(claims.Audience) {
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}

		spaceKey := strings.TrimSpace(claims.SpaceKey)
		if spaceKey == "" {
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}

		spaceConfig, ok := spaceConfigStore.Get(spaceKey)
		if !ok || spaceConfig == nil {
			http.Error(w, "space config not found", http.StatusNotFound)
			return
		}

		host, err := processingRenderHost(spaceKey, spaceConfig, baseDomain)
		if err != nil {
			http.Error(w, "failed to resolve preview host", http.StatusBadRequest)
			return
		}

		previewPath := strings.TrimPrefix(r.URL.Path, sharedprocessing.PreviewPathPrefix)
		previewPath = "/" + strings.TrimLeft(previewPath, "/")
		if previewPath == "/" {
			http.Error(w, "preview path is required", http.StatusBadRequest)
			return
		}

		imagorPath, err := signedProcessingPreviewPath(previewPath, spaceConfig)
		if err != nil {
			http.Error(w, "failed to sign preview path", http.StatusBadRequest)
			return
		}
		imagorReq, err := http.NewRequestWithContext(r.Context(), r.Method, imagorPath, nil)
		if err != nil {
			http.Error(w, "failed to create imagor request", http.StatusInternalServerError)
			return
		}
		imagorReq.Host = host
		imagorReq.Header = r.Header.Clone()
		imagorReq = imagorReq.WithContext(sharedprocessing.WithRequestMetadata(imagorReq.Context(), sharedprocessing.RequestMetadata{
			OrgID:   spaceConfig.GetOrgID(),
			SpaceID: spaceConfig.GetKey(),
			Class:   sharedprocessing.UsageClassInternalNonBillable,
		}))

		query := url.Values{}
		for key, values := range r.URL.Query() {
			if key == sharedprocessing.PreviewTokenQuery {
				continue
			}
			for _, value := range values {
				query.Add(key, value)
			}
		}
		imagorReq.URL.RawQuery = query.Encode()

		if logger != nil {
			logger.Debug("serving processing preview",
				zap.String("spaceKey", spaceKey),
				zap.String("host", host),
				zap.String("path", imagorPath),
			)
		}
		imagorHandler.ServeHTTP(w, imagorReq)
	}
}

func hasPreviewAudience(audience []string) bool {
	for _, value := range audience {
		if value == sharedprocessing.PreviewTokenAudience {
			return true
		}
	}
	return false
}

func signedProcessingPreviewPath(previewPath string, spaceConfig sharedprocessing.SpaceConfig) (string, error) {
	canonicalPath := strings.TrimPrefix(strings.TrimSpace(previewPath), "/")
	if canonicalPath == "" {
		return "", fmt.Errorf("preview path is required")
	}

	signer := imagorprovider.NewSigner(
		spaceConfig.GetImagorSecret(),
		spaceConfig.GetSignerAlgorithm(),
		spaceConfig.GetSignerTruncate(),
	)
	if signer == nil {
		return "", fmt.Errorf("space %q has no valid imagor signer", spaceConfig.GetKey())
	}

	return "/" + signer.Sign(canonicalPath) + "/" + canonicalPath, nil
}
