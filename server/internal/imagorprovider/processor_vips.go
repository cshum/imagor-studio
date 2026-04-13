//go:build vips

package imagorprovider

import (
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor/processor/vipsprocessor"
	"github.com/cshum/imagorvideo"
	"go.uber.org/zap"
)

// buildProcessors returns imagor options that wire up the libvips and video
// processors. Compiled only when the vips build tag is set.
func buildProcessors(logger *zap.Logger) []imagor.Option {
	return []imagor.Option{
		imagor.WithProcessors(
			imagorvideo.NewProcessor(
				imagorvideo.WithLogger(logger),
			),
			vipsprocessor.NewProcessor(
				vipsprocessor.WithLogger(logger),
				vipsprocessor.WithCacheSize(200*1024*1024), // 200 MiB in-memory tile cache
				vipsprocessor.WithCacheTTL(time.Hour),
			),
		),
	}
}
