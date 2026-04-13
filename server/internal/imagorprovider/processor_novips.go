//go:build !vips

package imagorprovider

import (
	"github.com/cshum/imagor"
	"go.uber.org/zap"
)

// buildProcessors returns no processor options when built without the vips tag.
// Used by the management service binary (CGO_ENABLED=0, no libvips dependency).
func buildProcessors(_ *zap.Logger) []imagor.Option {
	return nil
}
