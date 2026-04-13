package imagorprovider

import (
	"context"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"hash"
	"strconv"
	"strings"
	"sync"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor/imagorpath"
)

// ImagorConfig holds imagor signing configuration.
type ImagorConfig struct {
	Secret         string // Secret key for HMAC URL signing
	SignerType     string // Hash algorithm: "sha1", "sha256", "sha512"
	SignerTruncate int    // Signature truncation length (0 = no truncation)
}

// dynamicSigner wraps an imagorpath.Signer behind an RWMutex so the active
// HMAC key can be hot-swapped via update() without restarting the imagor
// instance. This is the common ReloadFromRegistry path (secret rotation).
type dynamicSigner struct {
	mu    sync.RWMutex
	inner imagorpath.Signer
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

// update atomically replaces the inner signer.
func (d *dynamicSigner) update(s imagorpath.Signer) {
	d.mu.Lock()
	d.inner = s
	d.mu.Unlock()
}

// getHashAlgorithm returns the hash constructor for the given signer type string.
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

// signerFromConfig builds an imagorpath.Signer from the given ImagorConfig.
// Returns nil when cfg is nil.
func signerFromConfig(cfg *ImagorConfig) imagorpath.Signer {
	if cfg == nil {
		return nil
	}
	return imagorpath.NewHMACSigner(
		getHashAlgorithm(cfg.SignerType),
		cfg.SignerTruncate,
		cfg.Secret,
	)
}

// buildConfigFromRegistry reads imagor-related keys from the registry (falling
// back to CLI config / defaults) and assembles an ImagorConfig.
func buildConfigFromRegistry(registryStore registrystore.Store, cfg *config.Config) (*ImagorConfig, error) {
	ctx := context.Background()

	results := registryutil.GetEffectiveValues(ctx, registryStore, cfg,
		"config.imagor_secret",
		"config.imagor_signer_type",
		"config.imagor_signer_truncate",
	)

	resultMap := make(map[string]registryutil.EffectiveValueResult, len(results))
	for _, r := range results {
		resultMap[r.Key] = r
	}

	out := &ImagorConfig{}

	if v := resultMap["config.imagor_signer_type"]; v.Exists {
		out.SignerType = v.Value
	} else {
		out.SignerType = "sha1"
	}

	if v := resultMap["config.imagor_signer_truncate"]; v.Exists {
		if n, err := strconv.Atoi(v.Value); err == nil {
			out.SignerTruncate = n
		}
	}

	if v := resultMap["config.imagor_secret"]; v.Exists {
		out.Secret = v.Value
	} else {
		// Default: derive signing key from the JWT secret (sha256, truncated to 32 chars).
		out.Secret = cfg.JWTSecret
		out.SignerType = "sha256"
		out.SignerTruncate = 32
	}

	return out, nil
}
