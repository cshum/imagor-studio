// Package spaceconfigstore maintains an in-process snapshot of all space
// configurations for the SaaS processing service.
//
// On startup, Start() performs a full sync (since=0) from the management
// service's /internal/spaces/delta endpoint, blocking until complete.
// A background goroutine then polls every 30 seconds for incremental deltas,
// keeping the snapshot current within 30 seconds of any change.
//
// All lookups (Get / GetByHostname) are ~0ns in-process map reads under
// an RWMutex — no network, no Redis, no cache eviction complexity.
//
// If the management service becomes temporarily unreachable, the store
// continues serving from its last-known-good snapshot indefinitely.
package spaceconfigstore

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"go.uber.org/zap"
)

// SpaceConfig holds all per-space configuration the processing service needs.
// It is populated via delta sync from the management service and consumed by
// SpaceS3Loader (to fetch images) and by the WithGetSigner / WithGetResultKey
// hooks wired into the imagor instance.
type SpaceConfig struct {
	Key             string `json:"key"`
	Bucket          string `json:"bucket"`
	Prefix          string `json:"prefix"` // "spaceKey/" managed tier, "" or "sub/" BYOB
	Region          string `json:"region"`
	Endpoint        string `json:"endpoint"` // blank = AWS; set for R2, MinIO, etc.
	AccessKeyID     string `json:"access_key_id"`
	SecretKey       string `json:"secret_key"`
	UsePathStyle    bool   `json:"use_path_style"`
	CustomDomain    string `json:"custom_domain"` // "" = no custom domain
	Suspended       bool   `json:"suspended"`
	SignerAlgorithm string `json:"signer_algorithm"` // "sha1", "sha256", "sha512"
	SignerTruncate  int    `json:"signer_truncate"`
	ImagorSecret    string `json:"imagor_secret"`
}

// SpacesDeltaResponse is the JSON response from GET /internal/spaces/delta.
type SpacesDeltaResponse struct {
	Spaces     []*SpaceConfig `json:"spaces"`
	Deleted    []string       `json:"deleted"`
	ServerTime int64          `json:"server_time"` // unix seconds; used as next `since`
}

// SpaceConfigStore holds an in-process snapshot of all space configurations.
// It is safe for concurrent use. The zero value is not usable; create with New.
type SpaceConfigStore struct {
	mu       sync.RWMutex
	configs  map[string]*SpaceConfig // keyed by space Key
	byDomain map[string]*SpaceConfig // keyed by CustomDomain hostname

	managementURL string
	apiSecret     string
	lastSync      time.Time
	httpClient    *http.Client
	syncInterval  time.Duration
	logger        *zap.Logger
}

// Option configures a SpaceConfigStore.
type Option func(*SpaceConfigStore)

// WithHTTPClient overrides the HTTP client used for delta sync requests.
// Useful in tests to inject a client pointed at a test server.
func WithHTTPClient(c *http.Client) Option {
	return func(s *SpaceConfigStore) { s.httpClient = c }
}

// WithSyncInterval overrides the background delta sync interval (default 30s).
func WithSyncInterval(d time.Duration) Option {
	return func(s *SpaceConfigStore) { s.syncInterval = d }
}

// New creates a SpaceConfigStore that will sync from managementURL using
// apiSecret as the Bearer token.  Call Start to perform the initial full sync
// and begin background polling.
func New(managementURL, apiSecret string, logger *zap.Logger, opts ...Option) *SpaceConfigStore {
	s := &SpaceConfigStore{
		configs:       make(map[string]*SpaceConfig),
		byDomain:      make(map[string]*SpaceConfig),
		managementURL: managementURL,
		apiSecret:     apiSecret,
		httpClient:    &http.Client{Timeout: 10 * time.Second},
		syncInterval:  30 * time.Second,
		logger:        logger,
	}
	for _, o := range opts {
		o(s)
	}
	return s
}

// Start performs a full initial sync (blocking) then launches a background
// goroutine that polls for incremental deltas every syncInterval.
// It returns an error only if the initial sync fails.
func (s *SpaceConfigStore) Start(ctx context.Context) error {
	s.logger.Info("SpaceConfigStore: performing initial full sync")
	if err := s.deltaSync(ctx); err != nil {
		return fmt.Errorf("initial space config sync failed: %w", err)
	}
	s.logger.Info("SpaceConfigStore: initial sync complete",
		zap.Int("spaces", s.Len()),
	)

	go func() {
		ticker := time.NewTicker(s.syncInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := s.deltaSync(ctx); err != nil {
					// Management service down: keep serving from snapshot
					s.logger.Warn("SpaceConfigStore: delta sync failed, serving from snapshot",
						zap.Error(err),
					)
				}
			case <-ctx.Done():
				return
			}
		}
	}()
	return nil
}

// Get returns the SpaceConfig for the given space key, or false if not found.
func (s *SpaceConfigStore) Get(key string) (*SpaceConfig, bool) {
	s.mu.RLock()
	cfg, ok := s.configs[key]
	s.mu.RUnlock()
	return cfg, ok
}

// GetByHostname returns the SpaceConfig whose CustomDomain matches hostname,
// or false if no space has that custom domain registered.
func (s *SpaceConfigStore) GetByHostname(hostname string) (*SpaceConfig, bool) {
	s.mu.RLock()
	cfg, ok := s.byDomain[hostname]
	s.mu.RUnlock()
	return cfg, ok
}

// Len returns the total number of spaces currently in the snapshot.
// Primarily useful for logging and tests.
func (s *SpaceConfigStore) Len() int {
	s.mu.RLock()
	n := len(s.configs)
	s.mu.RUnlock()
	return n
}

// deltaSync fetches the delta from the management service and applies it.
// When lastSync is zero the since param is 0, causing a full sync.
func (s *SpaceConfigStore) deltaSync(ctx context.Context) error {
	s.mu.RLock()
	sinceUnix := s.lastSync.Unix()
	if s.lastSync.IsZero() {
		sinceUnix = 0
	}
	s.mu.RUnlock()

	url := fmt.Sprintf("%s/internal/spaces/delta?since=%d", s.managementURL, sinceUnix)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("build delta request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiSecret)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("delta request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("delta endpoint returned HTTP %d", resp.StatusCode)
	}

	var delta SpacesDeltaResponse
	if err := json.NewDecoder(resp.Body).Decode(&delta); err != nil {
		return fmt.Errorf("decode delta response: %w", err)
	}

	s.mu.Lock()
	s.applyDelta(&delta)
	s.mu.Unlock()

	return nil
}

// applyDelta merges a delta response into the store.
// Caller must hold s.mu for writing.
func (s *SpaceConfigStore) applyDelta(delta *SpacesDeltaResponse) {
	// Upsert updated/new spaces
	for _, space := range delta.Spaces {
		// If the space previously had a different custom domain, remove it
		if prev, ok := s.configs[space.Key]; ok && prev.CustomDomain != "" && prev.CustomDomain != space.CustomDomain {
			delete(s.byDomain, prev.CustomDomain)
		}
		s.configs[space.Key] = space
		if space.CustomDomain != "" {
			s.byDomain[space.CustomDomain] = space
		}
	}

	// Remove deleted spaces
	for _, key := range delta.Deleted {
		if cfg, ok := s.configs[key]; ok {
			if cfg.CustomDomain != "" {
				delete(s.byDomain, cfg.CustomDomain)
			}
			delete(s.configs, key)
		}
	}

	// Advance the sync cursor so the next poll only fetches changes after now
	if delta.ServerTime > 0 {
		s.lastSync = time.Unix(delta.ServerTime, 0)
	}
}
