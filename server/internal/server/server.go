package server

import (
	"context"
	"fmt"
	"io/fs"
	"net/http"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/httphandler"
	"github.com/cshum/imagor-studio/server/internal/middleware"
	"github.com/cshum/imagor-studio/server/internal/resolver"
	"go.uber.org/zap"
)

type Mode string

const (
	ModeSelfHosted Mode = "selfhosted"
	ModeCloud      Mode = "cloud"
)

type Server struct {
	cfg        *config.Config
	services   *bootstrap.Services
	httpServer *http.Server
	syncCancel context.CancelFunc // stops the background 30s sync loop
}

// startSyncLoop runs syncFuncs every interval in a background goroutine until
// ctx is cancelled. Errors are logged as warnings but do not stop the loop.
func startSyncLoop(ctx context.Context, interval time.Duration, logger *zap.Logger, syncFuncs ...func() error) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				for _, fn := range syncFuncs {
					if err := fn(); err != nil {
						logger.Warn("Provider sync failed", zap.Error(err))
					}
				}
			case <-ctx.Done():
				return
			}
		}
	}()
}

func New(cfg *config.Config, embedFS fs.FS, logger *zap.Logger, args []string, mode Mode) (*Server, error) {
	// Initialize all services using bootstrap package
	var (
		services *bootstrap.Services
		err      error
	)
	switch mode {
	case ModeCloud:
		services, err = bootstrap.InitializeCloud(cfg, logger, args)
	default:
		services, err = bootstrap.InitializeSelfHosted(cfg, logger, args)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to initialize services: %w", err)
	}
	return NewFromServices(cfg, embedFS, logger, services, mode)
}

