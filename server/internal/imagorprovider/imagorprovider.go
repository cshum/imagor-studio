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
	"strings"
	"sync"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/spaceconfigstore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor/imagorpath"
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
// Use this for self-hosted deployments; on processing nodes pass
// spaceloader.New(…) instead.
func NewStorageLoader(p *storageprovider.Provider) imagor.Loader {
	return &StorageLoader{source: p}
}

// Provider manages the imagor app lifecycle.
//
// Self-hosted / management node:
//
//	A single dynSigner is used for all requests. Sync() replaces the inner
//	signer every 30 s so the running imagor instance picks up secret rotations
//	without a restart.
//
// Processing node (SpaceConfigStore set):
//
//	WithGetSigner and WithGetResultKey are used so each request is authenticated
//	against its own space's HMAC secret fetched from SpaceConfigStore. dynSigner
//	is nil and Sync() is a no-op.
type Provider struct {
	logger        *zap.Logger
	registryStore registrystore.Store
	config        *config.Config

	// loader is the single imagor.Loader wired at construction time.
	// Self-hosted: NewStorageLoader(storageProvider)
	// Processing node: spaceloader.New(spaceConfigStore, baseDomain)
	loader imagor.Loader

	// spaceConfigStore, when non-nil, switches the provider into processing-node
	// mode: per-request signer and result-key lookups via WithGetSigner /
	// WithGetResultKey instead of the single dynSigner.
	spaceConfigStore *spaceconfigstore.SpaceConfigStore
	baseDomain       string // e.g. "imagor.app" (no leading dot)

	// app is the running *imagor.Imagor instance. Set during Initialize().
	app *imagor.Imagor

	// dynSigner is passed to imagor at startup; its inner signer is replaced by
	// Sync() so imagor verifies requests with the current secret without restart.
	// Nil in processing-node mode.
	dynSigner *dynamicSigner

	// mu protects cfg.
	mu sync.RWMutex

	// cfg is the current imagor signing configuration. Written in Initialize()
	// and updated by Sync(). Protected by mu.
	cfg *ImagorConfig
}

// ProviderOption configures a Provider at construction time.
type ProviderOption func(*Provider)

// WithSpaceConfigStore switches the provider into processing-node mode.
// Per-request signing and result-key namespacing are driven by SpaceConfigStore
// lookups instead of a single registry-backed secret.
//
//   - store: the SpaceConfigStore populated by delta sync
//   - baseDomain: the platform CDN domain (e.g. "imagor.app"); requests whose
//     Host ends with "."+baseDomain are resolved by stripping the suffix to get
//     the space key. Custom domains are looked up via GetByHostname.
func WithSpaceConfigStore(store *spaceconfigstore.SpaceConfigStore, baseDomain string) ProviderOption {
	return func(p *Provider) {
		p.spaceConfigStore = store
		p.baseDomain = baseDomain
	}
}

// New creates a new imagor provider.
//
// loader is the single imagor.Loader to register: use NewStorageLoader for
// self-hosted deployments and spaceloader.New for processing nodes.
// Passing nil is valid when only URL signing/generation is needed.
//
// opts may include WithSpaceConfigStore to enable processing-node mode.
func New(logger *zap.Logger, registryStore registrystore.Store, cfg *config.Config, loader imagor.Loader, opts ...ProviderOption) *Provider {
	p := &Provider{
		logger:        logger,
		registryStore: registryStore,
		config:        cfg,
		loader:        loader,
	}
	for _, o := range opts {
		o(p)
	}
	return p
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

// createApp builds a new *imagor.Imagor, wires up processors and the signer,
// and stores it in p.app.
func (p *Provider) createApp(cfg *ImagorConfig) error {
	// Processor options — compiled in only when the vips build tag is set.
	options := buildProcessors(p.logger)

	if p.spaceConfigStore != nil {
		// ── Processing-node mode ─────────────────────────────────────────────
		// Signer and result-key are resolved per-request from SpaceConfigStore so
		// each space's HMAC secret is used independently.
		store := p.spaceConfigStore
		baseDomain := p.baseDomain

		options = append(options, imagor.WithGetSigner(func(r *http.Request) imagorpath.Signer {
			sc := resolveSpaceFromHost(store, r.Host, baseDomain)
			if sc == nil || sc.Suspended {
				return nil // imagor returns ErrSignatureMismatch
			}
			return signerFromSpaceConfig(sc)
		}))

		options = append(options, imagor.WithGetResultKey(func(r *http.Request, params imagorpath.Params) string {
			sc := resolveSpaceFromHost(store, r.Host, baseDomain)
			if sc == nil {
				return ""
			}
			// Namespace result cache by space key to prevent cross-space collisions.
			// Generate the canonical (unsigned) path as the cache key suffix.
			return sc.Key + "/" + imagorpath.Generate(params, nil)
		}))
	} else {
		// ── Self-hosted / management-node mode ───────────────────────────────
		// A single dynSigner is used; Sync() replaces the inner signer on every
		// 30-second tick so secret rotations take effect without a restart.
		ds := &dynamicSigner{}
		ds.update(signerFromConfig(cfg))
		p.dynSigner = ds
		options = append(options, imagor.WithSigner(p.dynSigner))
	}

	// Wire the single loader chosen by bootstrap:
	//   - self-hosted: NewStorageLoader(storageProvider)
	//   - processing node: spaceloader.New(spaceConfigStore, baseDomain)
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
// Returns nil in processing-node mode (no single-signer concept there).
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
//
// In processing-node mode (spaceConfigStore != nil) this is a no-op: SpaceConfigStore
// manages its own sync loop and per-request lookups are always fresh.
func (p *Provider) Sync() error {
	if p.spaceConfigStore != nil {
		return nil // SpaceConfigStore has its own 30-second delta sync loop
	}

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

// ── Processing-node helpers ──────────────────────────────────────────────────

// resolveSpaceFromHost maps a Host header to the corresponding SpaceConfig.
// Subdomain routing: "acme.imagor.app" → strip ".imagor.app" → space key "acme".
// Custom domain routing: "images.acme.com" → GetByHostname lookup.
func resolveSpaceFromHost(store *spaceconfigstore.SpaceConfigStore, host, baseDomain string) *spaceconfigstore.SpaceConfig {
	if baseDomain != "" && strings.HasSuffix(host, "."+baseDomain) {
		spaceKey := strings.TrimSuffix(host, "."+baseDomain)
		sc, _ := store.Get(spaceKey)
		return sc
	}
	sc, _ := store.GetByHostname(host)
	return sc
}

// signerFromSpaceConfig builds an HMAC signer from a space's own secret and
// algorithm settings. Returns nil if the space has no secret configured
// (imagor will treat the request as unsigned — rejected in production).
func signerFromSpaceConfig(sc *spaceconfigstore.SpaceConfig) imagorpath.Signer {
	if sc.ImagorSecret == "" {
		return nil
	}
	return imagorpath.NewHMACSigner(spaceHashFunc(sc.SignerAlgorithm), sc.SignerTruncate, sc.ImagorSecret)
}

// spaceHashFunc returns the hash constructor for the given algorithm name.
// Defaults to SHA-256 for unrecognised values.
func spaceHashFunc(algorithm string) func() hash.Hash {
	switch algorithm {
	case "sha1":
		return sha1.New
	case "sha512":
		return sha512.New
	default: // "sha256" and anything else
		return sha256.New
	}
}
