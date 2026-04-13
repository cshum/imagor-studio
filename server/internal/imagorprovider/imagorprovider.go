package imagorprovider

import (
	"context"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"fmt"
	"hash"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor/imagorpath"
	"github.com/cshum/imagor/processor/vipsprocessor"
	"github.com/cshum/imagorvideo"
	"go.uber.org/zap"
)

// ImagorConfig holds imagor configuration
type ImagorConfig struct {
	Secret         string // Secret key for URL signing
	Unsafe         bool   // Enable unsafe URLs for development
	SignerType     string // Hash algorithm: "sha1", "sha256", "sha512"
	SignerTruncate int    // Signature truncation length
}

// storageSource abstracts storageprovider.Provider for testability.
// storageprovider.Provider satisfies this interface automatically.
type storageSource interface {
	GetStorage() storage.Storage
}

// StorageLoader adapts a storageSource to imagor.Loader.
// It calls GetStorage() on every request so storage config changes
// (lazy loading, reloads) are picked up automatically — the imagor
// handler never needs to be rebuilt due to storage changes.
type StorageLoader struct {
	source storageSource
}

// Get implements imagor.Loader by delegating to the current storage.
// The factory is called fresh on each blob read (sniff + actual read), matching
// imagor's filestorage pattern. Errors from storage surface immediately via
// blob.Err() so imagor can treat missing files as 4xx.
func (l *StorageLoader) Get(r *http.Request, key string) (*imagor.Blob, error) {
	ctx := r.Context()
	source := l.source
	blob := imagor.NewBlob(func() (io.ReadCloser, int64, error) {
		rc, err := source.GetStorage().Get(ctx, key)
		if err != nil {
			return nil, -1, err
		}
		return rc, -1, nil
	})
	// Trigger doInit eagerly (matches filestorage: return blob, blob.Err()).
	// This causes the sniff read to happen now so 404s are surfaced immediately.
	return blob, blob.Err()
}

// Provider handles imagor configuration with state management
type Provider struct {
	logger          *zap.Logger
	registryStore   registrystore.Store
	config          *config.Config
	storageProvider *storageprovider.Provider
	currentConfig   *ImagorConfig
	imagorHandler   http.Handler   // Embedded imagor HTTP handler
	imagorInstance  *imagor.Imagor // For shutdown cleanup
	mutex           sync.RWMutex
}

// New creates a new imagor provider
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config, storageProvider *storageprovider.Provider) *Provider {
	return &Provider{
		logger:          logger,
		registryStore:   registryStore,
		config:          cfg,
		storageProvider: storageProvider,
		mutex:           sync.RWMutex{},
	}
}

// buildConfig creates imagor configuration from registry, CLI, or defaults
func (p *Provider) buildConfig() (*ImagorConfig, error) {
	return p.buildConfigFromRegistry()
}

// GetConfig returns the current imagor configuration
func (p *Provider) GetConfig() *ImagorConfig {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.currentConfig
}

// ServeHTTP implements http.Handler by forwarding to the current imagor instance.
// Dynamic dispatch happens per-request so signer config updates (via ReloadFromRegistry)
// are picked up without re-registering the route.
func (p *Provider) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p.mutex.RLock()
	h := p.imagorHandler
	p.mutex.RUnlock()
	if h != nil {
		h.ServeHTTP(w, r)
	} else {
		http.NotFound(w, r)
	}
}

// GetInstance returns the imagor instance (for in-process request handling)
func (p *Provider) GetInstance() *imagor.Imagor {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.imagorInstance
}

// Initialize initializes imagor using registry and provider configuration
func (p *Provider) Initialize() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	imagorConfig, err := p.buildConfig()
	if err != nil {
		return fmt.Errorf("failed to build imagor configuration: %w", err)
	}

	return p.setupHandler(imagorConfig, "Imagor initialized")
}

// setupHandler creates the embedded handler and updates provider state
func (p *Provider) setupHandler(imagorConfig *ImagorConfig, logMessage string) error {
	handler, err := p.createEmbeddedHandler(imagorConfig)
	if err != nil {
		return fmt.Errorf("failed to create embedded imagor handler: %w", err)
	}
	p.imagorHandler = handler
	p.currentConfig = imagorConfig
	p.logger.Info(logMessage)
	return nil
}

// ReloadFromRegistry forces a reload of imagor configuration from registry.
// Only rebuilds the imagor handler when signer configuration changes.
// Storage changes are handled transparently by StorageLoader.
func (p *Provider) ReloadFromRegistry() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	imagorConfig, err := p.buildConfig()
	if err != nil {
		return fmt.Errorf("failed to build imagor configuration: %w", err)
	}

	return p.setupHandler(imagorConfig, "Imagor reloaded from registry")
}

