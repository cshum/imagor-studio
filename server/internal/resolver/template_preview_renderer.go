package resolver

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"

	"github.com/cshum/imagor-studio/server/pkg/processing"
)

type localTemplatePreviewRenderClient struct {
	imagorHandler http.Handler
	imagorURL     func(imagePath string, req processing.TemplatePreviewRenderRequest) (string, error)
}

func newLocalTemplatePreviewRenderClient(imagorHandler http.Handler, imagorURL func(imagePath string, req processing.TemplatePreviewRenderRequest) (string, error)) processing.TemplatePreviewRenderClient {
	if imagorHandler == nil || imagorURL == nil {
		return nil
	}

	return &localTemplatePreviewRenderClient{
		imagorHandler: imagorHandler,
		imagorURL:     imagorURL,
	}
}

func (c *localTemplatePreviewRenderClient) RenderTemplatePreview(ctx context.Context, req processing.TemplatePreviewRenderRequest) (*processing.TemplatePreviewRenderResponse, error) {
	if c == nil || c.imagorHandler == nil || c.imagorURL == nil {
		return nil, fmt.Errorf("template preview render client is not configured")
	}

	imagorURL, err := c.imagorURL(req.SourceImagePath, req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, imagorURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	recorder := httptest.NewRecorder()
	c.imagorHandler.ServeHTTP(recorder, httpReq)
	if recorder.Code != http.StatusOK {
		return nil, fmt.Errorf("imagor returned status %d", recorder.Code)
	}

	return &processing.TemplatePreviewRenderResponse{
		Image:       recorder.Body.Bytes(),
		ContentType: recorder.Header().Get("Content-Type"),
	}, nil
}
