package bootstrap

import "github.com/cshum/imagor-studio/server/internal/config"

// Mode describes the runtime composition selected from config.
type Mode string

const (
	ModeEmbedded   Mode = "embedded"
	ModeProcessing Mode = "processing"
	ModeSelfHosted Mode = "self_hosted"
	ModeCloud      Mode = "cloud"
)

// DetectMode maps runtime configuration to a stable composition mode.
func DetectMode(cfg *config.Config) Mode {
	if cfg.EmbeddedMode {
		return ModeEmbedded
	}
	if cfg.SpacesEndpoint != "" {
		return ModeProcessing
	}
	if cfg.InternalAPISecret != "" {
		return ModeCloud
	}
	return ModeSelfHosted
}

// IsMultiTenantMode reports whether the current runtime exposes cloud multi-tenant behavior.
func IsMultiTenantMode(cfg *config.Config) bool {
	return DetectMode(cfg) == ModeCloud
}
