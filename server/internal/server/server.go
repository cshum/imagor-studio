package server

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/httphandler"
	"github.com/cshum/imagor-studio/server/internal/imageservice"
	"github.com/cshum/imagor-studio/server/internal/middleware"
	"github.com/cshum/imagor-studio/server/internal/migrations"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/resolver"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/zap"
)

type Server struct {
	cfg          *config.Config
	db           *bun.DB
	tokenManager *auth.TokenManager
	storage      storage.Storage
}

func New(cfg *config.Config) (*Server, error) {
	sqldb, err := sql.Open(sqliteshim.ShimName, cfg.DBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := bun.NewDB(sqldb, sqlitedialect.New())

	// Run migrations (only registry table now)
	migrator := migrate.NewMigrator(db, migrations.Migrations)
	err = migrator.Init(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to init migrator: %w", err)
	}

	group, err := migrator.Migrate(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	if group.IsZero() {
		cfg.Logger.Info("No migrations to run")
	} else {
		cfg.Logger.Info("Migrations applied", zap.String("group", group.String()))
	}

	// Initialize encryption service with master key only (for JWT secret bootstrap)
	encryptionService := encryption.NewServiceWithMasterKeyOnly(cfg.DBPath)

	// Initialize registry store with encryption
	registryStore := registrystore.New(db, cfg.Logger, encryptionService)

	// Bootstrap JWT secret from registry or environment
	jwtSecret, err := bootstrapJWTSecret(cfg, registryStore, encryptionService)
	if err != nil {
		return nil, fmt.Errorf("failed to bootstrap JWT secret: %w", err)
	}

	// Update encryption service with JWT secret
	encryptionService.SetJWTKey(jwtSecret)

	// Update config with final JWT secret
	cfg.JWTSecret = jwtSecret

	// Initialize token manager
	tokenManager := auth.NewTokenManager(
		cfg.JWTSecret,
		cfg.JWTExpiration,
	)

	// Create storage based on configuration (now with registry-first loading)
	stor, err := createStorageWithRegistry(cfg, registryStore)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage: %w", err)
	}

	// Initialize user store
	userStore := userstore.New(db, cfg.Logger)

	// Initialize image service (with registry-first config)
	imageServiceConfig := imageservice.Config{
		Mode:          getConfigValue("IMAGOR_MODE", cfg.ImagorMode, registryStore, "external"),
		URL:           getConfigValue("IMAGOR_URL", cfg.ImagorURL, registryStore, "http://localhost:8000"),
		Secret:        getConfigValue("IMAGOR_SECRET", cfg.ImagorSecret, registryStore, ""),
		Unsafe:        cfg.ImagorUnsafe,
		ResultStorage: getConfigValue("IMAGOR_RESULT_STORAGE", cfg.ImagorResultStorage, registryStore, "same"),
	}
	imgService := imageservice.NewService(imageServiceConfig)

	// Initialize GraphQL
	storageResolver := resolver.NewResolver(stor, registryStore, userStore, imgService, cfg.Logger)
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
	authHandler := httphandler.NewAuthHandler(tokenManager, userStore, registryStore, cfg.Logger)

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
	protectedHandler := middleware.JWTMiddleware(tokenManager)(gqlHandler)
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
		cfg:          cfg,
		db:           db,
		tokenManager: tokenManager,
		storage:      stor,
	}, nil
}

func createStorage(cfg *config.Config) (storage.Storage, error) {
	switch cfg.StorageType {
	case "file", "filesystem":
		cfg.Logger.Info("Creating file storage",
			zap.String("baseDir", cfg.FileBaseDir),
			zap.String("mkdirPermissions", cfg.FileMkdirPermissions.String()),
			zap.String("writePermissions", cfg.FileWritePermissions.String()),
		)

		return filestorage.New(cfg.FileBaseDir,
			filestorage.WithMkdirPermission(cfg.FileMkdirPermissions),
			filestorage.WithWritePermission(cfg.FileWritePermissions),
		)

	case "s3":
		cfg.Logger.Info("Creating S3 storage",
			zap.String("bucket", cfg.S3Bucket),
			zap.String("region", cfg.S3Region),
			zap.String("endpoint", cfg.S3Endpoint),
			zap.String("baseDir", cfg.S3BaseDir),
		)

		var options []s3storage.Option

		if cfg.S3Region != "" {
			options = append(options, s3storage.WithRegion(cfg.S3Region))
		}

		if cfg.S3Endpoint != "" {
			options = append(options, s3storage.WithEndpoint(cfg.S3Endpoint))
		}

		if cfg.S3AccessKeyID != "" && cfg.S3SecretAccessKey != "" {
			options = append(options, s3storage.WithCredentials(
				cfg.S3AccessKeyID,
				cfg.S3SecretAccessKey,
				cfg.S3SessionToken,
			))
		}

		if cfg.S3BaseDir != "" {
			options = append(options, s3storage.WithBaseDir(cfg.S3BaseDir))
		}

		return s3storage.New(cfg.S3Bucket, options...)

	default:
		return nil, fmt.Errorf("unsupported storage type: %s", cfg.StorageType)
	}
}

