package orgstore_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// newTestDB creates an in-memory SQLite DB with the organizations + org_members + users tables.
func newTestDB(t *testing.T) *bun.DB {
	t.Helper()
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	if err != nil {
		t.Fatalf("open in-memory sqlite: %v", err)
	}
	t.Cleanup(func() { _ = sqldb.Close() })

	db := bun.NewDB(sqldb, sqlitedialect.New())

	if _, err := db.NewCreateTable().
		Model((*model.Organization)(nil)).
		IfNotExists().
		Exec(context.Background()); err != nil {
		t.Fatalf("create organizations table: %v", err)
	}
	if _, err := db.NewCreateTable().
		Model((*model.OrgMember)(nil)).
		IfNotExists().
		Exec(context.Background()); err != nil {
		t.Fatalf("create org_members table: %v", err)
	}
	// Minimal users table for JOIN in ListMembers (includes display_name for the COALESCE fallback).
	if _, err := db.ExecContext(context.Background(),
		`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, display_name TEXT)`); err != nil {
		t.Fatalf("create users table: %v", err)
	}
	return db
}

// insertTestUser inserts a minimal user row so ListMembers JOIN succeeds.
func insertTestUser(t *testing.T, db *bun.DB, id, username string) {
	t.Helper()
	if _, err := db.ExecContext(context.Background(),
		`INSERT INTO users (id, username) VALUES (?, ?)`, id, username); err != nil {
		t.Fatalf("insert test user %s: %v", id, err)
	}
}

func trialEnd(d time.Duration) *time.Time {
	t := time.Now().Add(d)
	return &t
}

// ── tests ────────────────────────────────────────────────────────────────────

func TestCreateWithMember_AndGetByUserID(t *testing.T) {
	st := orgstore.New(newTestDB(t))
	ctx := context.Background()

	got, err := st.CreateWithMember(ctx, "user-1", "Acme Corp", "acme", trialEnd(14*24*time.Hour))
	if err != nil {
		t.Fatalf("CreateWithMember: %v", err)
	}

	if got.ID == "" {
		t.Error("ID should be set")
	}
	if got.OwnerID != "user-1" {
		t.Errorf("OwnerID: want user-1 got %q", got.OwnerID)
	}
	if got.Slug != "acme" {
		t.Errorf("Slug: want acme got %q", got.Slug)
	}
	if got.Plan != model.PlanTrial {
		t.Errorf("Plan: want trial got %q", got.Plan)
	}
	if got.PlanStatus != model.PlanStatusTrialing {
		t.Errorf("PlanStatus: want trialing got %q", got.PlanStatus)
	}
	if got.TrialEndsAt == nil {
		t.Error("TrialEndsAt should not be nil")
	}

	// GetByUserID should return the same org.
	org, err := st.GetByUserID(ctx, "user-1")
	if err != nil {
		t.Fatalf("GetByUserID: %v", err)
	}
	if org == nil {
		t.Fatal("GetByUserID: expected org, got nil")
	}
	if org.ID != got.ID {
		t.Errorf("ID mismatch: want %q got %q", got.ID, org.ID)
	}
	if org.Slug != "acme" {
		t.Errorf("Slug: want acme got %q", org.Slug)
	}
}

func TestGetByUserID_NotFound(t *testing.T) {
	st := orgstore.New(newTestDB(t))
	org, err := st.GetByUserID(context.Background(), "nobody")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if org != nil {
		t.Errorf("want nil, got %+v", org)
	}
}

func TestGetBySlug(t *testing.T) {
	st := orgstore.New(newTestDB(t))
	ctx := context.Background()

	created, err := st.CreateWithMember(ctx, "user-2", "Widget Corp", "widget-corp", nil)
	if err != nil {
		t.Fatalf("CreateWithMember: %v", err)
	}

	got, err := st.GetBySlug(ctx, "widget-corp")
	if err != nil {
		t.Fatalf("GetBySlug: %v", err)
	}
	if got == nil {
		t.Fatal("expected org, got nil")
	}
	if got.ID != created.ID {
		t.Errorf("ID mismatch: want %q got %q", created.ID, got.ID)
	}
}

