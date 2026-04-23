package processing

import (
	"context"

	"github.com/cshum/imagor"
	"go.uber.org/zap"
)

type RuntimeConfig struct {
	SpacesEndpoint            string
	InternalAPISecret         string
	SpaceBaseDomain           string
	S3HTTPMaxIdleConnsPerHost int
}

type NodeConfig struct {
	Runtime RuntimeConfig
}

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
	GetImagorCORSOrigins() []string
}

type SpaceConfigReader interface {
	Get(key string) (SpaceConfig, bool)
	GetByHostname(hostname string) (SpaceConfig, bool)
	Start(ctx context.Context) error
	Ready() bool
}

type RuntimeFactory = func(runtimeCfg RuntimeConfig, logger *zap.Logger) (SpaceConfigReader, imagor.Loader, error)
