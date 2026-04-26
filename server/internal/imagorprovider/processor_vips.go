//go:build vips

package imagorprovider

import (
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/cshum/imagor/processor/vipsprocessor"
	"github.com/cshum/imagorvideo"
	"go.uber.org/zap"
)

// buildProcessors returns imagor options that wire up the libvips and video
// processors. Compiled only when the vips build tag is set.

func buildProcessors(logger *zap.Logger, cfg *config.Config, decorator processing.ProcessorDecorator, extraProcessors []imagor.Processor) []imagor.Option {
	wrap := func(next imagor.Processor) imagor.Processor {
		if decorator == nil {
			return next
		}
		return decorator.WrapProcessor(next)
	}
	processors := []imagor.Processor{
		wrap(imagorvideo.NewProcessor(
			imagorvideo.WithLogger(logger),
		)),
		wrap(vipsprocessor.NewProcessor(
			vipsprocessor.WithLogger(logger),
			vipsprocessor.WithCacheSize(processorCacheSizeBytes(cfg)),
			vipsprocessor.WithCacheTTL(time.Hour),
		)),
	}
	for _, processor := range extraProcessors {
		processors = append(processors, wrap(processor))
	}
	return []imagor.Option{
		imagor.WithProcessors(
			processors...,
		),
	}
}
