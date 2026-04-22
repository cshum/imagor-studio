package processing

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/cshum/imagor/imagorpath"
)

const (
	// InternalTemplatePreviewRenderPath is the private processing endpoint path
	// management calls for synchronous template preview renders.
	InternalTemplatePreviewRenderPath = "/internal/template-renders/preview"

	// InternalAPISecretHeader carries the shared secret for internal management
	// to processing requests.
	InternalAPISecretHeader = "X-Internal-API-Secret"
)

// TemplatePreviewRenderRequest describes the synchronous preview render input
// management can send to a processing node.
type TemplatePreviewRenderRequest struct {
	SpaceKey        string
	SourceImagePath string
	TemplateJSON    string
	PreviewParams   imagorpath.Params
}

// TemplatePreviewRenderResponse carries the rendered preview image bytes.
type TemplatePreviewRenderResponse struct {
	Image       []byte
	ContentType string
}

// TemplatePreviewRenderClient is implemented by management-side clients that
// call a private processing endpoint for synchronous template preview renders.
type TemplatePreviewRenderClient interface {
	RenderTemplatePreview(ctx context.Context, req TemplatePreviewRenderRequest) (*TemplatePreviewRenderResponse, error)
}

type HTTPTemplatePreviewRenderClient struct {
	baseURLTemplate   string
	internalAPISecret string
	httpClient        *http.Client
}

func NewHTTPTemplatePreviewRenderClient(baseURL, internalAPISecret string) *HTTPTemplatePreviewRenderClient {
	trimmed := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if trimmed == "" {
		return nil
	}

	return &HTTPTemplatePreviewRenderClient{
		baseURLTemplate:   trimmed,
		internalAPISecret: internalAPISecret,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *HTTPTemplatePreviewRenderClient) RenderTemplatePreview(ctx context.Context, req TemplatePreviewRenderRequest) (*TemplatePreviewRenderResponse, error) {
	if c == nil || c.baseURLTemplate == "" {
		return nil, fmt.Errorf("template preview render client is not configured")
	}
	baseURL, err := c.resolveBaseURL(req.SpaceKey)
	if err != nil {
		return nil, err
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal render request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+InternalTemplatePreviewRenderPath, strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("create render request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if c.internalAPISecret != "" {
		httpReq.Header.Set(InternalAPISecretHeader, c.internalAPISecret)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call processing render endpoint: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("processing render endpoint returned status %d", resp.StatusCode)
	}

	var result TemplatePreviewRenderResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode render response: %w", err)
	}

	return &result, nil
}

func (c *HTTPTemplatePreviewRenderClient) resolveBaseURL(spaceKey string) (string, error) {
	if c == nil || c.baseURLTemplate == "" {
		return "", fmt.Errorf("template preview render client is not configured")
	}
	if (strings.Contains(c.baseURLTemplate, "{spaceKey}") || strings.Contains(c.baseURLTemplate, "{{spaceKey}}")) && strings.TrimSpace(spaceKey) == "" {
		return "", fmt.Errorf("space key is required to resolve processing base URL")
	}
	baseURL := ResolveProcessingBaseURL(c.baseURLTemplate, spaceKey)
	if baseURL == "" {
		return "", fmt.Errorf("template preview render client is not configured")
	}
	return baseURL, nil
}

func ResolveProcessingBaseURL(template, spaceKey string) string {
	replacer := strings.NewReplacer(
		"{{spaceKey}}", spaceKey,
		"{spaceKey}", spaceKey,
	)
	return strings.TrimRight(strings.TrimSpace(replacer.Replace(template)), "/")
}
