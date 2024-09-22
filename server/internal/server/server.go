package server

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/graphql"
	"github.com/cshum/imagor-studio/server/internal/storagemanager"
	"github.com/cshum/imagor-studio/server/migrations"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/zap"
)

type Server struct {
	cfg *config.Config
	db  *bun.DB
}

func New(cfg *config.Config) (*Server, error) {
	sqldb, err := sql.Open(sqliteshim.ShimName, cfg.DBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := bun.NewDB(sqldb, sqlitedialect.New())

	// Run migrations
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

	storageManager, err := storagemanager.New(db, cfg.Logger, cfg.ImagorSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage manager: %w", err)
	}

	resolver := graphql.NewResolver(storageManager, cfg.Logger)
	schema := graphql.NewExecutableSchema(graphql.Config{Resolvers: resolver})
	gqlHandler := handler.NewDefaultServer(schema)

	http.Handle("/query", gqlHandler)
	http.Handle("/", playground.Handler("GraphQL playground", "/query"))

	return &Server{
		cfg: cfg,
		db:  db,
	}, nil
}

func (s *Server) Run() error {
	addr := fmt.Sprintf(":%d", s.cfg.Port)
	s.cfg.Logger.Info("Server is running", zap.String("address", fmt.Sprintf("http://localhost%s", addr)))
	return http.ListenAndServe(addr, nil)
}

func (s *Server) Close() error {
	return s.db.Close()
}
