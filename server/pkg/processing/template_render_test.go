package processing

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cshum/imagor/imagorpath"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHTTPTemplatePreviewRenderClient_Success(t *testing.T) {
	previewBytes := []byte("preview-bytes")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, InternalTemplatePreviewRenderPath, r.URL.Path)
		assert.Equal(t, "secret", r.Header.Get(InternalAPISecretHeader))

		var req TemplatePreviewRenderRequest
		require.NoError(t, json.NewDecoder(r.Body).Decode(&req))
		assert.Equal(t, "demo", req.SpaceKey)

		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(TemplatePreviewRenderResponse{
			Image:       previewBytes,
			ContentType: "image/webp",
		}))
	}))
	defer server.Close()

	client := NewHTTPTemplatePreviewRenderClient(server.URL, "secret")
	result, err := client.RenderTemplatePreview(context.Background(), TemplatePreviewRenderRequest{
		SpaceKey:        "demo",
		SourceImagePath: "test.jpg",
		PreviewParams: imagorpath.Params{
			Width:  300,
			Height: 225,
		},
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, previewBytes, result.Image)
	assert.Equal(t, "image/webp", result.ContentType)
}

func TestHTTPTemplatePreviewRenderClient_ResolvesBaseURLPerRequest(t *testing.T) {
	client := NewHTTPTemplatePreviewRenderClient("https://{spaceKey}.processing.example.test", "secret")

	baseURL, err := client.resolveBaseURL("demo")
	require.NoError(t, err)
	assert.Equal(t, "https://demo.processing.example.test", baseURL)

	_, err = client.resolveBaseURL("")
	assert.ErrorContains(t, err, "space key is required")
}

func TestHTTPTemplatePreviewRenderClient_Errors(t *testing.T) {
	t.Run("unconfigured client", func(t *testing.T) {
		var client *HTTPTemplatePreviewRenderClient
		_, err := client.RenderTemplatePreview(context.Background(), TemplatePreviewRenderRequest{})
		assert.ErrorContains(t, err, "not configured")
	})

	t.Run("server error status", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusBadGateway)
		}))
		defer server.Close()

		client := NewHTTPTemplatePreviewRenderClient(server.URL, "secret")
		_, err := client.RenderTemplatePreview(context.Background(), TemplatePreviewRenderRequest{SpaceKey: "demo"})
		assert.ErrorContains(t, err, "status 502")
	})

	t.Run("invalid json response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = w.Write([]byte("not-json"))
		}))
		defer server.Close()

		client := NewHTTPTemplatePreviewRenderClient(server.URL, "secret")
		_, err := client.RenderTemplatePreview(context.Background(), TemplatePreviewRenderRequest{SpaceKey: "demo"})
		assert.ErrorContains(t, err, "decode render response")
	})
}

func TestResolveProcessingBaseURL(t *testing.T) {
	assert.Equal(t, "https://processing.example.test/internal", ResolveProcessingBaseURL("https://processing.example.test/internal/", "demo"))
	assert.Equal(t, "https://demo.processing.example.test", ResolveProcessingBaseURL("https://{spaceKey}.processing.example.test", "demo"))
	assert.Equal(t, "https://demo.processing.example.test", ResolveProcessingBaseURL("https://{{spaceKey}}.processing.example.test", "demo"))
	assert.Equal(t, "", ResolveProcessingBaseURL("", "demo"))
}
