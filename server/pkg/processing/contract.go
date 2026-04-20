package processing

import (
	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/cloudruntime"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"go.uber.org/zap"
)

type Config = config.Config
type SpaceConfig = cloudruntime.SpaceConfig
type SpaceConfigReader = cloudruntime.SpaceConfigReader
type ProviderOption = imagorprovider.ProviderOption

type RuntimeFactory = func(cfg *Config, logger *zap.Logger) (SpaceConfigReader, imagor.Loader, ProviderOption, error)

var DefaultRuntimeFactoryOption = imagorprovider.WithSpaceConfigStore
