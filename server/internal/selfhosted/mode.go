package selfhosted

import (
	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/internal/config"
)

// Enabled reports whether the configuration should run in self-hosted mode.
func Enabled(cfg *config.Config) bool {
	return bootstrap.DetectMode(cfg) == bootstrap.ModeSelfHosted
}
