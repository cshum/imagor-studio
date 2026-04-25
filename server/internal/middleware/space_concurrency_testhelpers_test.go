package middleware_test

import (
	"context"

	"github.com/cshum/imagor-studio/server/pkg/processing"
)

type testSpaceConfig struct {
	OrgID        string
	Key          string
	CustomDomain string
	Suspended    bool
	Prefix       string
	Bucket       string
	Region       string
	Endpoint     string
	AccessKeyID  string
	SecretKey    string
	UsePathStyle bool
	SignerAlg    string
	SignerTrim   int
	ImagorSecret string
}

func (c *testSpaceConfig) GetOrgID() string           { return c.OrgID }
func (c *testSpaceConfig) GetKey() string             { return c.Key }
func (c *testSpaceConfig) GetPrefix() string          { return c.Prefix }
func (c *testSpaceConfig) GetBucket() string          { return c.Bucket }
func (c *testSpaceConfig) GetRegion() string          { return c.Region }
func (c *testSpaceConfig) GetEndpoint() string        { return c.Endpoint }
func (c *testSpaceConfig) GetAccessKeyID() string     { return c.AccessKeyID }
func (c *testSpaceConfig) GetSecretKey() string       { return c.SecretKey }
func (c *testSpaceConfig) GetUsePathStyle() bool      { return c.UsePathStyle }
func (c *testSpaceConfig) GetCustomDomain() string    { return c.CustomDomain }
func (c *testSpaceConfig) IsSuspended() bool          { return c.Suspended }
func (c *testSpaceConfig) GetSignerAlgorithm() string { return c.SignerAlg }
func (c *testSpaceConfig) GetSignerTruncate() int     { return c.SignerTrim }
func (c *testSpaceConfig) GetImagorSecret() string    { return c.ImagorSecret }
func (c *testSpaceConfig) GetImagorCORSOrigins() []string {
	return nil
}

type testSpaceConfigStore struct {
	byKey      map[string]processing.SpaceConfig
	byHostname map[string]processing.SpaceConfig
}

func newTestSpaceConfigStore(spaces ...*testSpaceConfig) processing.SpaceConfigReader {
	store := &testSpaceConfigStore{
		byKey:      make(map[string]processing.SpaceConfig, len(spaces)),
		byHostname: make(map[string]processing.SpaceConfig, len(spaces)),
	}
	for _, space := range spaces {
		store.byKey[space.Key] = space
		if space.CustomDomain != "" {
			store.byHostname[space.CustomDomain] = space
		}
	}
	return store
}

func (s *testSpaceConfigStore) Get(key string) (processing.SpaceConfig, bool) {
	cfg, ok := s.byKey[key]
	return cfg, ok
}

func (s *testSpaceConfigStore) GetByHostname(hostname string) (processing.SpaceConfig, bool) {
	cfg, ok := s.byHostname[hostname]
	return cfg, ok
}

func (s *testSpaceConfigStore) Start(context.Context) error {
	return nil
}

func (s *testSpaceConfigStore) Ready() bool {
	return true
}
