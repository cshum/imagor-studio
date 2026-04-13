package imagorprovider

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor/imagorpath"
	"github.com/cshum/imagor/processor/vipsprocessor"
	"github.com/cshum/imagorvideo"
	"go.uber.org/zap"
)

// storageSource abstracts storageprovider.Provider for testability.
// storageprovider.Provider satisfies this interface automatically.
type storageSource interface {
	GetStorage() storage.Storage
}

// StorageLoader adapts a storageSource to imagor.Loader.
// It calls GetStorage() on every request so storage config changes
// (lazy loading, reloads) are picked up automatically — the imagor
// instance never needs to be rebuilt due to storage changes.
type StorageLoader struct {
	source storageSource
}

// Get implements imagor.Loader by delegating to the current storage.
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
	return blob, blob.Err()
}

// Provider manages the imagor app lifecycle.
type Provider struct {
	logger          *zap.Logger
	registryStore   registrystore.Store
	config          *config.Config
	storageProvider *storageprovider.Provider

	// app holds the running *imagor.Imagor. Set during Initialize().
	// Atomic load/store means ServeHTTP never acquires a lock.
	app atomic.Pointer[imagor.Imagor]

	// dynSigner allows hot-swapping the HMAC signer without restarting imagor.
	dynSigner *dynamicSigner

	// mu protects currentConfig (read by Config() / Signer() / GenerateURL).
	mu            sync.RWMutex
	currentConfig *ImagorConfig
}

// New creates a new imagor provider.
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config, storageProvider *storageprovider.Provider) *Provider {
	return &Provider{
		logger:          logger,
		registryStore:   registryStore,
		config:          cfg,
		storageProvider: storageProvider,
	}
}

// Config returns the current imagor configuration.
func (p *Provider) Config() *ImagorConfig {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.currentConfig
}

// Imagor returns the running *imagor.Imagor instance.
// Non-nil after Initialize(); safe to use concurrently.
func (p *Provider) Imagor() *imagor.Imagor {
	return p.app.Load()
}

// ServeHTTP implements http.Handler. Forwards requests to the current imagor
// instance via an atomic pointer load — no mutex required.
func (p *Provider) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h := p.app.Load(); h != nil {
		h.ServeHTTP(w, r)
	} else {
		http.NotFound(w, r)
	}
}

// Initialize starts the imagor instance for the first time using registry/config values.
func (p *Provider) Initialize() error {
	cfg, err := buildConfigFromRegistry(p.registryStore, p.config)
	if err != nil {
		return fmt.Errorf("failed to build imagor configuration: %w", err)
	}
	if err := p.createApp(cfg); err != nil {
		return err
	}
	p.mu.Lock()
	p.currentConfig = cfg
	p.mu.Unlock()
	p.logger.Info("Imagor initialized")
	return nil
}

// ReloadFromRegistry applies configuration changes from the registry.
// Secret / algorithm changes hot-swap the dynamic signer only — no imagor restart needed.
// Storage changes are handled transparently by StorageLoader and never require a reload.
func (p *Provider) ReloadFromRegistry() error {
	newCfg, err := buildConfigFromRegistry(p.registryStore, p.config)
	if err != nil {
		return fmt.Errorf("failed to build imagor configuration: %w", err)
	}

	if p.dynSigner != nil {
		// Hot-swap the signer — no imagor restart needed.
		p.dynSigner.update(signerFromConfig(newCfg))
		p.logger.Info("Imagor signer hot-swapped from registry")
	}

	p.mu.Lock()
	p.currentConfig = newCfg
	p.mu.Unlock()
	return nil
}

// createApp builds a new *imagor.Imagor and stores it atomically.
// Called during Initialize(); does not shut down any previous instance.
func (p *Provider) createApp(cfg *ImagorConfig) error {
	var options []imagor.Option

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

	ds := &dynamicSigner{}
	ds.update(signerFromConfig(cfg))
	p.dynSigner = ds
	options = append(options, imagor.WithSigner(ds))

	options = append(options, imagor.WithLoaders(&StorageLoader{source: p.storageProvider}))

	app := imagor.New(options...)
	if err := app.Startup(context.Background()); err != nil {
		return fmt.Errorf("failed to start imagor: %w", err)
	}
	p.app.Store(app)
	return nil
}

// Signer returns the active imagorpath.Signer.
func (p *Provider) Signer() imagorpath.Signer {
	return signerFromConfig(p.Config())
}

// GenerateURL generates a signed imagor URL for the given image path and params.
func (p *Provider) GenerateURL(imagePath string, params imagorpath.Params) (string, error) {
	cfg := p.Config()
	if cfg == nil {
		return "", fmt.Errorf("imagor configuration not available")
	}

	params.Image = imagePath

	if strings.Contains(imagePath, " ") || strings.ContainsAny(imagePath, "?#&()") {
		params.Base64Image = true
	}

	signer := p.Signer()
	return fmt.Sprintf("/%s", imagorpath.Generate(params, signer)), nil
}

// Shutdown gracefully shuts down the imagor instance.
func (p *Provider) Shutdown(ctx context.Context) error {
	if app := p.app.Load(); app != nil {
		p.logger.Debug("Shutting down imagor instance...")
		if err := app.Shutdown(ctx); err != nil {
			p.logger.Error("Error shutting down imagor", zap.Error(err))
			return err
		}
		p.app.Store(nil)
		p.logger.Debug("Imagor shutdown completed")
	}
	return nil
}
