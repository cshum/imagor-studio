package tools

import (
	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/config"
	"go.uber.org/zap"
)

type ProcessingServices = bootstrap.Services

func BuildProcessingServices(cfg *config.Config, logger *zap.Logger) (*ProcessingServices, error) {
	return bootstrap.InitializeProcessing(cfg, logger)
}
