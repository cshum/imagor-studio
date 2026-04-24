package resolver

import (
	"context"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// ---------- helpers ----------------------------------------------------------

func makeTestOrg(id, ownerID string) *org.Org {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return &org.Org{
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

func makeTestSpace(key, orgID string) *space.Space {
	return &space.Space{
		ID:              "space-" + key,
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
	return NewResolver(sp, nil, nil, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)
}

func newOrgResolverWithRegistry(orgStore *MockOrgStore, spaceStore *MockSpaceStore, registryStore *MockRegistryStore) *Resolver {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	return NewResolver(sp, registryStore, nil, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)
}

func newOrgResolverWithStorageValidator(orgStore *MockOrgStore, spaceStore *MockSpaceStore, validator StorageConfigValidator) *Resolver {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	return NewResolver(sp, nil, nil, nil, nil, nil, logger, orgStore, spaceStore, nil, nil, WithStorageConfigValidator(validator))
}

// ---------- MyOrganization ---------------------------------------------------

func TestMyOrganization_NilOrgStore(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, nil, nil, nil)

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
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, nil, nil, nil)

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
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{s1, s2}, nil)

	// OrgID comes from JWT claim — no DB round-trip
	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "acme", result[0].Key)
	assert.Equal(t, "beta", result[1].Key)
	spaceStore.AssertExpectations(t)
}

func TestSpaces_IncludesGuestAccessibleSpaces(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	ownSpace := makeTestSpace("acme", "org-1")
	guestSpace := makeTestSpace("shared", "org-2")
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{ownSpace}, nil)
	spaceStore.On("ListByMemberUserID", mock.Anything, "user-1").Return([]*space.Space{guestSpace}, nil)
	spaceStore.On("HasMember", mock.Anything, "shared", "user-1").Return(true, nil)
	spaceStore.On("ListMembers", mock.Anything, "shared").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-2",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "member",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "acme", result[0].Key)
	assert.Equal(t, "shared", result[1].Key)
	assert.False(t, result[1].CanManage)
	assert.True(t, result[1].CanLeave)
	spaceStore.AssertExpectations(t)
}

func TestSpaces_FallbackToOrgStore(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	org := makeTestOrg("org-1", "user-1")
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(org, nil)
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{}, nil)

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

func TestSpace_ReturnsGuestAccessibleSpace(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-2")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)
	spaceStore.On("HasMember", mock.Anything, "acme", "user-1").Return(true, nil)
	spaceStore.On("ListMembers", mock.Anything, "acme").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-2",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "admin",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "acme")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme", result.Key)
	assert.Equal(t, "org-2", result.OrgID)
	assert.True(t, result.CanManage)
	assert.False(t, result.CanDelete)
	assert.True(t, result.CanLeave)
	spaceStore.AssertExpectations(t)
}

func TestSpace_ReturnsPublicAccessSpaceForGuestToken(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	registryStore := &MockRegistryStore{}
	r := newOrgResolverWithRegistry(orgStore, spaceStore, registryStore)

	s := makeTestSpace("public", "org-2")
	spaceStore.On("Get", mock.Anything, "public").Return(s, nil)
	orgStore.On("GetByUserID", mock.Anything, "guest-id").Return(nil, nil)
	registryStore.On(
		"Get",
		mock.Anything,
		registrystore.SpaceOwnerID(s.ID),
		"config.allow_guest_mode",
	).Return(&registrystore.Registry{Key: "config.allow_guest_mode", Value: "true"}, nil)

	ctx := createGuestContext("guest-id")
	result, err := r.Query().Space(ctx, "public")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "public", result.Key)
	assert.Equal(t, "org-2", result.OrgID)
	assert.False(t, result.CanManage)
	assert.False(t, result.CanDelete)
	assert.False(t, result.CanLeave)
	spaceStore.AssertExpectations(t)
	registryStore.AssertExpectations(t)
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
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, nil, nil, nil)

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
	created.StorageMode = space.StorageModePlatform
	created.StorageType = "managed"
	created.Bucket = ""
	created.Region = ""
	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.OrgID == "org-1" && s.Name == "Acme" && s.StorageMode == space.StorageModePlatform && s.StorageType == "managed"
	})).Return(nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	spaceStore.On("AddMember", mock.Anything, "acme", "user-1", "admin").Return(nil)
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

func TestCreateSpace_RejectsPlatformWithByobFields(t *testing.T) {
	r := newOrgResolver(&MockOrgStore{}, &MockSpaceStore{})

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageMode := space.StorageModePlatform
	storageType := "managed"
	input := gql.SpaceInput{
		Key:         "acme",
		Name:        "Acme",
		StorageMode: &storageMode,
		StorageType: &storageType,
		Bucket:      ptrStr("bucket"),
	}

	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "platform storage")
}

