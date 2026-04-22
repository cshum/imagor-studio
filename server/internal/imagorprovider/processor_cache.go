package imagorprovider

import "github.com/cshum/imagor-studio/server/internal/config"

const defaultProcessorCacheSizeBytes = 200 * 1024 * 1024

func processorCacheSizeBytes(cfg *config.Config) int64 {
	cacheSizeBytes := int64(defaultProcessorCacheSizeBytes)
	if cfg != nil && cfg.ImagorCacheSizeBytes > 0 {
		cacheSizeBytes = cfg.ImagorCacheSizeBytes
	}
	return cacheSizeBytes
}
