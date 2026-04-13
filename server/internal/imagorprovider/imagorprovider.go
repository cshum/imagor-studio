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
	"sync/atomic"
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

// dynamicSigner allows hot-swapping the imagorpath.Signer without restarting
// the imagor instance. ReloadFromRegistry calls update() to apply secret or
// algorithm changes with zero downtime.
type dynamicSigner struct {
	mu    sync.RWMutex
	inner imagorpath.Signer // nil only when imagor is rebuilt (never during hot-swap)
}

// Sign implements imagorpath.Signer.
func (d *dynamicSigner) Sign(path string) string {
	d.mu.RLock()
	s := d.inner
	d.mu.RUnlock()
	if s != nil {
		return s.Sign(path)
	}
	return ""
}

func (d *dynamicSigner) update(s imagorpath.Signer) {
	d.mu.Lock()
	d.inner = s
	d.mu.Unlock()
}

// Provider manages the imagor app lifecycle.
type Provider struct {
	logger          *zap.Logger
	registryStore   registrystore.Store
	config          *config.Config
	storageProvider *storageprovider.Provider

	// app holds the running *imagor.Imagor. Set during Initialize(); replaced only
	// when switching between signed and unsafe mode (a rare admin operation).
	// Use atomic load/store so ServeHTTP never needs to acquire a lock.
	app atomic.Pointer[imagor.Imagor]

	// dynSigner allows hot-swapping the HMAC signer without restarting imagor.
	// nil when the current app was started in unsafe mode.
	dynSigner *dynamicSigner

	// mu protects currentConfig (read by Config() / Signer() / GenerateURL).
	mu            sync.RWMutex
	currentConfig *ImagorConfig
}

// New creates a new imagor provider
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
// The returned pointer is safe to use concurrently; it is non-nil after Initialize().
func (p *Provider) Imagor() *imagor.Imagor {
	return p.app.Load()
}

// ServeHTTP implements http.Handler. It forwards requests to the current imagor
// instance via an atomic pointer load (no mutex).
func (p *Provider) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h := p.app.Load(); h != nil {
		h.ServeHTTP(w, r)
	} else {
		http.NotFound(w, r)
	}
}

// Initialize starts the imagor instance for the first time using registry/config values.
func (p *Provider) Initialize() error {
	cfg, err := p.buildConfig()
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
//   - Secret / algorithm change (common): swaps the dynamic signer only — no imagor restart.
//   - Unsafe ↔ signed mode switch (rare admin op): rebuilds the imagor instance.
//
// Storage changes are handled transparently by StorageLoader and never require a reload.
func (p *Provider) ReloadFromRegistry() error {
	newCfg, err := p.buildConfig()
	if err != nil {
		return fmt.Errorf("failed to build imagor configuration: %w", err)
	}

	oldCfg := p.Config()
	unsafeModeChanged := oldCfg == nil || newCfg.Unsafe != oldCfg.Unsafe

	if unsafeModeChanged {
		// Unsafe ↔ signed mode changes the URL structure (/unsafe/ vs /<hash>/),
		// so we must rebuild the imagor instance.
		if err := p.rebuildApp(newCfg); err != nil {
			return err
		}
		p.logger.Info("Imagor reloaded (mode change)", zap.Bool("unsafe", newCfg.Unsafe))
	} else if !newCfg.Unsafe && p.dynSigner != nil {
		// Common path: only the secret/algorithm changed. Hot-swap the signer.
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

	if cfg.Unsafe {
		options = append(options, imagor.WithUnsafe(true))
		p.dynSigner = nil
	} else {
		ds := &dynamicSigner{}
		ds.update(signerFromConfig(cfg))
		p.dynSigner = ds
		options = append(options, imagor.WithSigner(ds))
	}

	options = append(options, imagor.WithLoaders(&StorageLoader{source: p.storageProvider}))

	app := imagor.New(options...)
	if err := app.Startup(context.Background()); err != nil {
		return fmt.Errorf("failed to start imagor: %w", err)
	}
	p.app.Store(app)
	return nil
}

// rebuildApp shuts down the current imagor instance and creates a new one.
// Used only for the unsafe ↔ signed mode switch.
func (p *Provider) rebuildApp(cfg *ImagorConfig) error {
	if old := p.app.Load(); old != nil {
		if err := old.Shutdown(context.Background()); err != nil {
			p.logger.Error("Error shutting down old imagor instance during rebuild", zap.Error(err))
		}
	}
	return p.createApp(cfg)
}

// buildConfig creates imagor configuration from registry or defaults.
func (p *Provider) buildConfig() (*ImagorConfig, error) {
	return p.buildConfigFromRegistry()
}

// buildConfigFromRegistry fetches registry values and assembles an ImagorConfig.
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

	cfg := &ImagorConfig{}

	if v := resultMap["config.imagor_signer_type"]; v.Exists {
		cfg.SignerType = v.Value
	} else {
		cfg.SignerType = "sha1"
	}

	if v := resultMap["config.imagor_signer_truncate"]; v.Exists {
		if n, err := strconv.Atoi(v.Value); err == nil {
			cfg.SignerTruncate = n
		}
	}

	if v := resultMap["config.imagor_unsafe"]; v.Exists {
		if b, err := strconv.ParseBool(v.Value); err == nil {
			cfg.Unsafe = b
		}
	}

	if v := resultMap["config.imagor_secret"]; v.Exists {
		cfg.Secret = v.Value
	} else if !cfg.Unsafe {
		// Default: use JWT secret with sha256/32 truncation
		cfg.Secret = p.config.JWTSecret
		cfg.SignerType = "sha256"
		cfg.SignerTruncate = 32
	}

	return cfg, nil
}

// getHashAlgorithm returns the hash constructor for the given signer type.
func getHashAlgorithm(signerType string) func() hash.Hash {
	switch strings.ToLower(signerType) {
	case "sha256":
		return sha256.New
	case "sha512":
		return sha512.New
	default:
		return sha1.New
	}
}

// signerFromConfig builds an imagorpath.Signer from config. Returns nil in unsafe mode.
func signerFromConfig(cfg *ImagorConfig) imagorpath.Signer {
	if cfg == nil || cfg.Unsafe {
		return nil
	}
	return imagorpath.NewHMACSigner(getHashAlgorithm(cfg.SignerType), cfg.SignerTruncate, cfg.Secret)
}

// Signer returns the active imagorpath.Signer, or nil when in unsafe mode.
func (p *Provider) Signer() imagorpath.Signer {
	return signerFromConfig(p.Config())
}

// GenerateURL generates a signed (or unsafe) imagor URL for the given image path and params.
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
	if signer == nil {
		return fmt.Sprintf("/%s", imagorpath.GenerateUnsafe(params)), nil
	}
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
