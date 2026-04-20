package processingruntime

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/pkg/processing"
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

func newSpaceConfigStore(managementURL, apiSecret string, logger *zap.Logger) *SpaceConfigStore {
	return &SpaceConfigStore{
		configs:       make(map[string]*SpaceConfig),
		byDomain:      make(map[string]*SpaceConfig),
		managementURL: managementURL,
		apiSecret:     apiSecret,
		httpClient:    &http.Client{Timeout: 10 * time.Second},
		syncInterval:  30 * time.Second,
		logger:        logger,
	}
}

func (s *SpaceConfigStore) Start(ctx context.Context) error {
	return nil
}

func (s *SpaceConfigStore) Get(key string) (processing.SpaceConfig, bool) {
	s.mu.RLock()
	cfg, ok := s.configs[key]
	s.mu.RUnlock()
	return cfg, ok
}

func (s *SpaceConfigStore) GetByHostname(hostname string) (processing.SpaceConfig, bool) {
	s.mu.RLock()
	cfg, ok := s.byDomain[hostname]
	s.mu.RUnlock()
	return cfg, ok
}

type SpaceS3Loader struct {
	store      processing.SpaceConfigReader
	baseDomain string
}

func newSpaceS3Loader(store processing.SpaceConfigReader, baseDomain string) *SpaceS3Loader {
	return &SpaceS3Loader{store: store, baseDomain: baseDomain}
}

func (l *SpaceS3Loader) Get(r *http.Request, image string) (*imagor.Blob, error) {
	cfg, err := l.resolveSpace(r.Host)
	if err != nil {
		return nil, err
	}
	if cfg.IsSuspended() {
		return nil, fmt.Errorf("space %q is suspended", cfg.GetKey())
	}
	objectKey := cfg.GetPrefix() + image
	blob := imagor.NewBlob(func() (io.ReadCloser, int64, error) {
		client, err := buildS3Client(r.Context(), cfg)
		if err != nil {
			return nil, -1, fmt.Errorf("build S3 client for space %q: %w", cfg.GetKey(), err)
		}
		result, err := client.GetObject(r.Context(), &s3.GetObjectInput{Bucket: aws.String(cfg.GetBucket()), Key: aws.String(objectKey)})
		if err != nil {
			return nil, -1, err
		}
		return result.Body, aws.ToInt64(result.ContentLength), nil
	})
	return blob, blob.Err()
}

func (l *SpaceS3Loader) resolveSpace(host string) (processing.SpaceConfig, error) {
	if strings.HasSuffix(host, l.baseDomain) {
		spaceKey := strings.TrimSuffix(host, l.baseDomain)
		cfg, ok := l.store.Get(spaceKey)
		if !ok {
			return nil, fmt.Errorf("space not found: %q", spaceKey)
		}
		return cfg, nil
	}
	cfg, ok := l.store.GetByHostname(host)
	if !ok {
		return nil, fmt.Errorf("no space found for domain %q", host)
	}
	return cfg, nil
}

func buildS3Client(ctx context.Context, cfg processing.SpaceConfig) (*s3.Client, error) {
	var loadOpts []func(*awsconfig.LoadOptions) error
	if cfg.GetRegion() != "" {
		loadOpts = append(loadOpts, awsconfig.WithRegion(cfg.GetRegion()))
	}
	if cfg.GetAccessKeyID() != "" && cfg.GetSecretKey() != "" {
		loadOpts = append(loadOpts, awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.GetAccessKeyID(), cfg.GetSecretKey(), "")))
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, loadOpts...)
	if err != nil {
		return nil, err
	}
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.GetEndpoint() != "" {
			o.BaseEndpoint = aws.String(cfg.GetEndpoint())
		}
		o.UsePathStyle = cfg.GetUsePathStyle()
	})
	return client, nil
}

func DefaultProcessingRuntimeFactory(cfg *config.Config, logger *zap.Logger) (processing.SpaceConfigReader, imagor.Loader, error) {
	spaceConfigStore := newSpaceConfigStore(
		cfg.SpacesEndpoint,
		cfg.InternalAPISecret,
		logger,
	)
	loader := newSpaceS3Loader(spaceConfigStore, cfg.SpaceBaseDomain)
	return spaceConfigStore, loader, nil
}
