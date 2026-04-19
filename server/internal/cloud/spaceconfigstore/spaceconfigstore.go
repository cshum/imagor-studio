package spaceconfigstore

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
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

type Option func(*SpaceConfigStore)

func WithHTTPClient(client *http.Client) Option {
	return func(s *SpaceConfigStore) {
		if client != nil {
			s.httpClient = client
		}
	}
}

func WithSyncInterval(interval time.Duration) Option {
	return func(s *SpaceConfigStore) {
		if interval > 0 {
			s.syncInterval = interval
		}
	}
}

func New(managementURL, apiSecret string, logger *zap.Logger, opts ...Option) *SpaceConfigStore {
	if logger == nil {
		logger = zap.NewNop()
	}
	store := &SpaceConfigStore{
		configs:       make(map[string]*SpaceConfig),
		byDomain:      make(map[string]*SpaceConfig),
		managementURL: strings.TrimRight(managementURL, "/"),
		apiSecret:     apiSecret,
		httpClient:    &http.Client{Timeout: 10 * time.Second},
		syncInterval:  30 * time.Second,
		logger:        logger,
	}
	for _, opt := range opts {
		opt(store)
	}
	return store
}

func (s *SpaceConfigStore) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.configs)
}

func (s *SpaceConfigStore) Get(key string) (cloudruntime.SpaceConfig, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	cfg, ok := s.configs[key]
	return cfg, ok
}

func (s *SpaceConfigStore) GetByHostname(hostname string) (cloudruntime.SpaceConfig, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	cfg, ok := s.byDomain[hostname]
	return cfg, ok
}

func (s *SpaceConfigStore) applyDelta(delta *SpacesDeltaResponse) {
	for _, key := range delta.Deleted {
		if existing, ok := s.configs[key]; ok {
			if existing.CustomDomain != "" {
				delete(s.byDomain, existing.CustomDomain)
			}
			delete(s.configs, key)
		}
	}
	for _, cfg := range delta.Spaces {
		if existing, ok := s.configs[cfg.Key]; ok && existing.CustomDomain != "" && existing.CustomDomain != cfg.CustomDomain {
			delete(s.byDomain, existing.CustomDomain)
		}
		s.configs[cfg.Key] = cfg
		if cfg.CustomDomain != "" {
			s.byDomain[cfg.CustomDomain] = cfg
		}
	}
	if delta.ServerTime > 0 {
		s.lastSync = time.Unix(delta.ServerTime, 0)
	}
}

func (s *SpaceConfigStore) Start(ctx context.Context) error {
	if err := s.syncOnce(ctx); err != nil {
		return err
	}
	go s.loop(ctx)
	return nil
}

func (s *SpaceConfigStore) loop(ctx context.Context) {
	ticker := time.NewTicker(s.syncInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.syncOnce(ctx); err != nil && s.logger != nil {
				s.logger.Warn("space config background sync failed", zap.Error(err))
			}
		}
	}
}

func (s *SpaceConfigStore) syncOnce(ctx context.Context) error {
	delta, err := s.fetchDelta(ctx)
	if err != nil {
		return err
	}
	s.mu.Lock()
	s.applyDelta(delta)
	s.mu.Unlock()
	return nil
}

func (s *SpaceConfigStore) fetchDelta(ctx context.Context) (*SpacesDeltaResponse, error) {
	endpoint, err := url.Parse(s.managementURL + "/spaces/delta")
	if err != nil {
		return nil, fmt.Errorf("build spaces delta url: %w", err)
	}
	s.mu.RLock()
	since := int64(0)
	if !s.lastSync.IsZero() {
		since = s.lastSync.Unix()
	}
	s.mu.RUnlock()
	q := endpoint.Query()
	q.Set("since", fmt.Sprintf("%d", since))
	endpoint.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("create spaces delta request: %w", err)
	}
	if s.apiSecret != "" {
		req.Header.Set("Authorization", "Bearer "+s.apiSecret)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch spaces delta: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch spaces delta: HTTP %d", resp.StatusCode)
	}

	var delta SpacesDeltaResponse
	if err := json.NewDecoder(resp.Body).Decode(&delta); err != nil {
		return nil, fmt.Errorf("decode spaces delta response: %w", err)
	}
	if delta.Deleted == nil {
		delta.Deleted = []string{}
	}
	if delta.Spaces == nil {
		delta.Spaces = []*SpaceConfig{}
	}
	return &delta, nil
}