// buildConfigFromRegistry builds an imagor config object from registry values
func (p *Provider) buildConfigFromRegistry() (*ImagorConfig, error) {
	ctx := context.Background()

	results := registryutil.GetEffectiveValues(ctx, p.registryStore, p.config,
		"config.imagor_secret",
		"config.imagor_unsafe",
		"config.imagor_signer_type",
		"config.imagor_signer_truncate")

	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	imagorConfig := &ImagorConfig{}

	if signerTypeResult := resultMap["config.imagor_signer_type"]; signerTypeResult.Exists {
		imagorConfig.SignerType = signerTypeResult.Value
	} else {
		imagorConfig.SignerType = "sha1"
	}

	if signerTruncateResult := resultMap["config.imagor_signer_truncate"]; signerTruncateResult.Exists {
		if truncate, err := strconv.Atoi(signerTruncateResult.Value); err == nil {
			imagorConfig.SignerTruncate = truncate
		}
	}

	if unsafeResult := resultMap["config.imagor_unsafe"]; unsafeResult.Exists {
		if unsafe, err := strconv.ParseBool(unsafeResult.Value); err == nil {
			imagorConfig.Unsafe = unsafe
		}
	}

	if secretResult := resultMap["config.imagor_secret"]; secretResult.Exists {
		imagorConfig.Secret = secretResult.Value
	} else if !imagorConfig.Unsafe {
		// defaults to jwt secret, sha256, truncate 32 if imagor secret not set
		imagorConfig.Secret = p.config.JWTSecret
		imagorConfig.SignerType = "sha256"
		imagorConfig.SignerTruncate = 32
	}

	return imagorConfig, nil
}

// getHashAlgorithm returns the hash algorithm function based on signer type
func getHashAlgorithm(signerType string) func() hash.Hash {
	switch strings.ToLower(signerType) {
	case "sha256":
		return sha256.New
	case "sha512":
		return sha512.New
	default:
		return sha1.New // default
	}
}

// signerFromConfig builds an imagorpath.Signer from the given config.
// Returns nil when unsafe mode is enabled.
func signerFromConfig(cfg *ImagorConfig) imagorpath.Signer {
	if cfg == nil || cfg.Unsafe {
		return nil
	}
	return imagorpath.NewHMACSigner(getHashAlgorithm(cfg.SignerType), cfg.SignerTruncate, cfg.Secret)
}

// GetSigner returns the active imagorpath.Signer based on the current configuration.
// Returns nil when operating in unsafe mode.
func (p *Provider) GetSigner() imagorpath.Signer {
	return signerFromConfig(p.GetConfig())
}

// GenerateURL generates an imagor URL for the given image path and parameters
func (p *Provider) GenerateURL(imagePath string, params imagorpath.Params) (string, error) {
	cfg := p.GetConfig()
	if cfg == nil {
		return "", fmt.Errorf("imagor configuration not available")
	}

	params.Image = imagePath

	// Auto-enable base64 encoding if path contains spaces or special characters
	if strings.Contains(imagePath, " ") ||
		strings.ContainsAny(imagePath, "?#&()") {
		params.Base64Image = true
	}

	signer := p.GetSigner()
	if signer == nil {
		return fmt.Sprintf("/%s", imagorpath.GenerateUnsafe(params)), nil
	}
	return fmt.Sprintf("/%s", imagorpath.Generate(params, signer)), nil
}

// createEmbeddedHandler creates an embedded imagor handler
func (p *Provider) createEmbeddedHandler(cfg *ImagorConfig) (http.Handler, error) {
	var options []imagor.Option

	// Add processors: video processor first, then vips processor
	options = append(options, imagor.WithProcessors(
		imagorvideo.NewProcessor(
			imagorvideo.WithLogger(p.logger),
		),
		vipsprocessor.NewProcessor(
			vipsprocessor.WithLogger(p.logger),
			vipsprocessor.WithCacheSize(200*1024*1024), // 200 MiB in-memory image cache
			vipsprocessor.WithCacheTTL(time.Hour),
		),
	))

	if signer := signerFromConfig(cfg); signer != nil {
		options = append(options, imagor.WithSigner(signer))
	} else {
		options = append(options, imagor.WithUnsafe(true))
	}

	// StorageLoader delegates to storageprovider.GetStorage() on every request,
	// so storage changes are picked up automatically without rebuilding this handler.
	options = append(options, imagor.WithLoaders(&StorageLoader{source: p.storageProvider}))

	app := imagor.New(options...)

	// Store the imagor instance for shutdown cleanup
	p.imagorInstance = app

	ctx := context.Background()
	if err := app.Startup(ctx); err != nil {
		return nil, fmt.Errorf("failed to start imagor: %w", err)
	}

	return app, nil
}

// Shutdown gracefully shuts down the imagor instance
func (p *Provider) Shutdown(ctx context.Context) error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.imagorInstance != nil {
		p.logger.Debug("Shutting down imagor instance...")
		if err := p.imagorInstance.Shutdown(ctx); err != nil {
			p.logger.Error("Error shutting down imagor", zap.Error(err))
			return err
		}
		p.imagorInstance = nil
		p.logger.Debug("Imagor shutdown completed")
	}

	return nil
}
