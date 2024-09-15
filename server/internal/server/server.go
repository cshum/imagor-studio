package server

import (
	"fmt"
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/graphql"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"go.uber.org/zap"
)

type Server struct {
	cfg    *config.Config
	logger *zap.Logger
}

func New(cfg *config.Config) (*Server, error) {
	store, err := storage.NewStorage(cfg.StorageType, cfg.S3Bucket, cfg.S3Region, cfg.FilesysRoot)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage: %w", err)
	}

	resolver := &graphql.Resolver{Storage: store, Logger: cfg.Logger}
	schema := graphql.NewExecutableSchema(graphql.Config{Resolvers: resolver})
	gqlHandler := handler.NewDefaultServer(schema)

	http.Handle("/query", gqlHandler)
	http.Handle("/", playground.Handler("GraphQL playground", "/query"))

	return &Server{
		cfg:    cfg,
		logger: cfg.Logger,
	}, nil
}

func (s *Server) Run() error {
	addr := fmt.Sprintf(":%d", s.cfg.Port)
	s.logger.Info("Server is running", zap.String("address", fmt.Sprintf("http://localhost%s", addr)))
	return http.ListenAndServe(addr, nil)
}
