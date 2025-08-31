package server

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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
	cfg      *config.Config
	services *bootstrap.Services
}

func New(cfg *config.Config) (*Server, error) {
	// Initialize all services using bootstrap package
	services, err := bootstrap.Initialize(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize services: %w", err)
	}

	// Initialize GraphQL
	storageResolver := resolver.NewResolver(
		services.Storage,
		services.RegistryStore,
		services.UserStore,
		services.ImageService,
		cfg.Logger,
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
		cfg.Logger,
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
	mux.HandleFunc("/auth/register", authHandler.Register())
	mux.HandleFunc("/auth/login", authHandler.Login())
	mux.HandleFunc("/auth/refresh", authHandler.RefreshToken())
	mux.HandleFunc("/auth/guest", authHandler.GuestLogin())

	// Add the new endpoints
	mux.HandleFunc("/auth/first-run", authHandler.CheckFirstRun())
	mux.HandleFunc("/auth/register-admin", authHandler.RegisterAdmin())

	// Protected endpoints
	protectedHandler := middleware.JWTMiddleware(services.TokenManager)(gqlHandler)
	mux.Handle("/query", protectedHandler)

	// Static file serving for web frontend
	staticHandler := createStaticHandler(cfg.Logger)
	mux.Handle("/", staticHandler)

	// Configure CORS
	corsConfig := middleware.DefaultCORSConfig()

	// Apply global middleware to the entire mux
	h := middleware.CORSMiddleware(corsConfig)(
		middleware.LoggingMiddleware(cfg.Logger)(
			middleware.ErrorMiddleware(cfg.Logger)(
				mux,
			),
		),
	)

	// Set the final handler
	http.Handle("/", h)

	return &Server{
		cfg:      cfg,
		services: services,
	}, nil
}

func (s *Server) Run() error {
	addr := fmt.Sprintf(":%d", s.cfg.Port)
	s.cfg.Logger.Info("Server is running", zap.String("address", fmt.Sprintf("http://localhost%s", addr)))
	return http.ListenAndServe(addr, nil)
}

func (s *Server) Close() error {
	return s.services.DB.Close()
}

// createStaticHandler creates a handler for serving static files with SPA fallback
func createStaticHandler(logger *zap.Logger) http.Handler {
	// Try to find the web/dist directory
	webDistDir := "./web/dist"

	// Check if we're running from Docker (web assets copied to ./web/dist)
	if _, err := os.Stat(webDistDir); os.IsNotExist(err) {
		// Fallback to development mode or other locations
		possiblePaths := []string{
			"../web/dist",
			"../../web/dist",
			"./dist",
		}

		for _, path := range possiblePaths {
			if _, err := os.Stat(path); err == nil {
				webDistDir = path
				break
			}
		}
	}

	logger.Info("Static file handler configured", zap.String("webDistDir", webDistDir))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Handle API routes - these should not serve static files
		if strings.HasPrefix(r.URL.Path, "/auth/") ||
			strings.HasPrefix(r.URL.Path, "/query") ||
			strings.HasPrefix(r.URL.Path, "/health") {
			http.NotFound(w, r)
			return
		}

		// If path contains no file extension (no dot), serve index.html for SPA routing
		if !strings.Contains(filepath.Base(r.URL.Path), ".") {
			indexPath := filepath.Join(webDistDir, "index.html")
			http.ServeFile(w, r, indexPath)
			return
		}

		// For paths with extensions, serve the actual file
		filePath := filepath.Join(webDistDir, r.URL.Path)
		http.ServeFile(w, r, filePath)
	})
}
