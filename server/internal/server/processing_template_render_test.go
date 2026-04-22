package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/cshum/imagor/imagorpath"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

type processingTestSpaceConfig struct {
	key             string
	customDomain    string
	signerAlgorithm string
	signerTruncate  int
	imagorSecret    string
}

func (c *processingTestSpaceConfig) GetKey() string             { return c.key }
func (c *processingTestSpaceConfig) GetPrefix() string          { return "" }
func (c *processingTestSpaceConfig) GetBucket() string          { return "" }
func (c *processingTestSpaceConfig) GetRegion() string          { return "" }
func (c *processingTestSpaceConfig) GetEndpoint() string        { return "" }
func (c *processingTestSpaceConfig) GetAccessKeyID() string     { return "" }
func (c *processingTestSpaceConfig) GetSecretKey() string       { return "" }
func (c *processingTestSpaceConfig) GetUsePathStyle() bool      { return false }
func (c *processingTestSpaceConfig) GetCustomDomain() string    { return c.customDomain }
func (c *processingTestSpaceConfig) IsSuspended() bool          { return false }
func (c *processingTestSpaceConfig) GetSignerAlgorithm() string { return c.signerAlgorithm }
func (c *processingTestSpaceConfig) GetSignerTruncate() int     { return c.signerTruncate }
func (c *processingTestSpaceConfig) GetImagorSecret() string    { return c.imagorSecret }

type processingTestSpaceConfigReader struct {
	spaces map[string]sharedprocessing.SpaceConfig
}

func (r processingTestSpaceConfigReader) Get(key string) (sharedprocessing.SpaceConfig, bool) {
	sc, ok := r.spaces[key]
	return sc, ok
}

func (r processingTestSpaceConfigReader) GetByHostname(hostname string) (sharedprocessing.SpaceConfig, bool) {
	for _, sc := range r.spaces {
		if sc.GetCustomDomain() == hostname {
			return sc, true
		}
	}
	return nil, false
}

func (r processingTestSpaceConfigReader) Start(_ context.Context) error { return nil }

func TestProcessingTemplatePreviewRenderHandler_Unauthorized(t *testing.T) {
	handler := newProcessingTemplatePreviewRenderHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}), processingTestSpaceConfigReader{}, "imagor.test", "secret", zap.NewNop())

	req := httptest.NewRequest(http.MethodPost, sharedprocessing.InternalTemplatePreviewRenderPath, nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestProcessingTemplatePreviewRenderHandler_Success(t *testing.T) {
	spaceConfig := &processingTestSpaceConfig{key: "demo", signerAlgorithm: "sha256", signerTruncate: 32, imagorSecret: "secret"}
	store := processingTestSpaceConfigReader{spaces: map[string]sharedprocessing.SpaceConfig{"demo": spaceConfig}}

	var gotHost string
	var gotPath string
	handler := newProcessingTemplatePreviewRenderHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotHost = r.Host
		gotPath = r.URL.Path
		w.Header().Set("Content-Type", "image/webp")
		_, _ = w.Write([]byte("preview-bytes"))
	}), store, "imagor.test", "secret", zap.NewNop())

	body, _ := json.Marshal(sharedprocessing.TemplatePreviewRenderRequest{
		SpaceKey:        "demo",
		SourceImagePath: "test.jpg",
		PreviewParams: imagorpath.Params{
			Width:  300,
			Height: 225,
			Filters: imagorpath.Filters{
				{Name: "quality", Args: "80"},
				{Name: "format", Args: "webp"},
			},
		},
	})
	req := httptest.NewRequest(http.MethodPost, sharedprocessing.InternalTemplatePreviewRenderPath, strings.NewReader(string(body)))
	req.Header.Set(sharedprocessing.InternalAPISecretHeader, "secret")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "demo.imagor.test", gotHost)
	assert.NotEmpty(t, gotPath)
	var resp sharedprocessing.TemplatePreviewRenderResponse
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&resp))
	assert.Equal(t, []byte("preview-bytes"), resp.Image)
	assert.Equal(t, "image/webp", resp.ContentType)
}

func TestProcessingRenderHost(t *testing.T) {
	host, err := processingRenderHost("demo", &processingTestSpaceConfig{key: "demo", customDomain: "images.demo.test"}, "imagor.test")
	assert.NoError(t, err)
	assert.Equal(t, "demo.imagor.test", host)

	host, err = processingRenderHost("demo", &processingTestSpaceConfig{key: "demo", customDomain: "images.demo.test"}, "")
	assert.NoError(t, err)
	assert.Equal(t, "images.demo.test", host)
}
