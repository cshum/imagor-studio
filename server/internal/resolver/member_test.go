package resolver

import (
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"go.uber.org/zap"
)

// newMemberResolver creates a Resolver wired with orgStore + userStore (for member ops).
// Golang typed-nil guard: pass nil interface values when the pointer is nil.
func newMemberResolver(os *MockOrgStore, us *MockUserStore) *Resolver {
	sp := NewMockStorageProvider(nil)
	logger, _ := zap.NewDevelopment()
	var orgS org.OrgStore
	if os != nil {
		orgS = os
	}
	var userS userstore.Store
	if us != nil {
		userS = us
	}
	return NewResolver(sp, nil, userS, nil, nil, nil, logger, orgS, nil, nil, nil)
}

func makeTestMember(userID, username, role string) *org.OrgMemberView {
	return &org.OrgMemberView{
		OrgID:     "org-1",
		UserID:    userID,
		Username:  username,
		Role:      role,
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

func strPtr(value string) *string {
	return &value
}

// ── OrgMembers ────────────────────────────────────────────────────────────────

func TestOrgMembers_ReturnsMembers(t *testing.T) {
	orgStore := &MockOrgStore{}
	userStore := &MockUserStore{}
	r := newMemberResolver(orgStore, userStore)

	members := []*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}
	orgStore.On("ListMembers", mock.Anything, "org-1").Return(members, nil)
	userStore.On("GetByID", mock.Anything, "user-1").Return(&userstore.User{
		ID:        "user-1",
		Username:  "alice",
		Email:     strPtr("alice@example.com"),
		AvatarUrl: strPtr("https://example.com/alice.png"),
	}, nil)
	userStore.On("GetByID", mock.Anything, "user-2").Return(&userstore.User{
		ID:        "user-2",
		Username:  "bob",
		Email:     strPtr("bob@example.com"),
		AvatarUrl: strPtr("https://example.com/bob.png"),
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().OrgMembers(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "user-1", result[0].UserID)
	assert.Equal(t, "alice", result[0].Username)
	assert.Equal(t, "alice@example.com", *result[0].Email)
	assert.Equal(t, "https://example.com/alice.png", *result[0].AvatarURL)
	assert.Equal(t, gql.OrgMemberRoleOwner, result[0].Role)
	assert.Equal(t, "user-2", result[1].UserID)
	assert.Equal(t, "bob", result[1].Username)
	orgStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestOrgMembers_RequiresAdmin(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	result, err := r.Query().OrgMembers(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	orgStore.AssertExpectations(t)
}

func TestOrgMembers_NilOrgStore_ReturnsEmpty(t *testing.T) {
	r := newMemberResolver(nil, nil)
	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().OrgMembers(ctx)
	require.NoError(t, err)
	assert.Empty(t, result)
}

// ── AddOrgMember ──────────────────────────────────────────────────────────────

func TestAddOrgMember_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	userStore := &MockUserStore{}
	r := newMemberResolver(orgStore, userStore)

	// User lookup succeeds.
	userStore.On("GetByUsername", mock.Anything, "charlie").Return(&model.User{
		ID:       "user-3",
		Username: "charlie",
	}, nil)
	orgStore.On("GetByUserID", mock.Anything, "user-3").Return((*org.Org)(nil), nil)

	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)
	orgStore.On("AddMember", mock.Anything, "org-1", "user-3", "member").Return(nil)
	// Reload after add for return value.
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
		makeTestMember("user-3", "charlie", "member"),
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().AddOrgMember(ctx, "charlie", "member")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "user-3", result.UserID)
	assert.Equal(t, "charlie", result.Username)
	assert.Equal(t, gql.OrgMemberRoleMember, result.Role)
	orgStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestAddOrgMember_UserNotFound(t *testing.T) {
	orgStore := &MockOrgStore{}
	userStore := &MockUserStore{}
	r := newMemberResolver(orgStore, userStore)

	userStore.On("GetByUsername", mock.Anything, "ghost").Return(nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().AddOrgMember(ctx, "ghost", "member")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestAddOrgMember_DoesNotEnforcePlanMemberLimit(t *testing.T) {
	orgStore := &MockOrgStore{}
	userStore := &MockUserStore{}
	r := newMemberResolver(orgStore, userStore)

	userStore.On("GetByUsername", mock.Anything, "extra").Return(&model.User{
		ID: "user-extra", Username: "extra",
	}, nil)
	orgStore.On("GetByUserID", mock.Anything, "user-extra").Return((*org.Org)(nil), nil)

	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	orgStore.On("AddMember", mock.Anything, "org-1", "user-extra", "member").Return(nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-extra", "extra", "member"),
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().AddOrgMember(ctx, "extra", "member")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "user-extra", result.UserID)
	assert.Equal(t, "extra", result.Username)
	assert.Equal(t, gql.OrgMemberRoleMember, result.Role)
	orgStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestAddOrgMember_RejectsUserInAnotherOrganization(t *testing.T) {
	orgStore := &MockOrgStore{}
	userStore := &MockUserStore{}
	r := newMemberResolver(orgStore, userStore)

	userStore.On("GetByUsername", mock.Anything, "extra").Return(&model.User{
		ID:       "user-extra",
		Username: "extra",
	}, nil)
	orgStore.On("GetByUserID", mock.Anything, "user-extra").Return(makeTestOrg("org-2", "user-extra"), nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().AddOrgMember(ctx, "extra", "member")
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already belongs to another organization")
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, "org_member_other_organization", gqlErr.Extensions["reason"])
	orgStore.AssertNotCalled(t, "AddMember", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestAddOrgMemberByEmail_DoesNotEnforcePlanMemberLimit(t *testing.T) {
	orgStore := &MockOrgStore{}
	userStore := &MockUserStore{}
	r := newMemberResolver(orgStore, userStore)

	userStore.On("GetByEmail", mock.Anything, "extra@example.com").Return(&userstore.User{
		ID:       "user-extra",
		Username: "extra",
	}, nil)
	orgStore.On("GetByUserID", mock.Anything, "user-extra").Return((*org.Org)(nil), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	orgStore.On("AddMember", mock.Anything, "org-1", "user-extra", "member").Return(nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-extra", "extra", "member"),
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().AddOrgMemberByEmail(ctx, "extra@example.com", "member")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "user-extra", result.UserID)
	assert.Equal(t, "extra", result.Username)
	assert.Equal(t, gql.OrgMemberRoleMember, result.Role)
	orgStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestAddOrgMemberByEmail_RejectsUserInAnotherOrganization(t *testing.T) {
	orgStore := &MockOrgStore{}
	userStore := &MockUserStore{}
	r := newMemberResolver(orgStore, userStore)

	userStore.On("GetByEmail", mock.Anything, "extra@example.com").Return(&userstore.User{
		ID:       "user-extra",
		Username: "extra",
	}, nil)
	orgStore.On("GetByUserID", mock.Anything, "user-extra").Return(makeTestOrg("org-2", "user-extra"), nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().AddOrgMemberByEmail(ctx, "extra@example.com", "member")
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already belongs to another organization")
	orgStore.AssertNotCalled(t, "AddMember", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestAddOrgMember_RequiresAdmin(t *testing.T) {
	r := newMemberResolver(&MockOrgStore{}, &MockUserStore{})
	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().AddOrgMember(ctx, "someone", "member")
	require.Error(t, err)
}

// ── RemoveOrgMember ───────────────────────────────────────────────────────────

func TestRemoveOrgMember_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)
	orgStore.On("RemoveMember", mock.Anything, "org-1", "user-2").Return(nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().RemoveOrgMember(ctx, "user-2")
	require.NoError(t, err)
	assert.True(t, ok)
	orgStore.AssertExpectations(t)
}

func TestRemoveOrgMember_StoreError(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)
	orgStore.On("RemoveMember", mock.Anything, "org-1", "user-2").
		Return(assert.AnError)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().RemoveOrgMember(ctx, "user-2")
	assert.False(t, ok)
	require.Error(t, err)
}

func TestRemoveOrgMember_RejectsSelfRemoval(t *testing.T) {
	r := newMemberResolver(&MockOrgStore{}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().RemoveOrgMember(ctx, "user-1")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot remove yourself")
}

func TestRemoveOrgMember_RejectsOwnerRemoval(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-2"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "admin"),
		makeTestMember("user-2", "bob", "owner"),
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().RemoveOrgMember(ctx, "user-2")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot remove the organization owner")
	orgStore.AssertNotCalled(t, "RemoveMember", mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
}

func TestRemoveOrgMember_RejectsLastMemberRemoval(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-2", "bob", "member"),
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().RemoveOrgMember(ctx, "user-2")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot remove the last organization member")
	orgStore.AssertNotCalled(t, "RemoveMember", mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
}

func TestRemoveOrgMember_RequiresAdmin(t *testing.T) {
	r := newMemberResolver(&MockOrgStore{}, nil)
	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().RemoveOrgMember(ctx, "user-2")
	require.Error(t, err)
}

// ── LeaveOrganization ────────────────────────────────────────────────────────

func TestLeaveOrganization_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)
	orgStore.On("RemoveMember", mock.Anything, "org-1", "user-2").Return(nil)

	ctx := createReadWriteContextWithOrg("user-2", "org-1")
	ok, err := r.Mutation().LeaveOrganization(ctx)
	require.NoError(t, err)
	assert.True(t, ok)
	orgStore.AssertExpectations(t)
}

func TestLeaveOrganization_RejectsOwner(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().LeaveOrganization(ctx)
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "transfer organization ownership before leaving")
	orgStore.AssertNotCalled(t, "RemoveMember", mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
}

func TestLeaveOrganization_RejectsLastMember(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-9"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-2", "bob", "member"),
	}, nil)

	ctx := createReadWriteContextWithOrg("user-2", "org-1")
	ok, err := r.Mutation().LeaveOrganization(ctx)
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot leave the last organization member")
	orgStore.AssertNotCalled(t, "RemoveMember", mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
}

func TestLeaveOrganization_RejectsNonMember(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)

	ctx := createReadWriteContextWithOrg("user-9", "org-1")
	ok, err := r.Mutation().LeaveOrganization(ctx)
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not a member of this organization")
	orgStore.AssertNotCalled(t, "RemoveMember", mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
}

// ── UpdateOrgMemberRole ───────────────────────────────────────────────────────

func TestUpdateOrgMemberRole_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil).Once()
	orgStore.On("UpdateMemberRole", mock.Anything, "org-1", "user-2", "admin").Return(nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		{OrgID: "org-1", UserID: "user-2", Username: "bob", Role: "admin",
			CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)},
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().UpdateOrgMemberRole(ctx, "user-2", "admin")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "user-2", result.UserID)
	assert.Equal(t, gql.OrgMemberRoleAdmin, result.Role)
	orgStore.AssertExpectations(t)
}

func TestUpdateOrgMemberRole_StoreError(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil).Once()
	orgStore.On("UpdateMemberRole", mock.Anything, "org-1", "user-2", "admin").
		Return(assert.AnError)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().UpdateOrgMemberRole(ctx, "user-2", "admin")
	require.Error(t, err)
}

func TestUpdateOrgMemberRole_RejectsInvalidRole(t *testing.T) {
	r := newMemberResolver(&MockOrgStore{}, nil)
	ctx := createAdminContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().UpdateOrgMemberRole(ctx, "user-2", "owner")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "role must be admin or member")
}

func TestUpdateOrgMemberRole_RejectsChangingOwnerRole(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-2"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "admin"),
		makeTestMember("user-2", "bob", "owner"),
	}, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().UpdateOrgMemberRole(ctx, "user-2", "member")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot change the organization owner's role")
	orgStore.AssertNotCalled(t, "UpdateMemberRole", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
}

func TestUpdateOrgMemberRole_RequiresAdmin(t *testing.T) {
	r := newMemberResolver(&MockOrgStore{}, nil)
	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().UpdateOrgMemberRole(ctx, "user-2", "admin")
	require.Error(t, err)
}
