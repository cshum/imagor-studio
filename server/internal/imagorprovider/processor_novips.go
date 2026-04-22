//go:build !vips

package imagorprovider

import (
	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"go.uber.org/zap"
)

// buildProcessors returns no processor options when built without the vips tag.
// Used by the management service binary (CGO_ENABLED=0, no libvips dependency).
func buildProcessors(_ *zap.Logger, _ *config.Config) []imagor.Option {
	return nil
}
