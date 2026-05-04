package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestProcessingPreviewHandler_RejectsMissingToken(t *testing.T) {
	t.Parallel()

	handler := newProcessingPreviewHandler(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}),
		auth.NewTokenManager("preview-secret", time.Hour),
		processingTestSpaceConfigReader{},
		".imagor.app",
		zap.NewNop(),
	)

	req := httptest.NewRequest(http.MethodGet, "http://demo.imagor.app/preview/fit-in/300x200/test.jpg", nil)
	req.Host = "demo.imagor.app"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestProcessingPreviewHandler_ServesPreviewViaUnsafeImagorPath(t *testing.T) {
	t.Parallel()

	tokenManager := auth.NewTokenManager("preview-secret", time.Hour)
	token, err := tokenManager.GenerateTokenWithClaims(auth.Claims{
		UserID:   "user-1",
		OrgID:    "org-1",
		Role:     "user",
		Kind:     sharedprocessing.PreviewTokenKind,
		SpaceKey: "demo",
		RegisteredClaims: jwt.RegisteredClaims{
			Audience: jwt.ClaimStrings{sharedprocessing.PreviewTokenAudience},
		},
	}, time.Hour)
	require.NoError(t, err)

	store := processingTestSpaceConfigReader{spaces: map[string]sharedprocessing.SpaceConfig{
		"demo": &processingTestSpaceConfig{key: "demo", orgID: "org-1", signerAlgorithm: "sha256", signerTruncate: 32, imagorSecret: "space-secret"},
	}}
	expectedSigner := imagorprovider.NewSigner("space-secret", "sha256", 32)
	require.NotNil(t, expectedSigner)

	var gotMetadata sharedprocessing.RequestMetadata
	var gotMetadataOK bool
	var gotHost string
	var gotPath string
	var gotQuery string
	handler := newProcessingPreviewHandler(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotHost = r.Host
			gotPath = r.URL.Path
			gotQuery = r.URL.RawQuery
			gotMetadata, gotMetadataOK = sharedprocessing.RequestMetadataFromContext(r.Context())
			w.WriteHeader(http.StatusAccepted)
		}),
		tokenManager,
		store,
		"imagor.app",
		zap.NewNop(),
	)

	req := httptest.NewRequest(
		http.MethodGet,
		"http://demo.imagor.app/preview/fit-in/300x200/test.jpg?pt="+token+"&v=123",
		nil,
	)
	req.Host = "demo.imagor.app"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusAccepted, rec.Code)
	assert.Equal(t, "demo.imagor.app", gotHost)
	assert.Equal(t, "/"+expectedSigner.Sign("fit-in/300x200/test.jpg")+"/fit-in/300x200/test.jpg", gotPath)
	assert.Equal(t, "v=123", gotQuery)
	require.True(t, gotMetadataOK)
	assert.Equal(t, sharedprocessing.UsageClassInternalNonBillable, gotMetadata.Class)
	assert.Equal(t, "org-1", gotMetadata.OrgID)
	assert.Equal(t, "demo", gotMetadata.SpaceID)
}