func (s *Server) Run() error {
	addr := fmt.Sprintf(":%d", s.cfg.Port)
	s.cfg.Logger.Info("Server is running", zap.String("address", fmt.Sprintf("http://localhost%s", addr)))
	return http.ListenAndServe(addr, nil)
}

func (s *Server) Close() error {
	return s.db.Close()
}

// bootstrapJWTSecret loads or generates JWT secret from registry or environment
func bootstrapJWTSecret(cfg *config.Config, registryStore registrystore.Store, encryptionService *encryption.Service) (string, error) {
	const SystemOwnerID = "system"

	// 1. Check environment variable first (highest priority)
	if envSecret := os.Getenv("JWT_SECRET"); envSecret != "" {
		return envSecret, nil
	}

	// 2. Check system registry
	ctx := context.Background()
	registryEntry, err := registryStore.Get(ctx, SystemOwnerID, "jwt_secret")
	if err != nil {
		return "", fmt.Errorf("failed to get JWT secret from registry: %w", err)
	}

	if registryEntry != nil && registryEntry.Value != "" {
		return registryEntry.Value, nil
	}

	// 3. Auto-generate and store in registry
	newSecret := generateSecureSecret(32)
	_, err = registryStore.Set(ctx, SystemOwnerID, "jwt_secret", newSecret)
	if err != nil {
		return "", fmt.Errorf("failed to store generated JWT secret: %w", err)
	}

	cfg.Logger.Info("Generated new JWT secret and stored in registry")
	return newSecret, nil
}

// generateSecureSecret generates a cryptographically secure random string
func generateSecureSecret(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	randomBytes := make([]byte, length)

	_, err := rand.Read(randomBytes)
	if err != nil {
		// Fallback to a simple implementation if crypto/rand fails
		for i := range b {
			b[i] = charset[i%len(charset)]
		}
		return string(b)
	}

	for i := range b {
		b[i] = charset[randomBytes[i]%byte(len(charset))]
	}
	return string(b)
}

// getConfigValue implements the priority system: env var -> registry -> default
func getConfigValue(envKey, envValue string, registryStore registrystore.Store, defaultValue string) string {
	// 1. Environment variable (highest priority)
	if envValue != "" {
		return envValue
	}

	// 2. System registry (middle priority)
	ctx := context.Background()
	registryKey := strings.ToLower(strings.ReplaceAll(envKey, "_", "_"))
	registryEntry, err := registryStore.Get(ctx, "system", registryKey)
	if err == nil && registryEntry != nil && registryEntry.Value != "" {
		return registryEntry.Value
	}

	// 3. Default value (lowest priority)
	return defaultValue
}

// createStorageWithRegistry creates storage with registry-first configuration
func createStorageWithRegistry(cfg *config.Config, registryStore registrystore.Store) (storage.Storage, error) {
	// Get storage type with priority: env -> registry -> config default
	storageType := getConfigValue("STORAGE_TYPE", cfg.StorageType, registryStore, "file")

	switch storageType {
	case "file", "filesystem":
		baseDir := getConfigValue("FILE_BASE_DIR", cfg.FileBaseDir, registryStore, "./storage")

		cfg.Logger.Info("Creating file storage",
			zap.String("baseDir", baseDir),
			zap.String("mkdirPermissions", cfg.FileMkdirPermissions.String()),
			zap.String("writePermissions", cfg.FileWritePermissions.String()),
		)

		return filestorage.New(baseDir,
			filestorage.WithMkdirPermission(cfg.FileMkdirPermissions),
			filestorage.WithWritePermission(cfg.FileWritePermissions),
		)

	case "s3":
		bucket := getConfigValue("S3_BUCKET", cfg.S3Bucket, registryStore, "")
		region := getConfigValue("S3_REGION", cfg.S3Region, registryStore, "")
		endpoint := getConfigValue("S3_ENDPOINT", cfg.S3Endpoint, registryStore, "")
		accessKeyID := getConfigValue("S3_ACCESS_KEY_ID", cfg.S3AccessKeyID, registryStore, "")
		secretAccessKey := getConfigValue("S3_SECRET_ACCESS_KEY", cfg.S3SecretAccessKey, registryStore, "")
		sessionToken := getConfigValue("S3_SESSION_TOKEN", cfg.S3SessionToken, registryStore, "")
		baseDir := getConfigValue("S3_BASE_DIR", cfg.S3BaseDir, registryStore, "")

		if bucket == "" {
			return nil, fmt.Errorf("s3-bucket is required when storage-type is s3")
		}

		cfg.Logger.Info("Creating S3 storage",
			zap.String("bucket", bucket),
			zap.String("region", region),
			zap.String("endpoint", endpoint),
			zap.String("baseDir", baseDir),
		)

		var options []s3storage.Option

		if region != "" {
			options = append(options, s3storage.WithRegion(region))
		}

		if endpoint != "" {
			options = append(options, s3storage.WithEndpoint(endpoint))
		}

		if accessKeyID != "" && secretAccessKey != "" {
			options = append(options, s3storage.WithCredentials(
				accessKeyID,
				secretAccessKey,
				sessionToken,
			))
		}

		if baseDir != "" {
			options = append(options, s3storage.WithBaseDir(baseDir))
		}

		return s3storage.New(bucket, options...)

	default:
		return nil, fmt.Errorf("unsupported storage type: %s", storageType)
	}
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
