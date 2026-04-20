package server

import (
	"net/http"

	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/httphandler"
	"github.com/cshum/imagor-studio/server/pkg/management"
)

func registerCloudAuthRoutes(mux *http.ServeMux, cfg *config.Config, services *bootstrap.Services) {
	if !management.CloudEnabled(services.OrgStore, services.SpaceStore) {
		registerSelfHostedAuthRoutes(mux)
		return
	}

	if !management.InviteEnabled(services.OrgStore, services.SpaceStore, services.SpaceInviteStore, services.InviteSender) && cfg.GoogleClientID == "" {
		registerSelfHostedAuthRoutes(mux)
		return
	}

	if cfg.GoogleClientID == "" {
		mux.HandleFunc("/api/auth/providers", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"providers":[]}`))
		})
		return
	}

	oauthHandler := httphandler.NewOAuthHandler(
		services.TokenManager,
		services.UserStore,
		services.OrgStore,
		services.SpaceStore,
		services.SpaceInviteStore,
		services.Logger,
		cfg.GoogleClientID,
		cfg.GoogleClientSecret,
		cfg.AppUrl,
		cfg.AppApiUrl,
	)
	mux.HandleFunc("/api/auth/providers", oauthHandler.GoogleAuthProviders())
	mux.HandleFunc("/api/auth/google/login", oauthHandler.GoogleLogin())
	mux.HandleFunc("/api/auth/google/callback", oauthHandler.GoogleCallback())
}

func registerSelfHostedAuthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/auth/providers", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"providers":[]}`))
	})
}
