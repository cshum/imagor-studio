//go:build vips

package imagorprovider

import (
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor/processor/vipsprocessor"
	"github.com/cshum/imagorvideo"
	"go.uber.org/zap"
)

// buildProcessors returns imagor options that wire up the libvips and video
// processors. Compiled only when the vips build tag is set.
func buildProcessors(logger *zap.Logger, cfg *config.Config) []imagor.Option {
	return []imagor.Option{
		imagor.WithProcessors(
			imagorvideo.NewProcessor(
				imagorvideo.WithLogger(logger),
			),
			vipsprocessor.NewProcessor(
				vipsprocessor.WithLogger(logger),
				vipsprocessor.WithCacheSize(processorCacheSizeBytes(cfg)),
				vipsprocessor.WithCacheTTL(time.Hour),
			),
		),
	}
}