func TestCreateSpace_RejectsByobWithoutBucket(t *testing.T) {
	r := newOrgResolver(&MockOrgStore{}, &MockSpaceStore{})

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageMode := space.StorageModeBYOB
	storageType := "s3"
	input := gql.SpaceInput{
		Key:         "acme",
		Name:        "Acme",
		StorageMode: &storageMode,
		StorageType: &storageType,
		Region:      ptrStr("us-east-1"),
	}

	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "requires bucket")
}

func TestCreateSpace_DerivesStorageModeFromType(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolverWithStorageValidator(orgStore, spaceStore, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		assert.Equal(t, gql.StorageTypeS3, input.Type)
		if assert.NotNil(t, input.S3Config) {
			assert.Equal(t, "bucket", input.S3Config.Bucket)
		}
		return &gql.StorageTestResult{Success: true, Message: "Storage configuration test successful"}
	})

	created := makeTestSpace("acme", "org-1")
	created.StorageMode = space.StorageModeBYOB
	created.StorageType = "s3"
	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.StorageMode == space.StorageModeBYOB && s.StorageType == "s3" && s.Bucket == "bucket" && s.Region == "us-east-1"
	})).Return(nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	spaceStore.On("AddMember", mock.Anything, "acme", "user-1", "admin").Return(nil)
	spaceStore.On("Get", mock.Anything, "acme").Return(created, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageType := "s3"
	input := gql.SpaceInput{
		Key:         "acme",
		Name:        "Acme",
		StorageType: &storageType,
		Bucket:      ptrStr("bucket"),
		Region:      ptrStr("us-east-1"),
	}

	result, err := r.Mutation().CreateSpace(ctx, input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, space.StorageModeBYOB, result.StorageMode)
	spaceStore.AssertExpectations(t)
	orgStore.AssertExpectations(t)
}

func TestCreateSpace_RejectsInvalidByobStorageConfig(t *testing.T) {
	r := newOrgResolverWithStorageValidator(&MockOrgStore{}, &MockSpaceStore{}, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to write probe object",
			Details: stringPtr("access denied"),
		}
	})

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageType := "s3"
	input := gql.SpaceInput{
		Key:         "acme",
		Name:        "Acme",
		StorageType: &storageType,
		Bucket:      ptrStr("bucket"),
		Region:      ptrStr("us-east-1"),
	}

	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid BYOB storage configuration")
	assert.Contains(t, err.Error(), "Failed to write probe object")
	assert.Contains(t, err.Error(), "access denied")
}

func TestCreateSpace_DuplicateKey(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme"
	})).Return(apperror.Conflict(`space key "acme" is already taken`, "key"))

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already taken")
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
	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.OrgID == "org-auto"
	})).Return(nil)
	orgStore.On("ListMembers", mock.Anything, "org-auto").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	spaceStore.On("AddMember", mock.Anything, "acme", "user-1", "admin").Return(nil)
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
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, spaceStore, nil, nil)

	ctx := createAdminContext("user-1") // no org_id claim
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "no organization found")
}

// ---------- UpdateSpace ------------------------------------------------------

