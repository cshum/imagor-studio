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
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"go.uber.org/zap"
)

type Mode string

const (
	ModeSelfHosted Mode = "selfhosted"
	ModeCloud      Mode = "cloud"

	processingUsageCleanupAdvisoryLockKey int64 = 714001
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

func processingUsageCleanupLoopConfig(services *bootstrap.Services, mode Mode, cloudConfig management.CloudConfig) (time.Duration, time.Duration, bool) {
	if mode != ModeCloud || services == nil || services.ProcessingUsageStore == nil || !cloudConfig.ManagementJobsEnabled {
		return 0, 0, false
	}
	if cloudConfig.ProcessingUsageBatchCleanupRetention <= 0 || cloudConfig.ProcessingUsageBatchCleanupInterval <= 0 {
		return 0, 0, false
	}
	return cloudConfig.ProcessingUsageBatchCleanupInterval, cloudConfig.ProcessingUsageBatchCleanupRetention, true
}

func newProcessingUsageCleanupSyncFunc(ctx context.Context, store management.ProcessingUsageStore, retention time.Duration, now func() time.Time) func() error {
	if now == nil {
		now = time.Now
	}
	return func() error {
		return store.CleanupUsageBatches(ctx, now().UTC().Add(-retention))
	}
}

func newPostgresAdvisoryLockSyncFunc(ctx context.Context, db *bun.DB, logger *zap.Logger, lockKey int64, jobName string, syncFunc func() error) func() error {
	if syncFunc == nil || db == nil || db.Dialect().Name() != dialect.PG {
		return syncFunc
	}
	if logger == nil {
		logger = zap.NewNop()
	}

	return func() error {
		var locked bool
		if err := db.NewRaw(`SELECT pg_try_advisory_lock(?)`, lockKey).Scan(ctx, &locked); err != nil {
			return fmt.Errorf("acquire advisory lock for %s: %w", jobName, err)
		}
		if !locked {
			logger.Debug("Skipping background job; advisory lock is held by another node",
				zap.String("job", jobName),
				zap.Int64("lockKey", lockKey),
			)
			return nil
		}

		defer func() {
			if _, err := db.ExecContext(ctx, `SELECT pg_advisory_unlock(?)`, lockKey); err != nil {
				logger.Warn("Failed to release background job advisory lock",
					zap.String("job", jobName),
					zap.Int64("lockKey", lockKey),
					zap.Error(err),
				)
			}
		}()

		return syncFunc()
	}
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
	return NewFromServices(cfg, embedFS, logger, services, mode, management.CloudConfig{}, management.CloudFactories{})
}

func NewFromServices(cfg *config.Config, embedFS fs.FS, logger *zap.Logger, services *bootstrap.Services, mode Mode, cloudConfig management.CloudConfig, cloudFactories management.CloudFactories) (*Server, error) {
	// Create auth handler. services.OrgStore is nil for self-hosted deployments
	// and non-nil only for cloud multi-tenant deployments.
	multiTenant := mode == ModeCloud && services.OrgStore != nil && services.SpaceStore != nil

	// Initialize GraphQL with enhanced config from services
	processingOriginResolver := space.NewCustomDomainProcessingOriginResolver(services.SpaceStore)
	if mode == ModeCloud && multiTenant && cloudFactories.ProcessingOriginResolver != nil {
		if customResolver := cloudFactories.ProcessingOriginResolver(cloudConfig, services.SpaceStore); customResolver != nil {
			processingOriginResolver = customResolver
		}
	}

	var templatePreviewRenderer resolver.ResolverOption
	if mode == ModeCloud && multiTenant {
		if cloudFactories.TemplatePreviewRenderer != nil {
			templatePreviewRenderer = resolver.WithTemplatePreviewRenderer(cloudFactories.TemplatePreviewRenderer(cloudConfig))
		} else if strings.TrimSpace(cloudConfig.ProcessingURLTemplate) != "" {
			templatePreviewRenderer = resolver.WithTemplatePreviewRenderer(processing.NewHTTPTemplatePreviewRenderClient(cloudConfig.ProcessingURLTemplate, cloudConfig.InternalAPISecret))
		}
	}

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
		resolver.WithLocalTemplatePreviewRenderer(),
		resolver.WithCloudConfig(cloudConfig),
		resolver.WithHostedStorageStore(services.HostedStorageStore),
		resolver.WithProcessingUsageStore(services.ProcessingUsageStore),
		resolver.WithBillingService(services.BillingService),
		resolver.WithProcessingOriginResolver(processingOriginResolver),
		resolver.WithSignupRuntime(services.SignupVerification),
		templatePreviewRenderer,
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

	authHandler := httphandler.NewAuthHandler(
		services.TokenManager,
		services.UserStore,
		services.OrgStore,
		services.RegistryStore,
		services.Logger,
		httphandler.AuthHandlerConfig{
			EmbeddedMode:  cfg.EmbeddedMode,
			MultiTenant:   multiTenant,
			SpaceStore:    services.SpaceStore,
			InviteStore:   services.SpaceInviteStore,
			SignupRuntime: services.SignupVerification,
		},
	)

	// Create middleware chain
	mux := http.NewServeMux()

	// Public endpoints
	mux.HandleFunc("/health", newHealthHandler(services.SpaceConfigStore))
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if services.SpaceConfigStore != nil && !services.SpaceConfigStore.Ready() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"not_ready"}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ready"}`))
	})

	// Auth endpoints (no auth required)
	mux.HandleFunc("/api/auth/register", authHandler.Register())
	mux.HandleFunc("/api/auth/register/start", authHandler.StartPublicSignup())
	mux.HandleFunc("/api/auth/register/verify", authHandler.VerifyPublicSignup())
	mux.HandleFunc("/api/auth/register/resend", authHandler.ResendPublicSignupVerification())
	mux.HandleFunc("/api/auth/account/email/verify", authHandler.VerifyEmailChange())
	mux.HandleFunc("/api/auth/login", authHandler.Login())
	mux.HandleFunc("/api/auth/refresh", authHandler.RefreshToken())
	mux.HandleFunc("/api/auth/guest", authHandler.GuestLogin())
	mux.HandleFunc("/api/auth/embedded-guest", authHandler.EmbeddedGuestLogin())

	// Add the new endpoints
	mux.HandleFunc("/api/auth/first-run", authHandler.CheckFirstRun())
	mux.HandleFunc("/api/auth/register-admin", authHandler.RegisterAdmin())

	cloudServices := management.CloudHTTPServices{
		TokenManager:         services.TokenManager,
		UserStore:            services.UserStore,
		OrgStore:             services.OrgStore,
		SpaceStore:           services.SpaceStore,
		SpaceInviteStore:     services.SpaceInviteStore,
		HostedStorageStore:   services.HostedStorageStore,
		ProcessingUsageStore: services.ProcessingUsageStore,
		BillingService:       services.BillingService,
		SignupVerification:   services.SignupVerification,
		CloudConfig:          cloudConfig,
		InternalAPISecret:    cloudConfig.InternalAPISecret,
		Logger:               services.Logger,
	}
	if imagorCfg := services.ImagorProvider.Config(); imagorCfg != nil {
		cloudServices.GlobalImagor = management.ImagorSigningConfig{
			Secret:         imagorCfg.Secret,
			SignerType:     imagorCfg.SignerType,
			SignerTruncate: imagorCfg.SignerTruncate,
		}
	}

	if mode == ModeCloud && multiTenant && cloudFactories.AuthRoutes != nil {
		cloudFactories.AuthRoutes(mux, management.OAuthConfig{
			GoogleClientID:     cloudConfig.GoogleClientID,
			GoogleClientSecret: cloudConfig.GoogleClientSecret,
			AppURL:             cfg.AppUrl,
			AppAPIURL:          cloudConfig.AppAPIURL,
		}, cloudServices)
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

	if mode == ModeCloud && multiTenant && cloudFactories.InternalRoutes != nil {
		cloudFactories.InternalRoutes(mux, cloudServices)
	}

	if services.SpaceConfigStore != nil {
		registerProcessingInternalRoutes(mux, services)
	}

	if err := registerProcessingOrSPA(mux, cfg, embedFS, services); err != nil {
		return nil, err
	}

	baseHandler := middleware.ErrorMiddleware(services.Logger)(mux)

	var h http.Handler
	if services.SpaceConfigStore != nil {
		baseDomain := ""
		if services.ProcessingConfig != nil {
			baseDomain = services.ProcessingConfig.Runtime.SpaceBaseDomain
		}
		h = newProcessingCORSMiddleware(services.SpaceConfigStore, cfg.AppUrl, cfg.CORSOrigins, baseDomain)(baseHandler)
	} else {
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
		h = middleware.CORSMiddleware(corsConfig)(baseHandler)
	}

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
	if services.ProcessingUsageRecorder != nil {
		syncFuncs = append(syncFuncs, func() error {
			return services.ProcessingUsageRecorder.Flush(syncCtx)
		})
	}
	if services.StorageProvider != nil {
		syncFuncs = append(syncFuncs, services.StorageProvider.ReloadFromRegistry)
	}
	startSyncLoop(syncCtx, 30*time.Second, services.Logger, syncFuncs...)
	if cleanupInterval, cleanupRetention, ok := processingUsageCleanupLoopConfig(services, mode, cloudConfig); ok {
		cleanupSyncFunc := newPostgresAdvisoryLockSyncFunc(
			syncCtx,
			services.DB,
			services.Logger,
			processingUsageCleanupAdvisoryLockKey,
			"processing_usage_batch_cleanup",
			newProcessingUsageCleanupSyncFunc(syncCtx, services.ProcessingUsageStore, cleanupRetention, time.Now),
		)
		services.Logger.Info("processing usage batch cleanup loop enabled",
			zap.Duration("interval", cleanupInterval),
			zap.Duration("retention", cleanupRetention),
		)
		startSyncLoop(syncCtx, cleanupInterval, services.Logger, cleanupSyncFunc)
	}

	return &Server{
		cfg:        cfg,
		services:   services,
		httpServer: httpServer,
		syncCancel: syncCancel,
	}, nil
}

func registerSelfHostedAuthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/auth/providers", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"providers":[]}`))
	})
}

func registerProcessingOrSPA(
	mux *http.ServeMux,
	cfg *config.Config,
	embedFS fs.FS,
	services *bootstrap.Services,
) error {
	if services.SpaceConfigStore != nil {
		baseDomain := ""
		if services.ProcessingConfig != nil {
			baseDomain = services.ProcessingConfig.Runtime.SpaceBaseDomain
		}
		mux.Handle("/", newProcessingRootHandler(
			services.ImagorProvider.Imagor(),
			services.SpaceConfigStore,
			cfg.AppUrl,
			baseDomain,
			services.ProcessingConfig.Runtime.InternalAPISecret,
		))
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

func (s *Server) Run() error {
	s.services.Logger.Info("Server is running", zap.String("address", fmt.Sprintf("http://localhost%s", s.httpServer.Addr)))
	return s.httpServer.ListenAndServe()
}

func (s *Server) Handler() http.Handler {
	if s == nil || s.httpServer == nil {
		return nil
	}
	return s.httpServer.Handler
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
