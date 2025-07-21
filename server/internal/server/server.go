// internal/server/server.go
package server

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/handlers"
	"github.com/cshum/imagor-studio/server/internal/middleware"
	"github.com/cshum/imagor-studio/server/internal/migrations"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/metadatastore"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/storage/filestorage"
	"github.com/cshum/imagor-studio/server/pkg/storage/s3storage"
	"github.com/cshum/imagor-studio/server/resolver"
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

	// Run migrations (only metadata table now)
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

	// Initialize token manager
	tokenManager := auth.NewTokenManager(
		cfg.JWTSecret,
		cfg.JWTExpiration,
	)

	// Create storage based on configuration
	stor, err := createStorage(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage: %w", err)
	}

	// Initialize metadata store
	metadataStore := metadatastore.New(db, cfg.Logger)

	// Initialize GraphQL
	storageResolver := resolver.NewResolver(stor, metadataStore, cfg.Logger)
	schema := gql.NewExecutableSchema(gql.Config{Resolvers: storageResolver})
	gqlHandler := handler.New(schema)

	// Create auth handler
	authHandler := handlers.NewAuthHandler(tokenManager, cfg.Logger)

	// Create middleware chain
	mux := http.NewServeMux()

	// Public endpoints
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Dev login endpoints (no auth required)
	mux.HandleFunc("/auth/dev-login", authHandler.DevLogin)
	mux.HandleFunc("/auth/refresh", authHandler.RefreshToken)

	// GraphQL playground (available in development, might want to disable in production)
	mux.Handle("/", playground.Handler("GraphQL playground", "/query"))

	// Protected endpoints
	protectedHandler := middleware.JWTMiddleware(tokenManager)(gqlHandler)
	mux.Handle("/query", protectedHandler)

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