func TestUpdateSpace_RequiresManagePermission(t *testing.T) {
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(&MockOrgStore{}, spaceStore)

	spaceStore.On("Get", mock.Anything, "acme").Return(makeTestSpace("acme", "org-1"), nil)

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "space manager")
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
	existing.StorageMode = space.StorageModePlatform
	existing.StorageType = "managed"
	existing.Bucket = ""
	existing.Region = ""
	updated := makeTestSpace("acme", "org-1")
	updated.Name = "New Name"
	updated.StorageMode = space.StorageModePlatform
	updated.StorageType = "managed"
	updated.Bucket = ""
	updated.Region = ""

	spaceStore.On("Get", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
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

func TestUpdateSpace_RejectsByobManagedTypeMismatch(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	existing := makeTestSpace("acme", "org-1")
	existing.StorageMode = space.StorageModeBYOB
	existing.StorageType = "s3"
	existing.Bucket = "bucket"
	existing.Region = "us-east-1"
	spaceStore.On("Get", mock.Anything, "acme").Return(existing, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageMode := space.StorageModeBYOB
	storageType := "managed"
	input := gql.SpaceInput{Key: "acme", Name: "New Name", StorageMode: &storageMode, StorageType: &storageType}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "requires storageType")
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_ValidatesByobStorageChanges(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolverWithStorageValidator(orgStore, spaceStore, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		if assert.NotNil(t, input.S3Config) {
			assert.Equal(t, "new-bucket", input.S3Config.Bucket)
		}
		return &gql.StorageTestResult{Success: true, Message: "Storage configuration test successful"}
	})

	existing := makeTestSpace("acme", "org-1")
	existing.StorageMode = space.StorageModeBYOB
	existing.StorageType = "s3"
	existing.Bucket = "bucket"
	existing.Region = "us-east-1"
	updated := makeTestSpace("acme", "org-1")
	updated.StorageMode = space.StorageModeBYOB
	updated.StorageType = "s3"
	updated.Bucket = "new-bucket"
	updated.Region = "us-east-1"

	spaceStore.On("Get", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.Bucket == "new-bucket" && s.StorageMode == space.StorageModeBYOB
	})).Return(nil)
	spaceStore.On("Get", mock.Anything, "acme").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	bucket := "new-bucket"
	input := gql.SpaceInput{Key: "acme", Name: "New Name", Bucket: &bucket}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "new-bucket", result.Bucket)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_RejectsInvalidByobStorageChanges(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolverWithStorageValidator(orgStore, spaceStore, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to generate presigned upload URL",
			Details: stringPtr("signature mismatch"),
		}
	})

	existing := makeTestSpace("acme", "org-1")
	existing.StorageMode = space.StorageModeBYOB
	existing.StorageType = "s3"
	existing.Bucket = "bucket"
	existing.Region = "us-east-1"
	spaceStore.On("Get", mock.Anything, "acme").Return(existing, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	bucket := "new-bucket"
	input := gql.SpaceInput{Key: "acme", Name: "New Name", Bucket: &bucket}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid BYOB storage configuration")
	assert.Contains(t, err.Error(), "Failed to generate presigned upload URL")
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_SkipsValidationWhenByobStorageUnchanged(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	validatorCalled := false
	r := newOrgResolverWithStorageValidator(orgStore, spaceStore, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		validatorCalled = true
		return &gql.StorageTestResult{Success: true, Message: "Storage configuration test successful"}
	})

	existing := makeTestSpace("acme", "org-1")
	existing.StorageMode = space.StorageModeBYOB
	existing.StorageType = "s3"
	existing.Bucket = "bucket"
	existing.Region = "us-east-1"
	updated := makeTestSpace("acme", "org-1")
	updated.StorageMode = space.StorageModeBYOB
	updated.StorageType = "s3"
	updated.Bucket = "bucket"
	updated.Region = "us-east-1"
	updated.Name = "New Name"

	spaceStore.On("Get", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.Name == "New Name" && s.Bucket == "bucket"
	})).Return(nil)
	spaceStore.On("Get", mock.Anything, "acme").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.False(t, validatorCalled)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_AllowsGuestManager(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	existing := makeTestSpace("acme", "org-host")
	updated := makeTestSpace("acme", "org-host")
	updated.Name = "New Name"

	spaceStore.On("Get", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("ListMembers", mock.Anything, "acme").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-1",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "admin",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.Name == "New Name"
	})).Return(nil)
	spaceStore.On("Get", mock.Anything, "acme").Return(updated, nil).Once()
	spaceStore.On("ListMembers", mock.Anything, "acme").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-1",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "admin",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-guest")
	input := gql.SpaceInput{Key: "acme", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.True(t, result.CanManage)
	assert.False(t, result.CanDelete)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_RenamesKeyAndMigratesDependencies(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	inviteStore := &MockSpaceInviteStore{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, nil, nil, nil, nil, logger, orgStore, spaceStore, inviteStore, nil)

	existing := makeTestSpace("acme", "org-1")
	updated := makeTestSpace("acme-renamed", "org-1")
	updated.Name = "Renamed Space"

	spaceStore.On("Get", mock.Anything, "acme").Return(existing, nil).Once()
	inviteStore.On("RenameSpaceKey", mock.Anything, "org-1", "acme", "acme-renamed").Return(nil).Once()
	spaceStore.On("RenameKey", mock.Anything, "acme", "acme-renamed").Return(nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme-renamed" && s.Name == "Renamed Space"
	})).Return(nil).Once()
	spaceStore.On("Get", mock.Anything, "acme-renamed").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme-renamed", Name: "Renamed Space"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme-renamed", result.Key)
	assert.Equal(t, "Renamed Space", result.Name)
	spaceStore.AssertExpectations(t)
	inviteStore.AssertExpectations(t)
}

