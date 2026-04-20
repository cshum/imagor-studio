package server

import (
	"context"
	"io/fs"
	"net/http"

	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/httphandler"
	"github.com/cshum/imagor-studio/server/internal/middleware"
	"github.com/cshum/imagor-studio/server/pkg/management"
)

func registerCloudInternalRoutes(mux *http.ServeMux, services *bootstrap.Services) {
	if !management.SpaceEnabled(services.SpaceStore) {
		return
	}
	spacesHandler := httphandler.NewSpacesDeltaHandler(services.SpaceStore, services.Config.InternalAPISecret, services.Logger)
	mux.HandleFunc("/internal/spaces/delta", spacesHandler.GetDelta())
}

func registerProcessingOrSPA(
	mux *http.ServeMux,
	cfg *config.Config,
	embedFS fs.FS,
	services *bootstrap.Services,
) error {
	if services.SpaceConfigStore != nil {
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

func startProcessingSyncIfNeeded(ctx context.Context, services *bootstrap.Services) error {
	if services.SpaceConfigStore == nil {
		return nil
	}
	return services.SpaceConfigStore.Start(ctx)
}