func TestGetBySlug_NotFound(t *testing.T) {
	st := orgstore.New(newTestDB(t))
	got, err := st.GetBySlug(context.Background(), "does-not-exist")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != nil {
		t.Errorf("want nil, got %+v", got)
	}
}

func TestCreateWithMember_MultipleOrgs_IsolatedLookups(t *testing.T) {
	st := orgstore.New(newTestDB(t))
	ctx := context.Background()

	org1, err := st.CreateWithMember(ctx, "user-10", "Alpha", "alpha", nil)
	if err != nil {
		t.Fatalf("create alpha: %v", err)
	}
	org2, err := st.CreateWithMember(ctx, "user-11", "Beta", "beta", nil)
	if err != nil {
		t.Fatalf("create beta: %v", err)
	}

	got1, err := st.GetByUserID(ctx, "user-10")
	if err != nil || got1 == nil || got1.ID != org1.ID {
		t.Errorf("user-10 should get org1: %v %v", err, got1)
	}
	got2, err := st.GetByUserID(ctx, "user-11")
	if err != nil || got2 == nil || got2.ID != org2.ID {
		t.Errorf("user-11 should get org2: %v %v", err, got2)
	}
}

func TestCreateWithMember_NilTrialEndsAt(t *testing.T) {
	st := orgstore.New(newTestDB(t))
	ctx := context.Background()

	got, err := st.CreateWithMember(ctx, "user-5", "Nil Trial Corp", "nil-trial", nil)
	if err != nil {
		t.Fatalf("CreateWithMember: %v", err)
	}
	if got.TrialEndsAt != nil {
		t.Errorf("TrialEndsAt should be nil when not provided, got %v", got.TrialEndsAt)
	}

	// GetByUserID should also preserve nil TrialEndsAt.
	org, err := st.GetByUserID(ctx, "user-5")
	if err != nil {
		t.Fatalf("GetByUserID: %v", err)
	}
	if org == nil {
		t.Fatal("expected org, got nil")
	}
	if org.TrialEndsAt != nil {
		t.Errorf("TrialEndsAt should be nil after round-trip, got %v", org.TrialEndsAt)
	}
	// Also verify Name round-trips correctly.
	if org.Name != "Nil Trial Corp" {
		t.Errorf("Name: want %q got %q", "Nil Trial Corp", org.Name)
	}
}

func TestCreateWithMember_DuplicateSlug(t *testing.T) {
	st := orgstore.New(newTestDB(t))
	ctx := context.Background()

	_, err := st.CreateWithMember(ctx, "user-20", "First", "dup-slug", nil)
	if err != nil {
		t.Fatalf("first CreateWithMember: %v", err)
	}
	// Second org with same slug should fail (UNIQUE constraint).
	_, err = st.CreateWithMember(ctx, "user-21", "Second", "dup-slug", nil)
	if err == nil {
		t.Error("expected error for duplicate slug, got nil")
	}
}

func TestCreateWithMember_VerifiesName(t *testing.T) {
	st := orgstore.New(newTestDB(t))
	ctx := context.Background()

	_, err := st.CreateWithMember(ctx, "user-30", "Verified Name Corp", "verified-name", nil)
	if err != nil {
		t.Fatalf("CreateWithMember: %v", err)
	}

	org, err := st.GetByUserID(ctx, "user-30")
	if err != nil {
		t.Fatalf("GetByUserID: %v", err)
	}
	if org.Name != "Verified Name Corp" {
		t.Errorf("Name: want %q got %q", "Verified Name Corp", org.Name)
	}
	if org.OwnerID != "user-30" {
		t.Errorf("OwnerID: want user-30 got %q", org.OwnerID)
	}
}

func TestPlanLimits(t *testing.T) {
	tests := []struct {
		plan      string
		wantSpace int
	}{
		{model.PlanTrial, 1},
		{model.PlanEarlyBird, 3},
		{model.PlanStarter, 5},
		{model.PlanPro, 20},
		{model.PlanEnterprise, -1},
		{"unknown", 1}, // unknown falls back to trial
	}
	for _, tt := range tests {
		limits := model.GetLimits(tt.plan)
		if limits.MaxSpaces != tt.wantSpace {
			t.Errorf("plan %q: MaxSpaces want %d got %d", tt.plan, tt.wantSpace, limits.MaxSpaces)
		}
	}
}
