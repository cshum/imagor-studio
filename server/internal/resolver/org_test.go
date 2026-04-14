package resolver

import (
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/cshum/imagor-studio/server/internal/spacestore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// ---------- helpers ----------------------------------------------------------

func makeTestOrg(id, ownerID string) *orgstore.Org {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return &orgstore.Org{
		ID:         id,
		OwnerID:    ownerID,
		Name:       "Test Org",
		Slug:       "test-org",
		Plan:       "starter",
		PlanStatus: "active",
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}

func makeTestSpace(key, orgID string) *spacestore.Space {
	return &spacestore.Space{
		OrgID:           orgID,
		Key:             key,
		Name:            "Test Space",
		StorageType:     "s3",
		Bucket:          "my-bucket",
		Prefix:          "",
		Region:          "us-east-1",
		Endpoint:        "",
		UsePathStyle:    false,
		CustomDomain:    "",
		Suspended:       false,
		IsShared:        false,
		SignerAlgorithm: "sha256",
		SignerTruncate:  0,
		UpdatedAt:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

func newOrgResolver(orgStore *MockOrgStore, spaceStore *MockSpaceStore) *Resolver {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	return NewResolver(sp, nil, nil, nil, nil, nil, logger, orgStore, spaceStore)
}

// ---------- MyOrganization ---------------------------------------------------

func TestMyOrganization_NilOrgStore(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().MyOrganization(ctx)
	require.NoError(t, err)
	assert.Nil(t, result)
}

func TestMyOrganization_ReturnsOrg(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	org := makeTestOrg("org-1", "user-1")
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(org, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().MyOrganization(ctx)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "org-1", result.ID)
	assert.Equal(t, "Test Org", result.Name)
	assert.Equal(t, "test-org", result.Slug)
	assert.Equal(t, "user-1", result.OwnerUserID)
	assert.Equal(t, "starter", result.Plan)
	assert.Equal(t, "active", result.PlanStatus)
	orgStore.AssertExpectations(t)
}

func TestMyOrganization_NoOrg(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().MyOrganization(ctx)
	require.NoError(t, err)
	assert.Nil(t, result)
	orgStore.AssertExpectations(t)
}

// ---------- Spaces -----------------------------------------------------------

func TestSpaces_NilSpaceStore(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	assert.Empty(t, result)
}

func TestSpaces_ReturnsSpaces(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s1 := makeTestSpace("acme", "org-1")
	s2 := makeTestSpace("beta", "org-1")
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*spacestore.Space{s1, s2}, nil)

	// OrgID comes from JWT claim — no DB round-trip
	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "acme", result[0].Key)
	assert.Equal(t, "beta", result[1].Key)
	spaceStore.AssertExpectations(t)
}

func TestSpaces_FallbackToOrgStore(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	org := makeTestOrg("org-1", "user-1")
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(org, nil)
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*spacestore.Space{}, nil)

	// No OrgID in claims → falls back to DB lookup
	ctx := createAdminContext("user-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	assert.Empty(t, result)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

// ---------- Space (single) ---------------------------------------------------

func TestSpace_ReturnsSpace(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "acme")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme", result.Key)
	assert.Equal(t, "org-1", result.OrgID)
	spaceStore.AssertExpectations(t)
}

func TestSpace_NotFound(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("Get", mock.Anything, "missing").Return(nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "missing")
	require.NoError(t, err)
	assert.Nil(t, result)
	spaceStore.AssertExpectations(t)
}

func TestSpace_WrongOrg(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	// Space belongs to org-2, caller is in org-1
	s := makeTestSpace("acme", "org-2")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "acme")
	require.NoError(t, err)
	assert.Nil(t, result, "should return nil when space belongs to a different org")
	spaceStore.AssertExpectations(t)
}

// ---------- CreateSpace ------------------------------------------------------

func TestCreateSpace_RequiresAdmin(t *testing.T) {
	r := newOrgResolver(&MockOrgStore{}, &MockSpaceStore{})

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "permission")
}

func TestCreateSpace_NilSpaceStore(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
}

func TestCreateSpace_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	created := makeTestSpace("acme", "org-1")
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *spacestore.Space) bool {
		return s.Key == "acme" && s.OrgID == "org-1" && s.Name == "Acme"
	})).Return(nil)
	spaceStore.On("Get", mock.Anything, "acme").Return(created, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme", result.Key)
	assert.Equal(t, "org-1", result.OrgID)
	spaceStore.AssertExpectations(t)
}

func TestCreateSpace_AutoCreatesOrg(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	// No org in JWT → falls back to DB, finds nothing
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(nil, nil)
	// Auto-create fires: slug = "org-" + "user-1" (6 chars < 8, uses full string)
	newOrg := makeTestOrg("org-auto", "user-1")
	orgStore.On("CreateWithMember", mock.Anything, "user-1", "My Organization", "org-user-1", (*time.Time)(nil)).Return(newOrg, nil)

	created := makeTestSpace("acme", "org-auto")
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *spacestore.Space) bool {
		return s.Key == "acme" && s.OrgID == "org-auto"
	})).Return(nil)
	spaceStore.On("Get", mock.Anything, "acme").Return(created, nil)

	ctx := createAdminContext("user-1") // no org_id claim
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme", result.Key)
	assert.Equal(t, "org-auto", result.OrgID)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestCreateSpace_NoOrgAndNilOrgStore(t *testing.T) {
	// spaceStore present but orgStore nil — no org in JWT claim either
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	spaceStore := &MockSpaceStore{}
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, spaceStore)

	ctx := createAdminContext("user-1") // no org_id claim
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "no organization found")
}

// ---------- UpdateSpace ------------------------------------------------------

func TestUpdateSpace_RequiresAdmin(t *testing.T) {
	r := newOrgResolver(&MockOrgStore{}, &MockSpaceStore{})

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "permission")
}

func TestUpdateSpace_NotFound(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("Get", mock.Anything, "missing").Return(nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "missing", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "missing", input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestUpdateSpace_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	existing := makeTestSpace("acme", "org-1")
	updated := makeTestSpace("acme", "org-1")
	updated.Name = "New Name"

	spaceStore.On("Get", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *spacestore.Space) bool {
		return s.Key == "acme" && s.Name == "New Name"
	})).Return(nil)
	spaceStore.On("Get", mock.Anything, "acme").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "New Name", result.Name)
	spaceStore.AssertExpectations(t)
}

// ---------- DeleteSpace ------------------------------------------------------

func TestDeleteSpace_RequiresAdmin(t *testing.T) {
	r := newOrgResolver(&MockOrgStore{}, &MockSpaceStore{})

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteSpace(ctx, "acme")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "permission")
}

func TestDeleteSpace_NotFound(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("Get", mock.Anything, "missing").Return(nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteSpace(ctx, "missing")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestDeleteSpace_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)
	spaceStore.On("SoftDelete", mock.Anything, "acme").Return(nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteSpace(ctx, "acme")
	require.NoError(t, err)
	assert.True(t, ok)
	spaceStore.AssertExpectations(t)
}

func TestDeleteSpace_WrongOrg(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	// Space belongs to org-2, caller is org-1
	s := makeTestSpace("acme", "org-2")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteSpace(ctx, "acme")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
	spaceStore.AssertNotCalled(t, "SoftDelete")
}
