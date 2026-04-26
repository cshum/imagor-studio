//go:build !vips

package imagorprovider

import (
	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/pkg/processing"
	"go.uber.org/zap"
)

// buildProcessors returns no processor options when built without the vips tag.
// Used by the management service binary (CGO_ENABLED=0, no libvips dependency).
func buildProcessors(_ *zap.Logger, _ *config.Config, decorator processing.ProcessorDecorator, extraProcessors []imagor.Processor) []imagor.Option {
	if len(extraProcessors) == 0 {
		return nil
	}
	processors := make([]imagor.Processor, 0, len(extraProcessors))
	for _, processor := range extraProcessors {
		if decorator != nil {
			processor = decorator.WrapProcessor(processor)
		}
		processors = append(processors, processor)
	}
	return []imagor.Option{imagor.WithProcessors(processors...)}
}
