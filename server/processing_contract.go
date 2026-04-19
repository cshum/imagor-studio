package tools

import (
	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/cloudruntime"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"go.uber.org/zap"
)

type ProcessingConfig = config.Config
type ProcessingSpaceConfig = cloudruntime.SpaceConfig
type ProcessingSpaceConfigReader = cloudruntime.SpaceConfigReader
type ProcessingProviderOption = imagorprovider.ProviderOption

type ProcessingRuntimeFactory = func(cfg *ProcessingConfig, logger *zap.Logger) (ProcessingSpaceConfigReader, imagor.Loader, ProcessingProviderOption, error)
