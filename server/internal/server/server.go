package server

import (
	"context"
	"fmt"
	"io/fs"
	"net/http"
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

type Server struct {
	cfg        *config.Config
	services   *bootstrap.Services
	httpServer *http.Server
}

func New(cfg *config.Config, embedFS fs.FS, logger *zap.Logger, args []string) (*Server, error) {
	// Initialize all services using bootstrap package
	services, err := bootstrap.Initialize(cfg, logger, args)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize services: %w", err)
	}

	// Check if we're in embedded mode
	if cfg.EmbeddedMode {
		return newEmbeddedServer(cfg, embedFS, services, logger)
	}

	// Initialize GraphQL with enhanced config from services
	storageResolver := resolver.NewResolver(
		services.StorageProvider,
		services.RegistryStore,
		services.UserStore,
		services.ImagorProvider,
		services.Config, // Use enhanced config from services
		services.LicenseService,
		services.Logger,
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

	// Create auth handler
	authHandler := httphandler.NewAuthHandler(
		services.TokenManager,
		services.UserStore,
		services.RegistryStore,
		services.Logger,
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

	// Add the new endpoints
	mux.HandleFunc("/api/auth/first-run", authHandler.CheckFirstRun())
	mux.HandleFunc("/api/auth/register-admin", authHandler.RegisterAdmin())

	// License endpoints (public - no auth required)
	licenseHandler := httphandler.NewLicenseHandler(services.LicenseService, services.Logger)
	mux.HandleFunc("/api/public/license-status", licenseHandler.GetPublicStatus())
	mux.HandleFunc("/api/public/activate-license", licenseHandler.ActivateLicense())

	// Protected endpoints
	protectedHandler := middleware.JWTMiddleware(services.TokenManager)(gqlHandler)
	mux.Handle("/api/query", protectedHandler)

	// Dynamic imagor handler wrapper
	mux.Handle("/imagor/", http.StripPrefix("/imagor", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if currentHandler := services.ImagorProvider.GetHandler(); currentHandler != nil {
			currentHandler.ServeHTTP(w, r)
		} else {
			http.NotFound(w, r)
		}
	})))

	// Static file serving for web frontend using embedded assets
	staticFS, err := fs.Sub(embedFS, "static")
	if err != nil {
		return nil, err
	}
	mux.Handle("/", httphandler.SPAHandler(staticFS, services.Logger))

	// Configure CORS
	corsConfig := middleware.DefaultCORSConfig()

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

	return &Server{
		cfg:        cfg,
		services:   services,
		httpServer: httpServer,
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

// newEmbeddedServer creates a server instance for embedded mode
func newEmbeddedServer(cfg *config.Config, embedFS fs.FS, services *bootstrap.Services, logger *zap.Logger) (*Server, error) {
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","mode":"embedded"}`))
	})

	// Imagor endpoint for image processing
	mux.Handle("/imagor/", http.StripPrefix("/imagor", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if currentHandler := services.ImagorProvider.GetHandler(); currentHandler != nil {
			currentHandler.ServeHTTP(w, r)
		} else {
			http.NotFound(w, r)
		}
	})))

	// Embedded static files - serve from embedded-static subdirectory
	embeddedStaticFS, err := fs.Sub(embedFS, "embedded-static")
	if err != nil {
		// Fallback to regular static if embedded-static doesn't exist yet
		embeddedStaticFS, err = fs.Sub(embedFS, "static")
		if err != nil {
			return nil, fmt.Errorf("failed to load embedded static files: %w", err)
		}
	}

	// JWT middleware for embedded mode
	var authMiddleware func(http.Handler) http.Handler
	if cfg.JWTSecret != "" {
		// Use JWT authentication if secret is provided
		authMiddleware = middleware.OptionalEmbeddedJWTMiddleware(cfg.JWTSecret, logger)
	} else {
		// No authentication - just validate image path
		authMiddleware = func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				imagePath := r.URL.Query().Get("image")
				if imagePath == "" {
					http.Error(w, "missing image parameter", http.StatusBadRequest)
					return
				}

				// Basic path validation
				if err := middleware.ValidateImagePath(imagePath, cfg.FileBaseDir); err != nil {
					logger.Warn("Invalid image path", zap.String("path", imagePath), zap.Error(err))
					http.Error(w, "invalid image path", http.StatusBadRequest)
					return
				}

				next.ServeHTTP(w, r)
			})
		}
	}

	// Root path serves the embedded editor with authentication
	mux.Handle("/", authMiddleware(httphandler.SPAHandler(embeddedStaticFS, logger)))

	// Configure CORS for embedded mode - more permissive for iframe embedding
	corsConfig := middleware.CORSConfig{
		AllowedOrigins:   []string{"*"}, // Allow all origins for iframe embedding
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: false, // Don't allow credentials for embedded mode
		MaxAge:           86400,
	}

	// Apply middleware
	h := middleware.CORSMiddleware(corsConfig)(
		middleware.ErrorMiddleware(logger)(
			mux,
		),
	)

	// Create HTTP server instance
	addr := fmt.Sprintf(":%d", cfg.Port)
	httpServer := &http.Server{
		Addr:    addr,
		Handler: h,
		// Set reasonable timeouts for embedded use
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	logger.Info("Starting in embedded mode",
		zap.Bool("jwt_auth", cfg.JWTSecret != ""),
		zap.String("storage_type", cfg.StorageType),
		zap.String("imagor_mode", cfg.ImagorMode))

	return &Server{
		cfg:        cfg,
		services:   services,
		httpServer: httpServer,
	}, nil
}

func (s *Server) Close() error {
	s.services.Logger.Debug("Closing server resources...")

	// Shutdown imagor first (includes libvips cleanup)
	ctx := context.Background()
	if err := s.services.ImagorProvider.Shutdown(ctx); err != nil {
		s.services.Logger.Error("Imagor shutdown error", zap.Error(err))
		// Continue with other cleanup even if imagor shutdown fails
	}

	// Close database connection
	s.services.Logger.Debug("Closing database connection...")
	if err := s.services.DB.Close(); err != nil {
		s.services.Logger.Error("Database close error", zap.Error(err))
		return err
	}
	s.services.Logger.Debug("Database connection closed")

	s.services.Logger.Debug("Server resources closed successfully")
	return nil
}
