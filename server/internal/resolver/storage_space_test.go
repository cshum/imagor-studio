package resolver

import (
	"context"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"go.uber.org/zap"
)

// ptrStr is a local helper for taking the address of a string literal.
func ptrStr(s string) *string { return &s }

// newSpaceTestResolver builds a Resolver backed by a MockStorage / MockStorageProvider
// and the provided spaceStore.  All other dependencies (registry, users, imagor,
// config, license, org) are left nil — they are not exercised by the space-storage
// tests.
func newSpaceTestResolver(spaceStore space.SpaceStore) *Resolver {
	mockStor := &MockStorage{}
	sp := NewMockStorageProvider(mockStor)
	return NewResolver(sp, nil, nil, nil, nil, nil, zap.NewNop(), nil, spaceStore, nil, nil)
}

// ─── getSpaceStorage unit tests ───────────────────────────────────────────────

// TestGetSpaceStorage_NilSpaceKey: nil key with active spaceStore → NOT_AVAILABLE error.
// In multi-tenant mode the root gallery has no system storage; callers must provide
// a spaceKey.  spaceStore.Get must never be called.
func TestGetSpaceStorage_NilSpaceKey(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	r := newSpaceTestResolver(mockSpaceStore)

	stor, err := r.getSpaceStorage(context.Background(), nil)
	assert.Error(t, err)
	assert.Nil(t, stor)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected a gqlerror.Error")
	assert.Equal(t, "NOT_AVAILABLE", gqlErr.Extensions["code"])
	mockSpaceStore.AssertNotCalled(t, "Get")
}

// TestGetSpaceStorage_EmptySpaceKey: empty-string key with active spaceStore → NOT_AVAILABLE error.
func TestGetSpaceStorage_EmptySpaceKey(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	r := newSpaceTestResolver(mockSpaceStore)

	stor, err := r.getSpaceStorage(context.Background(), ptrStr(""))
	assert.Error(t, err)
	assert.Nil(t, stor)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected a gqlerror.Error")
	assert.Equal(t, "NOT_AVAILABLE", gqlErr.Extensions["code"])
	mockSpaceStore.AssertNotCalled(t, "Get")
}

// TestGetSpaceStorage_SpaceStoreNil: multi-tenancy disabled (spaceStore == nil)
// → transparent fallback even when a non-empty key is supplied.
func TestGetSpaceStorage_SpaceStoreNil(t *testing.T) {
	r := newSpaceTestResolver(nil)

	stor, err := r.getSpaceStorage(context.Background(), ptrStr("space-1"))
	assert.NoError(t, err)
	assert.NotNil(t, stor)
}