func NewFromServices(cfg *config.Config, embedFS fs.FS, logger *zap.Logger, services *bootstrap.Services, mode Mode) (*Server, error) {

	// Initialize GraphQL with enhanced config from services
	storageResolver := resolver.NewResolver(
		services.StorageProvider,
		services.RegistryStore,
		services.UserStore,
		services.ImagorProvider,
		services.Config, // Use enhanced config from services
		services.LicenseService,
		services.Logger,
		services.OrgStore,
		services.SpaceStore,
		services.SpaceInviteStore,
		services.InviteSender,
	)
	schema := gql.NewExecutableSchema(gql.Config{Resolvers: storageResolver})
	gqlHandler := handler.New(schema)

	// Add transports in the correct order (most specific first)
	gqlHandler.AddTransport(transport.Options{})
	gqlHandler.AddTransport(transport.GET{})
	gqlHandler.AddTransport(transport.POST{})
	gqlHandler.AddTransport(transport.MultipartForm{})

	// Add WebSocket transport for subscriptions if needed
	// gqlHandler.AddTransport(transport.Websocket{
	//     KeepAlivePingInterval: 10 * time.Second,
	// })

	// Add useful extensions
	gqlHandler.Use(extension.Introspection{})

	// Create auth handler.  services.OrgStore is nil for self-hosted deployments
	// and non-nil (wired by bootstrap) when InternalAPISecret is configured (multi-tenant).
	authHandler := httphandler.NewAuthHandler(
		services.TokenManager,
		services.UserStore,
		services.OrgStore,
		services.RegistryStore,
		services.Logger,
		cfg.EmbeddedMode,
		cfg.InternalAPISecret != "", // multiTenant: true when InternalAPISecret is set
	)

	// Create middleware chain
	mux := http.NewServeMux()

	// Public endpoints
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth endpoints (no auth required)
	mux.HandleFunc("/api/auth/register", authHandler.Register())
	mux.HandleFunc("/api/auth/login", authHandler.Login())
	mux.HandleFunc("/api/auth/refresh", authHandler.RefreshToken())
	mux.HandleFunc("/api/auth/guest", authHandler.GuestLogin())
	mux.HandleFunc("/api/auth/embedded-guest", authHandler.EmbeddedGuestLogin())

	// Add the new endpoints
	mux.HandleFunc("/api/auth/first-run", authHandler.CheckFirstRun())
	mux.HandleFunc("/api/auth/register-admin", authHandler.RegisterAdmin())

	if mode == ModeCloud {
		registerCloudAuthRoutes(mux, cfg, services)
	} else {
		registerSelfHostedAuthRoutes(mux)
	}

	// License endpoints (public - no auth required)
	licenseHandler := httphandler.NewLicenseHandler(services.LicenseService, services.RegistryStore, services.Logger)
	mux.HandleFunc("/api/public/license-status", licenseHandler.GetPublicStatus())
	mux.HandleFunc("/api/public/activate-license", licenseHandler.ActivateLicense())

	// Protected endpoints
	protectedHandler := middleware.JWTMiddleware(services.TokenManager)(gqlHandler)
	mux.Handle("/api/query", protectedHandler)

	if mode == ModeCloud {
		registerCloudInternalRoutes(mux, services)
	}

	if err := registerProcessingOrSPA(mux, cfg, embedFS, services); err != nil {
		return nil, err
	}

	// Configure CORS — if CORSOrigins is set, restrict to those specific origins.
	// Empty string (default) keeps the open wildcard ("*") behaviour.
	corsConfig := middleware.DefaultCORSConfig()
	if cfg.CORSOrigins != "" {
		allowedOrigins := strings.Split(cfg.CORSOrigins, ",")
		for i, o := range allowedOrigins {
			allowedOrigins[i] = strings.TrimSpace(o)
		}
		corsConfig.AllowedOrigins = allowedOrigins
	}

	// Apply global middleware to the entire mux
	h := middleware.CORSMiddleware(corsConfig)(
		middleware.ErrorMiddleware(services.Logger)(
			mux,
		),
	)

	// Create HTTP server instance
	addr := fmt.Sprintf(":%d", cfg.Port)
	httpServer := &http.Server{
		Addr:    addr,
		Handler: h,
		// Set reasonable timeouts for production use
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start background 30-second sync loop: pulls registry → imagor signer + storage.
	syncCtx, syncCancel := context.WithCancel(context.Background())

	if err := startProcessingSyncIfNeeded(syncCtx, services); err != nil {
		syncCancel()
		return nil, fmt.Errorf("space config store initial sync failed: %w", err)
	}

	// Build the sync functions list. StorageProvider is nil in processing mode
	// (no management storage on processing nodes), so guard against nil.
	syncFuncs := []func() error{services.ImagorProvider.Sync}
	if services.StorageProvider != nil {
		syncFuncs = append(syncFuncs, services.StorageProvider.ReloadFromRegistry)
	}
	startSyncLoop(syncCtx, 30*time.Second, services.Logger, syncFuncs...)

	return &Server{
		cfg:        cfg,
		services:   services,
		httpServer: httpServer,
		syncCancel: syncCancel,
	}, nil
}

func (s *Server) Run() error {
	s.services.Logger.Info("Server is running", zap.String("address", fmt.Sprintf("http://localhost%s", s.httpServer.Addr)))
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.services.Logger.Debug("Starting graceful shutdown...")

	// Shutdown HTTP server gracefully
	if err := s.httpServer.Shutdown(ctx); err != nil {
		s.services.Logger.Error("HTTP server shutdown error", zap.Error(err))
		return err
	}

	s.services.Logger.Debug("HTTP server shutdown completed")
	return nil
}

func (s *Server) Close() error {
	s.services.Logger.Debug("Closing server resources...")

	// Stop background sync loop before shutting down providers.
	if s.syncCancel != nil {
		s.syncCancel()
	}

	// Shutdown imagor first (includes libvips cleanup)
	ctx := context.Background()
	if err := s.services.ImagorProvider.Shutdown(ctx); err != nil {
		s.services.Logger.Error("Imagor shutdown error", zap.Error(err))
		// Continue with other cleanup even if imagor shutdown fails
	}

	// Close database connection (only if not in embedded mode)
	if s.services.DB != nil {
		s.services.Logger.Debug("Closing database connection...")
		if err := s.services.DB.Close(); err != nil {
			s.services.Logger.Error("Database close error", zap.Error(err))
			return err
		}
		s.services.Logger.Debug("Database connection closed")
	}

	s.services.Logger.Debug("Server resources closed successfully")
	return nil
}
