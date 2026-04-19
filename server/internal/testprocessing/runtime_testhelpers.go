package testprocessing

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"

	sharedtools "github.com/cshum/imagor-studio/server"
	"go.uber.org/zap"
)

type TestSpaceConfig struct {
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

func (c *TestSpaceConfig) GetKey() string             { return c.Key }
func (c *TestSpaceConfig) GetPrefix() string          { return c.Prefix }
func (c *TestSpaceConfig) GetBucket() string          { return c.Bucket }
func (c *TestSpaceConfig) GetRegion() string          { return c.Region }
func (c *TestSpaceConfig) GetEndpoint() string        { return c.Endpoint }
func (c *TestSpaceConfig) GetAccessKeyID() string     { return c.AccessKeyID }
func (c *TestSpaceConfig) GetSecretKey() string       { return c.SecretKey }
func (c *TestSpaceConfig) GetUsePathStyle() bool      { return c.UsePathStyle }
func (c *TestSpaceConfig) GetCustomDomain() string    { return c.CustomDomain }
func (c *TestSpaceConfig) IsSuspended() bool          { return c.Suspended }
func (c *TestSpaceConfig) GetSignerAlgorithm() string { return c.SignerAlgorithm }
func (c *TestSpaceConfig) GetSignerTruncate() int     { return c.SignerTruncate }
func (c *TestSpaceConfig) GetImagorSecret() string    { return c.ImagorSecret }

type testSpacesDeltaResponse struct {
	Spaces     []*TestSpaceConfig `json:"spaces"`
	Deleted    []string           `json:"deleted"`
	ServerTime int64              `json:"server_time"`
}

// NewTestSpaceConfigStore constructs a ProcessingSpaceConfigReader seeded from a test HTTP server.
func NewTestSpaceConfigStore(spaces ...*TestSpaceConfig) sharedtools.ProcessingSpaceConfigReader {
	store, _, _, err := sharedtools.DefaultProcessingRuntimeFactory(&sharedtools.ProcessingConfig{
		SpacesEndpoint:    "http://unused",
		InternalAPISecret: "unused",
		SpaceBaseDomain:   "imagor.test",
	}, zap.NewNop())
	if err != nil {
		panic(err)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(testSpacesDeltaResponse{Spaces: spaces, ServerTime: 1_000_000})
	}))
	defer srv.Close()
	store, _, _, err = sharedtools.DefaultProcessingRuntimeFactory(&sharedtools.ProcessingConfig{
		SpacesEndpoint:    srv.URL,
		InternalAPISecret: "",
		SpaceBaseDomain:   "imagor.test",
	}, zap.NewNop())
	if err != nil {
		panic(err)
	}
	_ = store.Start(context.Background())
	return store
}
