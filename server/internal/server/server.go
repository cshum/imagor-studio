package server

import (
	"fmt"
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/graphql"
	"go.uber.org/zap"
)

type Server struct {
	cfg *config.Config
}

func New(cfg *config.Config) (*Server, error) {
	resolver := &graphql.Resolver{Storage: cfg.Storage, Logger: cfg.Logger}
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
	s.cfg.Logger.Info("Server is running", zap.String("address", fmt.Sprintf("http://localhost%s", addr)))
	return http.ListenAndServe(addr, nil)
}
