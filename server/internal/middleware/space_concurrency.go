// Package middleware provides HTTP middleware for the imagor-studio server.
package middleware

import (
	"net/http"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/cshum/imagor-studio/server/internal/spaceconfigstore"
)

// SpaceConcurrencyMiddleware enforces a per-space maximum concurrent request
// limit before requests reach the imagor handler.
//
// This prevents a single noisy tenant from monopolising the shared libvips
// CPU and memory pool on a processing machine. Each space gets its own
// atomic counter; allocation happens on first use and the map never shrinks
// (entries are bounded by the number of active spaces in SpaceConfigStore).
//
// Unknown hosts (not in SpaceConfigStore) are passed through — the imagor
// WithGetSigner hook will reject them with ErrSignatureMismatch.
//
// Parameters:
//   - store: SpaceConfigStore used to resolve space key from Host header
//   - baseDomain: platform domain suffix, e.g. "imagor.app" (no leading dot)
//   - maxPerSpace: maximum concurrent requests allowed per space (0 = disabled)
func SpaceConcurrencyMiddleware(store *spaceconfigstore.SpaceConfigStore, baseDomain string, maxPerSpace int64) func(http.Handler) http.Handler {
	if maxPerSpace <= 0 {
		// Disabled — return identity middleware.
		return func(next http.Handler) http.Handler { return next }
	}

	var counters sync.Map // map[spaceKey → *atomic.Int64]

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			spaceKey := resolveSpaceKey(store, r.Host, baseDomain)
			if spaceKey == "" {
				// Unknown space — let imagor reject it via WithGetSigner.
				next.ServeHTTP(w, r)
				return
			}

			val, _ := counters.LoadOrStore(spaceKey, new(atomic.Int64))
			counter := val.(*atomic.Int64)

			if counter.Add(1) > maxPerSpace {
				counter.Add(-1)
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"message":"too many requests for this space"}`, http.StatusTooManyRequests)
				return
			}
			defer counter.Add(-1)

			next.ServeHTTP(w, r)
		})
	}
}

// resolveSpaceKey maps a Host header value to a space key using the same
// logic as imagorprovider.resolveSpaceFromHost, without importing that package.
//
//   - "acme.imagor.app" with baseDomain "imagor.app" → "acme"
//   - "images.acme.com" (custom domain) → looked up in SpaceConfigStore
func resolveSpaceKey(store *spaceconfigstore.SpaceConfigStore, host, baseDomain string) string {
	if baseDomain != "" && strings.HasSuffix(host, "."+baseDomain) {
		return strings.TrimSuffix(host, "."+baseDomain)
	}
	if cfg, ok := store.GetByHostname(host); ok {
		return cfg.Key
	}
	return ""
}
