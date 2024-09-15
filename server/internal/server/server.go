package server

import (
	"fmt"
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/graphql"
	"github.com/cshum/imagor-studio/server/internal/storage"
)

type Server struct {
	cfg *config.Config
}

func New(cfg *config.Config) (*Server, error) {
	store, err := storage.NewStorage(cfg.StorageType, cfg.S3Bucket, cfg.S3Region, cfg.FilesysRoot)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage: %w", err)
	}

	resolver := &graphql.Resolver{Storage: store}
	schema := graphql.NewExecutableSchema(graphql.Config{Resolvers: resolver})
	gqlHandler := handler.NewDefaultServer(schema)

	http.Handle("/query", gqlHandler)
	http.Handle("/", playground.Handler("GraphQL playground", "/query"))

	return &Server{
		cfg: cfg,
	}, nil
}

func (s *Server) Run() error {
	addr := fmt.Sprintf(":%d", s.cfg.Port)
	fmt.Printf("Server is running on http://localhost%s\n", addr)
	return http.ListenAndServe(addr, nil)
}