// ---------- DeleteSpace ------------------------------------------------------

func TestDeleteSpace_RequiresDeletePermission(t *testing.T) {
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(&MockOrgStore{}, spaceStore)

	spaceStore.On("Get", mock.Anything, "acme").Return(makeTestSpace("acme", "org-1"), nil)

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteSpace(ctx, "acme")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "owning organization admins")
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
	assert.Contains(t, err.Error(), "owning organization admins")
	spaceStore.AssertNotCalled(t, "SoftDelete")
}

func TestDeleteSpace_DeniesGuestManager(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-host")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)
	spaceStore.On("ListMembers", mock.Anything, "acme").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-1",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "admin",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-guest")
	ok, err := r.Mutation().DeleteSpace(ctx, "acme")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "owning organization admins")
	spaceStore.AssertNotCalled(t, "SoftDelete")
}

func TestSpaceMembers_ExposeRowActionCapabilities(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)
	spaceStore.On("ListMembers", mock.Anything, "acme").Return([]*space.SpaceMemberView{
		{
			SpaceID:     "space-1",
			UserID:      "user-1",
			Username:    "alice",
			DisplayName: "Alice",
			Role:        "admin",
			CreatedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			SpaceID:     "space-1",
			UserID:      "user-3",
			Username:    "charlie",
			DisplayName: "Charlie",
			Role:        "member",
			CreatedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		},
	}, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "admin"),
		makeTestMember("user-3", "charlie", "member"),
	}, nil).Times(3)

	ctx := createAdminContextWithOrg("user-2", "org-1")
	result, err := r.Query().SpaceMembers(ctx, "acme")
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "user-1", result[0].UserID)
	assert.Equal(t, "owner", result[0].Role)
	assert.Equal(t, "organization", result[0].RoleSource)
	assert.False(t, result[0].CanChangeRole)
	assert.False(t, result[0].CanRemove)
	assert.Equal(t, "user-3", result[1].UserID)
	assert.True(t, result[1].CanChangeRole)
	assert.True(t, result[1].CanRemove)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestInviteSpaceMember_AddsExistingOrgMemberByEmail(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	userStore := &MockUserStore{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, userStore, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)
	userStore.On("GetByEmail", mock.Anything, "bob@example.com").Return(&userstore.User{
		ID:          "user-2",
		Username:    "bob",
		DisplayName: "Bob",
	}, nil)
	spaceStore.On("HasMember", mock.Anything, "acme", "user-2").Return(false, nil)
	spaceStore.On("AddMember", mock.Anything, "acme", "user-2", "member").Return(nil)
	spaceStore.On("ListMembers", mock.Anything, "acme").Return([]*space.SpaceMemberView{{
		SpaceID:     "space-1",
		UserID:      "user-2",
		Username:    "bob",
		DisplayName: "Bob",
		Role:        "member",
		CreatedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().InviteSpaceMember(ctx, "acme", "Bob@Example.com", "member")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "added", result.Status)
	require.NotNil(t, result.Member)
	assert.Equal(t, "user-2", result.Member.UserID)
	assert.Nil(t, result.Invitation)

	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestInviteSpaceMember_AddsExistingExternalAccountAsGuest(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	userStore := &MockUserStore{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, userStore, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)
	guestEmail := "guest@example.com"
	guestAvatarURL := "https://example.com/avatar.png"

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	userStore.On("GetByEmail", mock.Anything, "guest@example.com").Return(&userstore.User{
		ID:          "user-9",
		Email:       &guestEmail,
		Username:    "guestuser",
		DisplayName: "Guest User",
		AvatarUrl:   &guestAvatarURL,
	}, nil)
	spaceStore.On("HasMember", mock.Anything, "acme", "user-9").Return(false, nil)
	spaceStore.On("AddMember", mock.Anything, "acme", "user-9", "member").Return(nil)
	spaceStore.On("ListMembers", mock.Anything, "acme").Return([]*space.SpaceMemberView{{
		SpaceID:     "space-1",
		UserID:      "user-9",
		Username:    "guestuser",
		DisplayName: "Guest User",
		Email:       &guestEmail,
		AvatarURL:   &guestAvatarURL,
		Role:        "member",
		CreatedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().InviteSpaceMember(ctx, "acme", "guest@example.com", "member")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "added", result.Status)
	require.NotNil(t, result.Member)
	assert.Equal(t, "user-9", result.Member.UserID)
	require.NotNil(t, result.Member.Email)
	assert.Equal(t, "guest@example.com", *result.Member.Email)
	assert.Nil(t, result.Invitation)

	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestLeaveSpace_RemovesGuestMembership(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	space := makeTestSpace("shared-space", "org-host")
	spaceStore.On("Get", mock.Anything, "shared-space").Return(space, nil)
	spaceStore.On("HasMember", mock.Anything, "shared-space", "user-1").Return(true, nil)
	spaceStore.On("RemoveMember", mock.Anything, "shared-space", "user-1").Return(nil)

	ctx := createAdminContextWithOrg("user-1", "org-guest")
	ok, err := r.Mutation().LeaveSpace(ctx, "shared-space")
	require.NoError(t, err)
	assert.True(t, ok)
	spaceStore.AssertExpectations(t)
}

func TestLeaveSpace_RejectsOwnedSpace(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	space := makeTestSpace("owned-space", "org-1")
	spaceStore.On("Get", mock.Anything, "owned-space").Return(space, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().LeaveSpace(ctx, "owned-space")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "only leave shared spaces")
	spaceStore.AssertExpectations(t)
}

func TestInviteSpaceMember_CreatesPendingInvitationForExternalEmail(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	userStore := &MockUserStore{}
	inviteStore := &MockSpaceInviteStore{}
	sender := &MockInviteSender{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, userStore, nil, nil, nil, logger, orgStore, spaceStore, inviteStore, sender)

	s := makeTestSpace("acme", "org-1")
	o := makeTestOrg("org-1", "user-1")
	o.Name = "Acme Org"
	invitation := &space.Invitation{
		ID:        "invite-1",
		OrgID:     "org-1",
		SpaceKey:  "acme",
		Email:     "new@example.com",
		Role:      "member",
		Token:     "tok-123",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		ExpiresAt: time.Date(2026, 1, 8, 0, 0, 0, 0, time.UTC),
	}

	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	userStore.On("GetByEmail", mock.Anything, "new@example.com").Return((*userstore.User)(nil), nil)
	inviteStore.On(
		"CreateOrRefreshPending",
		mock.Anything,
		"org-1",
		"acme",
		"new@example.com",
		"member",
		"user-1",
		mock.AnythingOfType("time.Time"),
	).Return(invitation, nil)
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(o, nil)
	sender.On("SendSpaceInvitation", mock.Anything, mock.MatchedBy(func(params space.EmailParams) bool {
		return params.ToEmail == "new@example.com" && params.OrgName == "Acme Org" && params.SpaceName == "Test Space" && params.InviteToken == "tok-123"
	})).Return(nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().InviteSpaceMember(ctx, "acme", "new@example.com", "member")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "invited", result.Status)
	assert.Nil(t, result.Member)
	require.NotNil(t, result.Invitation)
	assert.Equal(t, "invite-1", result.Invitation.ID)
	assert.Equal(t, "new@example.com", result.Invitation.Email)

	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
	inviteStore.AssertExpectations(t)
	sender.AssertExpectations(t)
}

func TestRemoveSpaceMember_RejectsHostOrgOwner(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	space := makeTestSpace("acme", "org-1")
	spaceStore.On("Get", mock.Anything, "acme").Return(space, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "admin"),
	}, nil)

	ctx := createAdminContextWithOrg("user-2", "org-1")
	ok, err := r.Mutation().RemoveSpaceMember(ctx, "acme", "user-1")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "host organization owner or admin")
	spaceStore.AssertNotCalled(t, "RemoveMember")
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpaceMemberRole_RejectsHostOrgOwner(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	space := makeTestSpace("acme", "org-1")
	spaceStore.On("Get", mock.Anything, "acme").Return(space, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "admin"),
	}, nil)

	ctx := createAdminContextWithOrg("user-2", "org-1")
	result, err := r.Mutation().UpdateSpaceMemberRole(ctx, "acme", "user-1", "member")
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "host organization owner or admin")
	spaceStore.AssertNotCalled(t, "UpdateMemberRole")
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}
