// Package spaceconfigstore maintains an in-process snapshot of all space
// configurations for the processing service.
package spaceconfigstore

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/cshum/imagor-studio/server/internal/cloudruntime"
	"go.uber.org/zap"
)

type SpaceConfig struct {
	OrgID           string `json:"org_id"`
	Key             string `json:"key"`
	Bucket          string `json:"bucket"`
	Prefix          string `json:"prefix"`
	Region          string `json:"region"`
	Endpoint        string `json:"endpoint"`
	AccessKeyID     string `json:"access_key_id"`
	SecretKey       string `json:"secret_key"`
	UsePathStyle    bool   `json:"use_path_style"`
	CustomDomain    string `json:"custom_domain"`
	Suspended       bool   `json:"suspended"`
	SignerAlgorithm string `json:"signer_algorithm"`
	SignerTruncate  int    `json:"signer_truncate"`
	ImagorSecret    string `json:"imagor_secret"`
}

func (c *SpaceConfig) GetKey() string             { return c.Key }
func (c *SpaceConfig) GetPrefix() string          { return c.Prefix }
func (c *SpaceConfig) GetBucket() string          { return c.Bucket }
func (c *SpaceConfig) GetRegion() string          { return c.Region }
func (c *SpaceConfig) GetEndpoint() string        { return c.Endpoint }
func (c *SpaceConfig) GetAccessKeyID() string     { return c.AccessKeyID }
func (c *SpaceConfig) GetSecretKey() string       { return c.SecretKey }
func (c *SpaceConfig) GetUsePathStyle() bool      { return c.UsePathStyle }
func (c *SpaceConfig) GetCustomDomain() string    { return c.CustomDomain }
func (c *SpaceConfig) IsSuspended() bool          { return c.Suspended }
func (c *SpaceConfig) GetSignerAlgorithm() string { return c.SignerAlgorithm }
func (c *SpaceConfig) GetSignerTruncate() int     { return c.SignerTruncate }
func (c *SpaceConfig) GetImagorSecret() string    { return c.ImagorSecret }

type SpacesDeltaResponse struct {
	Spaces     []*SpaceConfig `json:"spaces"`
	Deleted    []string       `json:"deleted"`
	ServerTime int64          `json:"server_time"`
}

type SpaceConfigStore struct {
	mu       sync.RWMutex
	configs  map[string]*SpaceConfig
	byDomain map[string]*SpaceConfig

	managementURL string
	apiSecret     string
	lastSync      time.Time
	httpClient    *http.Client
	syncInterval  time.Duration
	logger        *zap.Logger
}

var _ cloudruntime.SpaceConfigReader = (*SpaceConfigStore)(nil)

type Option func(*SpaceConfigStore)

func WithHTTPClient(c *http.Client) Option { return func(s *SpaceConfigStore) { s.httpClient = c } }
func WithSyncInterval(d time.Duration) Option {
	return func(s *SpaceConfigStore) { s.syncInterval = d }
}

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

func (s *SpaceConfigStore) Start(ctx context.Context) error {
	if err := s.deltaSync(ctx); err != nil {
		return fmt.Errorf("initial space config sync failed: %w", err)
	}
	go func() {
		ticker := time.NewTicker(s.syncInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := s.deltaSync(ctx); err != nil {
					s.logger.Warn("SpaceConfigStore: delta sync failed, serving from snapshot", zap.Error(err))
				}
			case <-ctx.Done():
				return
			}
		}
	}()
	return nil
}

func (s *SpaceConfigStore) Get(key string) (cloudruntime.SpaceConfig, bool) {
	s.mu.RLock()
	cfg, ok := s.configs[key]
	s.mu.RUnlock()
	return cfg, ok
}

func (s *SpaceConfigStore) GetByHostname(hostname string) (cloudruntime.SpaceConfig, bool) {
	s.mu.RLock()
	cfg, ok := s.byDomain[hostname]
	s.mu.RUnlock()
	return cfg, ok
}

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
	defer s.mu.Unlock()
	for _, space := range delta.Spaces {
		if prev, ok := s.configs[space.Key]; ok && prev.CustomDomain != "" && prev.CustomDomain != space.CustomDomain {
			delete(s.byDomain, prev.CustomDomain)
		}
		s.configs[space.Key] = space
		if space.CustomDomain != "" {
			s.byDomain[space.CustomDomain] = space
		}
	}
	for _, key := range delta.Deleted {
		if cfg, ok := s.configs[key]; ok {
			if cfg.CustomDomain != "" {
				delete(s.byDomain, cfg.CustomDomain)
			}
			delete(s.configs, key)
		}
	}
	if delta.ServerTime > 0 {
		s.lastSync = time.Unix(delta.ServerTime, 0)
	}
	return nil
}
