package main

import (
	"log"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/server"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	defer cfg.Logger.Sync()

	srv, err := server.New(cfg)
	if err != nil {
		cfg.Logger.Fatal("Failed to create server", zap.Error(err))
	}

	if err := srv.Run(); err != nil {
		cfg.Logger.Fatal("Failed to run server", zap.Error(err))
	}
}
