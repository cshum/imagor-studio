package processing

import (
	"context"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"go.uber.org/zap"
)

type Config = config.Config

type SpaceConfig interface {
	GetKey() string
	GetPrefix() string
	GetBucket() string
	GetRegion() string
	GetEndpoint() string
	GetAccessKeyID() string
	GetSecretKey() string
	GetUsePathStyle() bool
	GetCustomDomain() string
	IsSuspended() bool
	GetSignerAlgorithm() string
	GetSignerTruncate() int
	GetImagorSecret() string
}

type SpaceConfigReader interface {
	Get(key string) (SpaceConfig, bool)
	GetByHostname(hostname string) (SpaceConfig, bool)
	Start(ctx context.Context) error
}

type RuntimeFactory = func(cfg *Config, logger *zap.Logger) (SpaceConfigReader, imagor.Loader, error)
