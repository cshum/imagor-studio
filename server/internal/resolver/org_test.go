package resolver

import (
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/apperror"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/cshum/imagor-studio/server/internal/spaceinvite"
	"github.com/cshum/imagor-studio/server/internal/spacestore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
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
	return NewResolver(sp, nil, nil, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)
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

func TestSpaces_IncludesGuestAccessibleSpaces(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	ownSpace := makeTestSpace("acme", "org-1")
	guestSpace := makeTestSpace("shared", "org-2")
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*spacestore.Space{ownSpace}, nil)
	spaceStore.On("ListByMemberUserID", mock.Anything, "user-1").Return([]*spacestore.Space{guestSpace}, nil)
	spaceStore.On("HasMember", mock.Anything, "shared", "user-1").Return(true, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "acme", result[0].Key)
	assert.Equal(t, "shared", result[1].Key)
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

func TestSpace_ReturnsGuestAccessibleSpace(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-2")
	spaceStore.On("Get", mock.Anything, "acme").Return(s, nil)
	spaceStore.On("HasMember", mock.Anything, "acme", "user-1").Return(true, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "acme")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme", result.Key)
	assert.Equal(t, "org-2", result.OrgID)
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
	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *spacestore.Space) bool {
		return s.Key == "acme" && s.OrgID == "org-1" && s.Name == "Acme"
	})).Return(nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*orgstore.OrgMemberView{
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

func TestCreateSpace_DuplicateKey(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *spacestore.Space) bool {
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
	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *spacestore.Space) bool {
		return s.Key == "acme" && s.OrgID == "org-auto"
	})).Return(nil)
	orgStore.On("ListMembers", mock.Anything, "org-auto").Return([]*orgstore.OrgMemberView{
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

func TestInviteSpaceMember_AddsExistingOrgMemberByEmail(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	userStore := &MockUserStore{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, userStore, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)

	space := makeTestSpace("acme", "org-1")
	spaceStore.On("Get", mock.Anything, "acme").Return(space, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*orgstore.OrgMemberView{
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
	spaceStore.On("ListMembers", mock.Anything, "acme").Return([]*spacestore.SpaceMemberView{{
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

	space := makeTestSpace("acme", "org-1")
	spaceStore.On("Get", mock.Anything, "acme").Return(space, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*orgstore.OrgMemberView{
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
	spaceStore.On("ListMembers", mock.Anything, "acme").Return([]*spacestore.SpaceMemberView{{
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

func TestInviteSpaceMember_CreatesPendingInvitationForExternalEmail(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	userStore := &MockUserStore{}
	inviteStore := &MockSpaceInviteStore{}
	sender := &MockInviteSender{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, userStore, nil, nil, nil, logger, orgStore, spaceStore, inviteStore, sender)

	space := makeTestSpace("acme", "org-1")
	org := makeTestOrg("org-1", "user-1")
	org.Name = "Acme Org"
	invitation := &spaceinvite.Invitation{
		ID:        "invite-1",
		OrgID:     "org-1",
		SpaceKey:  "acme",
		Email:     "new@example.com",
		Role:      "member",
		Token:     "tok-123",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		ExpiresAt: time.Date(2026, 1, 8, 0, 0, 0, 0, time.UTC),
	}

	spaceStore.On("Get", mock.Anything, "acme").Return(space, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*orgstore.OrgMemberView{
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
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(org, nil)
	sender.On("SendSpaceInvitation", mock.Anything, mock.MatchedBy(func(params spaceinvite.EmailParams) bool {
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
