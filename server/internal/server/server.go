package server

import (
	"fmt"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/graphql"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/gin-gonic/gin"
)

type Server struct {
	router *gin.Engine
	cfg    *config.Config
}

func New(cfg *config.Config) (*Server, error) {
	store, err := storage.NewStorage(cfg.StorageType, cfg.S3Bucket, cfg.S3Region, cfg.FilesysRoot)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage: %w", err)
	}

	resolver := &graphql.Resolver{Storage: store}
	schema := graphql.NewExecutableSchema(graphql.Config{Resolvers: resolver})
	gqlHandler := handler.NewDefaultServer(schema)

	router := gin.Default()
	router.POST("/query", gin.WrapH(gqlHandler))
	router.GET("/", gin.WrapH(playground.Handler("GraphQL playground", "/query")))

	return &Server{
		router: router,
		cfg:    cfg,
	}, nil
}

func (s *Server) Run() error {
	return s.router.Run(fmt.Sprintf(":%d", s.cfg.Port))
}
