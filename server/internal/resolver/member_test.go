package resolver

import (
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// newMemberResolver creates a Resolver wired with orgStore + userStore (for member ops).
// Golang typed-nil guard: pass nil interface values when the pointer is nil.
func newMemberResolver(os *MockOrgStore, us *MockUserStore) *Resolver {
	sp := NewMockStorageProvider(nil)
	logger, _ := zap.NewDevelopment()
	var orgS cloudcontract.OrgStore
	if os != nil {
		orgS = os
	}
	var userS userstore.Store
	if us != nil {
		userS = us
	}
	return NewResolver(sp, nil, userS, nil, nil, nil, logger, orgS, nil, nil, nil)
}

func makeTestMember(userID, username, role string) *cloudcontract.OrgMemberView {
	return &cloudcontract.OrgMemberView{
		OrgID:     "org-1",
		UserID:    userID,
		Username:  username,
		Role:      role,
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

// ── OrgMembers ────────────────────────────────────────────────────────────────

func TestOrgMembers_ReturnsMembers(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	members := []*cloudcontract.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}
	orgStore.On("ListMembers", mock.Anything, "org-1").Return(members, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().OrgMembers(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "user-1", result[0].UserID)
	assert.Equal(t, "alice", result[0].Username)
	assert.Equal(t, "owner", result[0].Role)
	assert.Equal(t, "user-2", result[1].UserID)
	assert.Equal(t, "bob", result[1].Username)
	orgStore.AssertExpectations(t)
}

func TestOrgMembers_RequiresAdmin(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	_, err := r.Query().OrgMembers(ctx)
	require.Error(t, err)
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

	// Plan limit check: starter plan with 2 current members (max 5).
	org := makeTestOrg("org-1", "user-1")
	org.Plan = "starter"
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(org, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*cloudcontract.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)
	orgStore.On("AddMember", mock.Anything, "org-1", "user-3", "member").Return(nil)
	// Reload after add for return value.
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*cloudcontract.OrgMemberView{
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
	assert.Equal(t, "member", result.Role)
	orgStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestAddOrgMember_UserNotFound(t *testing.T) {
	orgStore := &MockOrgStore{}
	userStore := &MockUserStore{}
	r := newMemberResolver(orgStore, userStore)

	userStore.On("GetByUsername", mock.Anything, "ghost").Return(nil, nil)
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(makeTestOrg("org-1", "user-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*cloudcontract.OrgMemberView{}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().AddOrgMember(ctx, "ghost", "member")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestAddOrgMember_PlanLimitReached(t *testing.T) {
	orgStore := &MockOrgStore{}
	userStore := &MockUserStore{}
	r := newMemberResolver(orgStore, userStore)

	userStore.On("GetByUsername", mock.Anything, "extra").Return(&model.User{
		ID: "user-extra", Username: "extra",
	}, nil)

	// Trial plan: max 1 member. Already has 1.
	org := makeTestOrg("org-1", "user-1")
	org.Plan = "trial"
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(org, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*cloudcontract.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().AddOrgMember(ctx, "extra", "member")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "limit")
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

	orgStore.On("RemoveMember", mock.Anything, "org-1", "user-2").
		Return(assert.AnError)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().RemoveOrgMember(ctx, "user-2")
	assert.False(t, ok)
	require.Error(t, err)
}

func TestRemoveOrgMember_RequiresAdmin(t *testing.T) {
	r := newMemberResolver(&MockOrgStore{}, nil)
	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().RemoveOrgMember(ctx, "user-2")
	require.Error(t, err)
}

// ── UpdateOrgMemberRole ───────────────────────────────────────────────────────

func TestUpdateOrgMemberRole_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("UpdateMemberRole", mock.Anything, "org-1", "user-2", "admin").Return(nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*cloudcontract.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		{OrgID: "org-1", UserID: "user-2", Username: "bob", Role: "admin",
			CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)},
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().UpdateOrgMemberRole(ctx, "user-2", "admin")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "user-2", result.UserID)
	assert.Equal(t, "admin", result.Role)
	orgStore.AssertExpectations(t)
}

func TestUpdateOrgMemberRole_StoreError(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newMemberResolver(orgStore, nil)

	orgStore.On("UpdateMemberRole", mock.Anything, "org-1", "user-2", "owner").
		Return(assert.AnError)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().UpdateOrgMemberRole(ctx, "user-2", "owner")
	require.Error(t, err)
}

func TestUpdateOrgMemberRole_RequiresAdmin(t *testing.T) {
	r := newMemberResolver(&MockOrgStore{}, nil)
	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	_, err := r.Mutation().UpdateOrgMemberRole(ctx, "user-2", "admin")
	require.Error(t, err)
}
