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
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
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

	// Run migrations or create tables if needed
	err = db.RunInTx(context.Background(), nil, func(ctx context.Context, tx bun.Tx) error {
		_, err := tx.NewCreateTable().Model((*storagemanager.Storage)(nil)).IfNotExists().Exec(ctx)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create schema resources: %w", err)
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
