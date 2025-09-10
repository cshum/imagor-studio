package imagorprovider

import (
	"context"
	"crypto/sha1"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor/imagorpath"
	"go.uber.org/zap"
)

// ImagorState represents the current state of imagor configuration
type ImagorState string

const (
	ImagorStateDisabled   ImagorState = "disabled"
	ImagorStateConfigured ImagorState = "configured"
)

// ImagorConfig holds imagor configuration
type ImagorConfig struct {
	Mode    string // "external", "embedded", "disabled"
	BaseURL string // External URL or "/imagor" for embedded
	Secret  string // Secret key for URL signing
	Unsafe  bool   // Enable unsafe URLs for development
}

// Provider handles imagor configuration with state management
type Provider struct {
	logger         *zap.Logger
	registryStore  registrystore.Store
	config         *config.Config
	currentConfig  *ImagorConfig
	imagorHandler  http.Handler // For embedded mode
	imagorState    ImagorState
	configLoadedAt int64 // Unix milliseconds when config was loaded
	mutex          sync.RWMutex
}

// New creates a new imagor provider
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config) *Provider {
	return &Provider{
		logger:         logger,
		registryStore:  registryStore,
		config:         cfg,
		imagorState:    ImagorStateDisabled,
		configLoadedAt: time.Now().UnixMilli(),
		mutex:          sync.RWMutex{},
	}
}

// GetConfig returns the current imagor configuration
func (p *Provider) GetConfig() *ImagorConfig {
	p.mutex.RLock()
	if p.imagorState == ImagorStateConfigured {
		defer p.mutex.RUnlock()
		return p.currentConfig
	}
	p.mutex.RUnlock()

	// For disabled state, check registry once and try to configure
	return p.loadConfigFromRegistry()
}

// GetHandler returns the HTTP handler for embedded mode (nil for external/disabled)
func (p *Provider) GetHandler() http.Handler {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	if p.imagorState == ImagorStateConfigured &&
		p.currentConfig != nil &&
		p.currentConfig.Mode == "embedded" {
		return p.imagorHandler
	}
	return nil
}

// InitializeWithConfig initializes imagor with the given configuration
func (p *Provider) InitializeWithConfig(cfg *config.Config) error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	// Check if imagor is configured in registry
	if p.isImagorConfiguredInRegistry() {
		imagorConfig, err := p.buildConfigFromRegistry()
		if err != nil {
			p.logger.Warn("Failed to create imagor config from registry, using disabled state", zap.Error(err))
			p.currentConfig = &ImagorConfig{Mode: "disabled"}
			p.imagorState = ImagorStateDisabled
			return nil
		}

		// Create embedded handler if needed
		if imagorConfig.Mode == "embedded" {
			handler, err := p.createEmbeddedHandler(imagorConfig)
			if err != nil {
				p.logger.Warn("Failed to create embedded imagor handler, using disabled state", zap.Error(err))
				p.currentConfig = &ImagorConfig{Mode: "disabled"}
				p.imagorState = ImagorStateDisabled
				return nil
			}
			p.imagorHandler = handler
		}

		p.currentConfig = imagorConfig
		p.imagorState = ImagorStateConfigured
		p.configLoadedAt = time.Now().UnixMilli()
		p.logger.Info("Imagor initialized successfully", zap.String("mode", imagorConfig.Mode))
	} else {
		// Use config from startup flags/env
		imagorConfig := &ImagorConfig{
			Mode:    cfg.ImagorMode,
			BaseURL: cfg.ImagorURL,
			Secret:  cfg.ImagorSecret,
			Unsafe:  cfg.ImagorUnsafe,
		}

		// Adjust base URL for embedded mode
		if imagorConfig.Mode == "embedded" {
			imagorConfig.BaseURL = "/imagor"
			handler, err := p.createEmbeddedHandler(imagorConfig)
			if err != nil {
				p.logger.Warn("Failed to create embedded imagor handler, using disabled state", zap.Error(err))
				imagorConfig.Mode = "disabled"
			} else {
				p.imagorHandler = handler
			}
		}

		p.currentConfig = imagorConfig
		if imagorConfig.Mode == "disabled" {
			p.imagorState = ImagorStateDisabled
		} else {
			p.imagorState = ImagorStateConfigured
		}
		p.configLoadedAt = time.Now().UnixMilli()
		p.logger.Info("Imagor initialized from config", zap.String("mode", imagorConfig.Mode))
	}

	return nil
}

// IsRestartRequired checks if a restart is required due to imagor configuration changes
func (p *Provider) IsRestartRequired() bool {
	p.mutex.RLock()
	defer p.mutex.RUnlock()

	if p.imagorState == ImagorStateDisabled {
		return false // No restart needed for first-time setup
	}

	ctx := context.Background()
	result := registryutil.GetEffectiveValue(ctx, p.registryStore, p.config, "config.imagor_config_updated_at")
	if !result.Exists {
		return false
	}

	configUpdatedAt, err := strconv.ParseInt(result.Value, 10, 64)
	if err != nil {
		return false
	}

	return configUpdatedAt > p.configLoadedAt
}

