package imagorprovider

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
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

// NewStorageLoader wraps a storageprovider.Provider as an imagor.Loader.
// Use this for self-hosted deployments; on SaaS processing nodes pass
// spaceloader.New(…) instead.
func NewStorageLoader(p *storageprovider.Provider) imagor.Loader {
	return &StorageLoader{source: p}
}

// Provider manages the imagor app lifecycle.
//
// The app is created once during Initialize() and never rebuilt.
// Configuration (signer secret/type) is synced from the registry every 30 seconds
// by the background sync loop (server.startSyncLoop), which calls Sync().
//
// Sync() updates:
//   - cfg: used by GenerateURL / Config() / Signer()
//   - dynSigner: wrapped inside the running imagor instance for URL verification
//
// Both are updated together so generated URLs and imagor's own verification
// always use the same key.
type Provider struct {
	logger        *zap.Logger
	registryStore registrystore.Store
	config        *config.Config

	// loader is the single imagor.Loader wired at construction time.
	// Self-hosted: NewStorageLoader(storageProvider)
	// SaaS processing node: spaceloader.New(spaceConfigStore, baseDomain)
	loader imagor.Loader

	// app is the running *imagor.Imagor instance. Set during Initialize().
	app *imagor.Imagor

	// dynSigner is passed to imagor at startup; its inner signer is replaced by
	// Sync() so imagor verifies requests with the current secret without restart.
	dynSigner *dynamicSigner

	// mu protects cfg.
	mu sync.RWMutex

	// cfg is the current imagor signing configuration. Written in Initialize()
	// and updated by Sync(). Protected by mu.
	cfg *ImagorConfig
}

// New creates a new imagor provider.
// loader is the single imagor.Loader to register: use NewStorageLoader for
// self-hosted deployments and spaceloader.New for SaaS processing nodes.
// Passing nil is valid when only URL signing/generation is needed (no image loading).
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config, loader imagor.Loader) *Provider {
	return &Provider{
		logger:        logger,
		registryStore: registryStore,
		config:        cfg,
		loader:        loader,
	}
}

// Config returns the current imagor configuration (safe for concurrent use).
func (p *Provider) Config() *ImagorConfig {
	p.mu.RLock()
	c := p.cfg
	p.mu.RUnlock()
	return c
}

// Imagor returns the running *imagor.Imagor instance.
// Non-nil after Initialize().
func (p *Provider) Imagor() *imagor.Imagor {
	return p.app
}

// Initialize starts the imagor instance using registry/config values.
func (p *Provider) Initialize() error {
	cfg, err := buildConfigFromRegistry(p.registryStore, p.config)
	if err != nil {
		return fmt.Errorf("failed to build imagor configuration: %w", err)
	}
	if err := p.createApp(cfg); err != nil {
		return err
	}
	p.mu.Lock()
	p.cfg = cfg
	p.mu.Unlock()
	p.logger.Info("Imagor initialized")
	return nil
}

// createApp builds a new *imagor.Imagor, wires up the dynamicSigner, and stores it.
func (p *Provider) createApp(cfg *ImagorConfig) error {
	ds := &dynamicSigner{}
	ds.update(signerFromConfig(cfg))
	p.dynSigner = ds

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

	options = append(options, imagor.WithSigner(p.dynSigner))

	// Wire the single loader chosen by bootstrap:
	//   - self-hosted: NewStorageLoader(storageProvider)
	//   - SaaS processing node: spaceloader.New(spaceConfigStore, baseDomain)
	if p.loader != nil {
		options = append(options, imagor.WithLoaders(p.loader))
	}

	app := imagor.New(options...)
	if err := app.Startup(context.Background()); err != nil {
		return fmt.Errorf("failed to start imagor: %w", err)
	}
	p.app = app
	return nil
}

// Signer returns an imagorpath.Signer built from the current configuration.
// Used by GenerateURL to produce signed URLs that match imagor's verification.
func (p *Provider) Signer() imagorpath.Signer {
	p.mu.RLock()
	c := p.cfg
	p.mu.RUnlock()
	return signerFromConfig(c)
}

// GenerateURL generates a signed imagor URL for the given image path and params.
func (p *Provider) GenerateURL(imagePath string, params imagorpath.Params) (string, error) {
	if p.Config() == nil {
		return "", fmt.Errorf("imagor configuration not available")
	}

	params.Image = imagePath

	if strings.Contains(imagePath, " ") || strings.ContainsAny(imagePath, "?#&()") {
		params.Base64Image = true
	}

	signer := p.Signer()
	return fmt.Sprintf("/%s", imagorpath.Generate(params, signer)), nil
}

// Sync reads the latest imagor configuration from the registry and applies it
// without restarting the imagor instance. It is called periodically by the
// background sync loop (every 30 seconds) so all replicas stay in sync.
func (p *Provider) Sync() error {
	newCfg, err := buildConfigFromRegistry(p.registryStore, p.config)
	if err != nil {
		return fmt.Errorf("imagor sync failed: %w", err)
	}

	// Update the dynamic signer first so imagor verifies with the new key
	// before GenerateURL starts producing URLs signed with the new key.
	if p.dynSigner != nil {
		p.dynSigner.update(signerFromConfig(newCfg))
	}

	p.mu.Lock()
	p.cfg = newCfg
	p.mu.Unlock()

	return nil
}

// Shutdown gracefully shuts down the imagor instance.
func (p *Provider) Shutdown(ctx context.Context) error {
	if p.app != nil {
		p.logger.Debug("Shutting down imagor instance...")
		if err := p.app.Shutdown(ctx); err != nil {
			p.logger.Error("Error shutting down imagor", zap.Error(err))
			return err
		}
		p.app = nil
		p.logger.Debug("Imagor shutdown completed")
	}
	return nil
}
