package server

import (
	"io/fs"
	"net/http"

	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/cloud"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/httphandler"
	"github.com/cshum/imagor-studio/server/internal/middleware"
)

func registerAppRoutes(mux *http.ServeMux, services *bootstrap.Services, cfg *config.Config, embedFS fs.FS) error {
	mode := bootstrap.DetectMode(cfg)
	isCloudMode := cloud.Enabled(cfg)

	if isCloudMode && services.SpaceStore != nil {
		spacesHandler := httphandler.NewSpacesDeltaHandler(services.SpaceStore, services.Config.InternalAPISecret, services.Logger)
		mux.HandleFunc("/internal/spaces/delta", spacesHandler.GetDelta())
	}

	if mode == bootstrap.ModeProcessing && services.SpaceConfigStore != nil {
		baseDomain := cfg.SpaceBaseDomain
		if len(baseDomain) > 0 && baseDomain[0] == '.' {
			baseDomain = baseDomain[1:]
		}
		imagorHandler := middleware.SpaceConcurrencyMiddleware(
			services.SpaceConfigStore,
			baseDomain,
			int64(cfg.SpaceMaxConcurrency),
		)(services.ImagorProvider.Imagor())
		mux.Handle("/", imagorHandler)
		return nil
	}

	mux.Handle("/imagor/", http.StripPrefix("/imagor", services.ImagorProvider.Imagor()))

	staticFS, err := fs.Sub(embedFS, "static")
	if err != nil {
		return err
	}
	mux.Handle("/", httphandler.SPAHandler(staticFS, services.ImagorProvider.Imagor(), services.Logger))
	return nil
}