// TestGetSpaceStorage_NotFound: spaceStore returns (nil, nil) → NOT_FOUND gqlerror.
func TestGetSpaceStorage_NotFound(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "space-1").
		Return((*space.Space)(nil), nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorage(ctx, ptrStr("space-1"))
	assert.Nil(t, stor)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected a *gqlerror.Error")
	assert.Equal(t, "NOT_FOUND", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestGetSpaceStorage_OrgMismatch: space belongs to a different org → FORBIDDEN.
func TestGetSpaceStorage_OrgMismatch(t *testing.T) {
	space := &space.Space{
		OrgID:  "org-b", // caller is in org-a
		Bucket: "the-bucket",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "space-1").Return(space, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorage(ctx, ptrStr("space-1"))
	assert.Nil(t, stor)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected a *gqlerror.Error")
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

func TestGetSpaceStorage_GuestMemberAllowed(t *testing.T) {
	space := &space.Space{
		Key:         "space-1",
		OrgID:       "org-b",
		StorageType: "s3",
		Bucket:      "guest-bucket",
		Region:      "us-east-1",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "space-1").Return(space, nil)
	mockSpaceStore.On("HasMember", mock.Anything, "space-1", "user-1").Return(true, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorage(ctx, ptrStr("space-1"))
	assert.NotNil(t, stor)
	assert.NoError(t, err)
	mockSpaceStore.AssertExpectations(t)
}

// TestGetSpaceStorage_Valid: matching org + valid bucket → non-nil S3 storage
// is constructed without any network call.
func TestGetSpaceStorage_Valid(t *testing.T) {
	space := &space.Space{
		OrgID:       "org-a",
		StorageType: "s3",
		Bucket:      "my-bucket",
		Region:      "us-east-1",
		Endpoint:    "https://s3.example.com",
		AccessKeyID: "AKIATEST",
		SecretKey:   "test-secret",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "space-1").Return(space, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorage(ctx, ptrStr("space-1"))
	assert.NoError(t, err)
	assert.NotNil(t, stor) // S3 client built without network calls
	mockSpaceStore.AssertExpectations(t)
}

// ─── ListFiles integration: auth error paths ─────────────────────────────────

// TestListFiles_SpaceKeyNotFound: passing a spaceKey that doesn't exist in the
// store propagates NOT_FOUND through the resolver.
func TestListFiles_SpaceKeyNotFound(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "missing-space").
		Return((*space.Space)(nil), nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	result, err := r.Query().ListFiles(
		ctx, "some/path", ptrStr("missing-space"),
		nil, nil, nil, nil, nil, nil, nil, nil,
	)
	assert.Nil(t, result)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok)
	assert.Equal(t, "NOT_FOUND", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestListFiles_SpaceKeyForbidden: passing a spaceKey whose org doesn't match the
// caller's JWT org returns FORBIDDEN.
func TestListFiles_SpaceKeyForbidden(t *testing.T) {
	space := &space.Space{
		OrgID:  "org-b", // caller is in org-a
		Bucket: "b",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "other-space").Return(space, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	result, err := r.Query().ListFiles(
		ctx, "some/path", ptrStr("other-space"),
		nil, nil, nil, nil, nil, nil, nil, nil,
	)
	assert.Nil(t, result)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok)
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestDeleteFile_SpaceKeyForbidden: delete on a cross-org space also returns FORBIDDEN.
func TestDeleteFile_SpaceKeyForbidden(t *testing.T) {
	space := &space.Space{
		OrgID:  "org-b",
		Bucket: "b",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "other-space").Return(space, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	ok, err := r.Mutation().DeleteFile(ctx, "file.jpg", ptrStr("other-space"))
	assert.False(t, ok)
	assert.Error(t, err)

	gqlErr, isGql := err.(*gqlerror.Error)
	assert.True(t, isGql)
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// ─── SaveTemplate space-routing tests ────────────────────────────────────────

// minimalTemplateInput is a valid SaveTemplateInput for routing tests that only
// need to reach getSpaceStorage — the template JSON content and imagor provider
// are never exercised because getSpaceStorage returns an error first.
var minimalTemplateInput = gql.SaveTemplateInput{
	Name:            "My Template",
	DimensionMode:   gql.DimensionModeAdaptive,
	TemplateJSON:    `{"version":"1.0","transformations":{}}`,
	SourceImagePath: "test.jpg",
	SavePath:        "",
}

// TestSaveTemplate_SpaceKeyNotFound: unknown space → NOT_FOUND gqlerror.
func TestSaveTemplate_SpaceKeyNotFound(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "missing").
		Return((*space.Space)(nil), nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	result, err := r.Mutation().SaveTemplate(ctx, minimalTemplateInput, ptrStr("missing"))
	assert.Nil(t, result)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, "NOT_FOUND", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestSaveTemplate_SpaceKeyForbidden: cross-org space → FORBIDDEN gqlerror.
func TestSaveTemplate_SpaceKeyForbidden(t *testing.T) {
	space := &space.Space{OrgID: "org-b", Bucket: "b"}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "other-space").Return(space, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	result, err := r.Mutation().SaveTemplate(ctx, minimalTemplateInput, ptrStr("other-space"))
	assert.Nil(t, result)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// ─── RegenerateTemplatePreview space-routing tests ───────────────────────────

// TestRegenerateTemplatePreview_SpaceKeyNotFound: unknown space → NOT_FOUND.
func TestRegenerateTemplatePreview_SpaceKeyNotFound(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "missing").
		Return((*space.Space)(nil), nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	ok, err := r.Mutation().RegenerateTemplatePreview(
		ctx, "templates/My Template.imagor.json", ptrStr("missing"),
	)
	assert.False(t, ok)
	assert.Error(t, err)

	gqlErr, isGql := err.(*gqlerror.Error)
	assert.True(t, isGql, "expected *gqlerror.Error")
	assert.Equal(t, "NOT_FOUND", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestRegenerateTemplatePreview_SpaceKeyForbidden: cross-org space → FORBIDDEN.
func TestRegenerateTemplatePreview_SpaceKeyForbidden(t *testing.T) {
	space := &space.Space{OrgID: "org-b", Bucket: "b"}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("Get", mock.Anything, "other-space").Return(space, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	ok, err := r.Mutation().RegenerateTemplatePreview(
		ctx, "templates/My Template.imagor.json", ptrStr("other-space"),
	)
	assert.False(t, ok)
	assert.Error(t, err)

	gqlErr, isGql := err.(*gqlerror.Error)
	assert.True(t, isGql, "expected *gqlerror.Error")
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}