// ReloadFromRegistry forces a reload of imagor configuration from registry
func (p *Provider) ReloadFromRegistry() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	// Check if imagor is configured in registry
	if !p.isImagorConfiguredInRegistry() {
		p.logger.Info("No imagor configuration found in registry, keeping disabled state")
		return nil
	}

	// Try to create config from registry configuration
	imagorConfig, err := p.buildConfigFromRegistry()
	if err != nil {
		return fmt.Errorf("failed to build imagor config from registry: %w", err)
	}

	// Create embedded handler if needed
	if imagorConfig.Mode == "embedded" {
		handler, err := p.createEmbeddedHandler(imagorConfig)
		if err != nil {
			return fmt.Errorf("failed to create embedded imagor handler: %w", err)
		}
		p.imagorHandler = handler
	} else {
		p.imagorHandler = nil
	}

	p.currentConfig = imagorConfig
	p.imagorState = ImagorStateConfigured
	p.configLoadedAt = time.Now().UnixMilli()
	p.logger.Info("Imagor reloaded from registry", zap.String("mode", imagorConfig.Mode))

	return nil
}

// loadConfigFromRegistry attempts to load imagor configuration from registry
func (p *Provider) loadConfigFromRegistry() *ImagorConfig {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.imagorState == ImagorStateConfigured {
		return p.currentConfig
	}

	// Check if imagor is now configured in registry
	if !p.isImagorConfiguredInRegistry() {
		return p.currentConfig // Still disabled
	}

	// Try to create config from registry configuration
	imagorConfig, err := p.buildConfigFromRegistry()
	if err != nil {
		p.logger.Error("Failed to build imagor config from registry", zap.Error(err))
		return p.currentConfig
	}

	// Create embedded handler if needed
	if imagorConfig.Mode == "embedded" {
		handler, err := p.createEmbeddedHandler(imagorConfig)
		if err != nil {
			p.logger.Error("Failed to create embedded imagor handler", zap.Error(err))
			return p.currentConfig
		}
		p.imagorHandler = handler
	}

	p.currentConfig = imagorConfig
	p.imagorState = ImagorStateConfigured
	p.configLoadedAt = time.Now().UnixMilli()
	p.logger.Info("Imagor configured from registry", zap.String("mode", imagorConfig.Mode))

	return p.currentConfig
}

// isImagorConfiguredInRegistry checks if imagor is configured in the registry
func (p *Provider) isImagorConfiguredInRegistry() bool {
	ctx := context.Background()
	result := registryutil.GetEffectiveValue(ctx, p.registryStore, p.config, "config.imagor_configured")
	return result.Exists && result.Value == "true"
}

// buildConfigFromRegistry builds an imagor config object from registry values
func (p *Provider) buildConfigFromRegistry() (*ImagorConfig, error) {
	ctx := context.Background()

	// Get all imagor configuration keys in one batch call
	results := registryutil.GetEffectiveValues(ctx, p.registryStore, p.config,
		"config.imagor_mode",
		"config.imagor_base_url",
		"config.imagor_secret",
		"config.imagor_unsafe")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Get imagor mode
	modeResult := resultMap["config.imagor_mode"]
	if !modeResult.Exists {
		return nil, fmt.Errorf("imagor mode not found in registry")
	}

	imagorConfig := &ImagorConfig{
		Mode: modeResult.Value,
	}

	// Set base URL based on mode
	if imagorConfig.Mode == "embedded" {
		imagorConfig.BaseURL = "/imagor"
	} else if baseURLResult := resultMap["config.imagor_base_url"]; baseURLResult.Exists {
		imagorConfig.BaseURL = baseURLResult.Value
	} else {
		imagorConfig.BaseURL = "http://localhost:8000" // Default for external
	}

	// Get secret
	if secretResult := resultMap["config.imagor_secret"]; secretResult.Exists {
		imagorConfig.Secret = secretResult.Value
	}

	// Get unsafe flag
	if unsafeResult := resultMap["config.imagor_unsafe"]; unsafeResult.Exists {
		if unsafe, err := strconv.ParseBool(unsafeResult.Value); err == nil {
			imagorConfig.Unsafe = unsafe
		}
	}

	return imagorConfig, nil
}

// createEmbeddedHandler creates an embedded imagor handler
func (p *Provider) createEmbeddedHandler(cfg *ImagorConfig) (http.Handler, error) {
	options := []imagor.Option{
		imagor.WithUnsafe(cfg.Unsafe),
	}

	// Add signer if secret is provided
	if cfg.Secret != "" {
		alg := sha1.New // Default to SHA1 like imagor
		signer := imagorpath.NewHMACSigner(alg, 0, cfg.Secret)
		options = append(options, imagor.WithSigner(signer))
	}

	app := imagor.New(options...)
	return app, nil
}
