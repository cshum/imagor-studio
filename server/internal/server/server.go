package server

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/cshum/imagor-studio/server/ent"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/graphql"
	"github.com/cshum/imagor-studio/server/internal/storagemanager"
	"go.uber.org/zap"

	_ "github.com/mattn/go-sqlite3"
)

type Server struct {
	cfg *config.Config
}

func New(cfg *config.Config) (*Server, error) {
	// Modify the dbPath to include the foreign key option
	dbPath := cfg.DBPath
	if !strings.Contains(dbPath, "?") {
		dbPath += "?"
	} else if !strings.HasSuffix(dbPath, "&") {
		dbPath += "&"
	}
	dbPath += "_fk=1"
	client, err := ent.Open("sqlite3", dbPath)
	if err != nil {
		cfg.Logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer client.Close()

	// Run the auto migration tool.
	if err := client.Schema.Create(context.Background()); err != nil {
		cfg.Logger.Fatal("Failed to create schema resources", zap.Error(err))
	}

	storageManager, err := storagemanager.New(client, cfg.Logger, cfg.ImagorSecret)
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
	}, nil
}

func (s *Server) Run() error {
	addr := fmt.Sprintf(":%d", s.cfg.Port)
	s.cfg.Logger.Info("Server is running", zap.String("address", fmt.Sprintf("http://localhost%s", addr)))
	return http.ListenAndServe(addr, nil)
}
