package orgstore_test

import (
	"context"
	"strings"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/cloud/orgstore"
)

// ── ListMembers ───────────────────────────────────────────────────────────────

func TestListMembers_Empty(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "lm-owner-1", "Org", "lm-org", nil)

	// The owner row is created by CreateWithMember, but no users row exists yet.
	members, err := st.ListMembers(ctx, org.ID)
	if err != nil {
		t.Fatalf("ListMembers: %v", err)
	}
	if len(members) != 1 {
		t.Fatalf("want 1 member (owner), got %d", len(members))
	}
	// Without a users row the username falls back to the userID.
	if members[0].UserID != "lm-owner-1" {
		t.Errorf("UserID: want lm-owner-1, got %q", members[0].UserID)
	}
	if members[0].Role != "owner" {
		t.Errorf("Role: want owner, got %q", members[0].Role)
	}
}

func TestListMembers_WithUsername(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	insertTestUser(t, db, "lm-user-2", "alice")
	insertTestUser(t, db, "lm-user-3", "bob")

	org, _ := st.CreateWithMember(ctx, "lm-user-2", "Org2", "lm-org2", nil)
	if err := st.AddMember(ctx, org.ID, "lm-user-3", "member"); err != nil {
		t.Fatalf("AddMember: %v", err)
	}

	members, err := st.ListMembers(ctx, org.ID)
	if err != nil {
		t.Fatalf("ListMembers: %v", err)
	}
	if len(members) != 2 {
		t.Fatalf("want 2 members, got %d", len(members))
	}

	usernames := map[string]string{}
	for _, m := range members {
		usernames[m.Role] = m.Username
	}
	if usernames["owner"] != "alice" {
		t.Errorf("owner username: want alice, got %q", usernames["owner"])
	}
	if usernames["member"] != "bob" {
		t.Errorf("member username: want bob, got %q", usernames["member"])
	}
}

// ── AddMember ─────────────────────────────────────────────────────────────────

func TestAddMember_Success(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "am-owner", "AddOrg", "add-org", nil)

	if err := st.AddMember(ctx, org.ID, "am-user-2", "admin"); err != nil {
		t.Fatalf("AddMember: %v", err)
	}

	members, err := st.ListMembers(ctx, org.ID)
	if err != nil {
		t.Fatalf("ListMembers after add: %v", err)
	}
	if len(members) != 2 {
		t.Fatalf("want 2 members, got %d", len(members))
	}
}

func TestAddMember_Duplicate(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "dup-owner", "DupOrg", "dup-org", nil)
	// Adding the same user twice should fail (PK conflict).
	err := st.AddMember(ctx, org.ID, "dup-owner", "admin")
	if err == nil {
		t.Error("expected error for duplicate member, got nil")
	}
}

// ── RemoveMember ──────────────────────────────────────────────────────────────

func TestRemoveMember_NonOwner(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "rm-owner", "RmOrg", "rm-org", nil)
	_ = st.AddMember(ctx, org.ID, "rm-member", "member")

	if err := st.RemoveMember(ctx, org.ID, "rm-member"); err != nil {
		t.Fatalf("RemoveMember: %v", err)
	}

	members, _ := st.ListMembers(ctx, org.ID)
	if len(members) != 1 {
		t.Errorf("want 1 member after removal, got %d", len(members))
	}
}

func TestRemoveMember_LastOwnerBlocked(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "lo-owner", "LastOwner", "last-owner", nil)

	err := st.RemoveMember(ctx, org.ID, "lo-owner")
	if err == nil {
		t.Error("expected error when removing last owner, got nil")
	}
	if !strings.Contains(err.Error(), "last owner") {
		t.Errorf("error should mention 'last owner', got %q", err.Error())
	}
}

func TestRemoveMember_OwnerAllowedIfAnotherExists(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "two-owner-1", "TwoOwners", "two-owners", nil)
	_ = st.AddMember(ctx, org.ID, "two-owner-2", "owner")

	if err := st.RemoveMember(ctx, org.ID, "two-owner-1"); err != nil {
		t.Fatalf("should allow removing owner when another exists: %v", err)
	}
}

func TestRemoveMember_NotFound(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "nf-owner", "NFOrg", "nf-org", nil)
	err := st.RemoveMember(ctx, org.ID, "ghost-user")
	if err == nil {
		t.Error("expected error for non-existent member, got nil")
	}
}

// ── UpdateMemberRole ──────────────────────────────────────────────────────────

func TestUpdateMemberRole_Success(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "ur-owner", "UrOrg", "ur-org", nil)
	_ = st.AddMember(ctx, org.ID, "ur-member", "member")

	if err := st.UpdateMemberRole(ctx, org.ID, "ur-member", "admin"); err != nil {
		t.Fatalf("UpdateMemberRole: %v", err)
	}

	members, _ := st.ListMembers(ctx, org.ID)
	for _, m := range members {
		if m.UserID == "ur-member" {
			if m.Role != "admin" {
				t.Errorf("role: want admin, got %q", m.Role)
			}
			return
		}
	}
	t.Error("updated member not found")
}

func TestUpdateMemberRole_DemotingLastOwnerBlocked(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "dlo-owner", "DloOrg", "dlo-org", nil)

	err := st.UpdateMemberRole(ctx, org.ID, "dlo-owner", "member")
	if err == nil {
		t.Error("expected error when demoting last owner, got nil")
	}
	if !strings.Contains(err.Error(), "last owner") {
		t.Errorf("error should mention 'last owner', got %q", err.Error())
	}
}

func TestUpdateMemberRole_OwnerCanBeDemotedIfAnotherOwnerExists(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "two-o-1", "TwoO", "two-o", nil)
	_ = st.AddMember(ctx, org.ID, "two-o-2", "owner")

	if err := st.UpdateMemberRole(ctx, org.ID, "two-o-1", "admin"); err != nil {
		t.Fatalf("should allow demoting owner when another exists: %v", err)
	}
}

func TestUpdateMemberRole_NotFound(t *testing.T) {
	db := newTestDB(t)
	st := orgstore.New(db)
	ctx := context.Background()

	org, _ := st.CreateWithMember(ctx, "ur-nf-owner", "URNFOrg", "ur-nf-org", nil)
	err := st.UpdateMemberRole(ctx, org.ID, "ghost-user", "admin")
	if err == nil {
		t.Error("expected error for non-existent member, got nil")
	}
}
