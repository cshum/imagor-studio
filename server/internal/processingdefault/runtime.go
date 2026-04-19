package processingdefault

import (
	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/cloud/spaceconfigstore"
	"github.com/cshum/imagor-studio/server/internal/cloud/spaceloader"
	"github.com/cshum/imagor-studio/server/internal/cloudruntime"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"go.uber.org/zap"
)

func DefaultProcessingRuntimeFactory(cfg *config.Config, logger *zap.Logger) (cloudruntime.SpaceConfigReader, imagor.Loader, imagorprovider.ProviderOption, error) {
	spaceConfigStore := spaceconfigstore.New(
		cfg.SpacesEndpoint,
		cfg.InternalAPISecret,
		logger,
	)
	loader := spaceloader.New(spaceConfigStore, cfg.SpaceBaseDomain)
	return spaceConfigStore, loader, imagorprovider.WithSpaceConfigStore(spaceConfigStore, cfg.SpaceBaseDomain), nil
}
