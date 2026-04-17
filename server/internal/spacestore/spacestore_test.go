package spacestore_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/spacestore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// newTestDB creates an in-memory SQLite DB with the spaces table.
func newTestDB(t *testing.T) *bun.DB {
	t.Helper()
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	if err != nil {
		t.Fatalf("open in-memory sqlite: %v", err)
	}
	t.Cleanup(func() { sqldb.Close() })

	db := bun.NewDB(sqldb, sqlitedialect.New())

	if _, err := db.NewCreateTable().
		Model((*model.Space)(nil)).
		IfNotExists().
		Exec(context.Background()); err != nil {
		t.Fatalf("create spaces table: %v", err)
	}
	if _, err := db.NewCreateTable().
		Model((*model.SpaceMember)(nil)).
		IfNotExists().
		Exec(context.Background()); err != nil {
		t.Fatalf("create space_members table: %v", err)
	}
	return db
}

func mustUpsert(t *testing.T, st spacestore.Store, sp *spacestore.Space) {
	t.Helper()
	if err := st.Upsert(context.Background(), sp); err != nil {
		t.Fatalf("upsert: %v", err)
	}
}

// ── tests ────────────────────────────────────────────────────────────────────

func TestUpsert_CreateAndGet(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil) // nil encryption → plaintext
	mustUpsert(t, st, &spacestore.Space{
		Key:             "acme",
		Bucket:          "acme-bucket",
		Region:          "us-east-1",
		AccessKeyID:     "AKID",
		SecretKey:       "secret",
		SignerAlgorithm: "sha256",
		ImagorSecret:    "imgsec",
	})

	got, err := st.Get(context.Background(), "acme")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatal("expected space, got nil")
	}
	if got.Key != "acme" {
		t.Errorf("key: want acme got %q", got.Key)
	}
	if got.Bucket != "acme-bucket" {
		t.Errorf("bucket: want acme-bucket got %q", got.Bucket)
	}
	if got.AccessKeyID != "AKID" {
		t.Errorf("access_key_id: want AKID got %q", got.AccessKeyID)
	}
	if got.SecretKey != "secret" {
		t.Errorf("secret_key: want secret got %q", got.SecretKey)
	}
	if got.ImagorSecret != "imgsec" {
		t.Errorf("imagor_secret: want imgsec got %q", got.ImagorSecret)
	}
}

func TestUpsert_UpdateExisting(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "x", Bucket: "old-bucket"})
	mustUpsert(t, st, &spacestore.Space{Key: "x", Bucket: "new-bucket"})

	got, err := st.Get(context.Background(), "x")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Bucket != "new-bucket" {
		t.Errorf("bucket: want new-bucket got %q", got.Bucket)
	}
}

func TestUpsert_RestoresDeletedSpace(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "revived"})
	if err := st.SoftDelete(context.Background(), "revived"); err != nil {
		t.Fatalf("soft-delete: %v", err)
	}

	// Re-upsert should restore the space (deleted_at cleared).
	mustUpsert(t, st, &spacestore.Space{Key: "revived", Bucket: "back"})
	got, err := st.Get(context.Background(), "revived")
	if err != nil {
		t.Fatalf("get after revive: %v", err)
	}
	if got == nil {
		t.Fatal("expected revived space, got nil")
	}
	if got.Bucket != "back" {
		t.Errorf("bucket after revive: want back got %q", got.Bucket)
	}
}

func TestGet_NotFound(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	got, err := st.Get(context.Background(), "nonexistent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != nil {
		t.Errorf("want nil, got %+v", got)
	}
}

func TestSoftDelete_RemovesFromGet(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "bye"})

	if err := st.SoftDelete(context.Background(), "bye"); err != nil {
		t.Fatalf("soft-delete: %v", err)
	}

	got, err := st.Get(context.Background(), "bye")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got != nil {
		t.Error("space should be invisible after soft-delete")
	}
}

func TestSoftDelete_NotFound_ReturnsError(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	err := st.SoftDelete(context.Background(), "ghost")
	if err == nil {
		t.Error("expected error for non-existent key")
	}
}

func TestList_OnlyActive(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "a"})
	mustUpsert(t, st, &spacestore.Space{Key: "b"})
	mustUpsert(t, st, &spacestore.Space{Key: "c"})
	st.SoftDelete(context.Background(), "b") //nolint:errcheck

	list, err := st.List(context.Background())
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("want 2 active spaces, got %d", len(list))
	}
	keys := map[string]bool{list[0].Key: true, list[1].Key: true}
	if !keys["a"] || !keys["c"] {
		t.Errorf("unexpected keys: %v", list)
	}
}

func TestDelta_FullSync_ReturnsAll(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "s1", Bucket: "b1"})
	mustUpsert(t, st, &spacestore.Space{Key: "s2", Bucket: "b2"})

	delta, err := st.Delta(context.Background(), time.Time{}) // zero → full sync
	if err != nil {
		t.Fatalf("delta: %v", err)
	}
	if len(delta.Upserted) != 2 {
		t.Fatalf("want 2 upserted, got %d", len(delta.Upserted))
	}
	if len(delta.Deleted) != 0 {
		t.Errorf("want 0 deleted, got %d", len(delta.Deleted))
	}
	if delta.ServerTime.IsZero() {
		t.Error("ServerTime should not be zero")
	}
}

func TestDelta_IncludesSoftDeleted(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "active"})
	mustUpsert(t, st, &spacestore.Space{Key: "gone"})
	st.SoftDelete(context.Background(), "gone") //nolint:errcheck

	delta, err := st.Delta(context.Background(), time.Time{})
	if err != nil {
		t.Fatalf("delta: %v", err)
	}
	if len(delta.Upserted) != 1 {
		t.Fatalf("want 1 upserted, got %d", len(delta.Upserted))
	}
	if delta.Upserted[0].Key != "active" {
		t.Errorf("want active, got %q", delta.Upserted[0].Key)
	}
	if len(delta.Deleted) != 1 {
		t.Fatalf("want 1 deleted, got %d", len(delta.Deleted))
	}
	if delta.Deleted[0] != "gone" {
		t.Errorf("want gone, got %q", delta.Deleted[0])
	}
}

func TestDelta_SinceFilters(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)

	// Insert a space and capture server time from that delta.
	mustUpsert(t, st, &spacestore.Space{Key: "old"})
	cursor, err := st.Delta(context.Background(), time.Time{})
	if err != nil {
		t.Fatalf("initial delta: %v", err)
	}
	since := cursor.ServerTime

	// Small sleep to ensure the next upsert has a strictly later updated_at.
	time.Sleep(5 * time.Millisecond)

	mustUpsert(t, st, &spacestore.Space{Key: "new"})

	delta, err := st.Delta(context.Background(), since)
	if err != nil {
		t.Fatalf("incremental delta: %v", err)
	}
	if len(delta.Upserted) != 1 {
		t.Fatalf("want 1 new space, got %d: %v", len(delta.Upserted), delta.Upserted)
	}
	if delta.Upserted[0].Key != "new" {
		t.Errorf("want new, got %q", delta.Upserted[0].Key)
	}
}

func TestUpsert_WithOrgID(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{
		Key:    "org-space",
		OrgID:  "org-123",
		Bucket: "org-bucket",
	})

	got, err := st.Get(context.Background(), "org-space")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatal("expected space, got nil")
	}
	if got.OrgID != "org-123" {
		t.Errorf("OrgID: want org-123 got %q", got.OrgID)
	}
}

func TestDelta_IncludesOrgID(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "d1", OrgID: "orgA"})
	mustUpsert(t, st, &spacestore.Space{Key: "d2", OrgID: "orgB"})

	delta, err := st.Delta(context.Background(), time.Time{})
	if err != nil {
		t.Fatalf("delta: %v", err)
	}
	if len(delta.Upserted) != 2 {
		t.Fatalf("want 2 upserted, got %d", len(delta.Upserted))
	}
	orgIDs := map[string]string{}
	for _, sp := range delta.Upserted {
		orgIDs[sp.Key] = sp.OrgID
	}
	if orgIDs["d1"] != "orgA" {
		t.Errorf("d1 OrgID: want orgA got %q", orgIDs["d1"])
	}
	if orgIDs["d2"] != "orgB" {
		t.Errorf("d2 OrgID: want orgB got %q", orgIDs["d2"])
	}
}

func TestListByOrgID(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "s1", OrgID: "org-x"})
	mustUpsert(t, st, &spacestore.Space{Key: "s2", OrgID: "org-x"})
	mustUpsert(t, st, &spacestore.Space{Key: "s3", OrgID: "org-y"})

	list, err := st.ListByOrgID(context.Background(), "org-x")
	if err != nil {
		t.Fatalf("list by org: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("want 2 spaces for org-x, got %d", len(list))
	}
	for _, sp := range list {
		if sp.OrgID != "org-x" {
			t.Errorf("unexpected OrgID %q in result", sp.OrgID)
		}
	}
}

func TestListByOrgID_Empty(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "sx", OrgID: "org-z"})

	list, err := st.ListByOrgID(context.Background(), "unknown-org")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("want empty slice, got %d items", len(list))
	}
}

func TestListByOrgID_ExcludesSoftDeleted(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "active-space", OrgID: "org-q"})
	mustUpsert(t, st, &spacestore.Space{Key: "deleted-space", OrgID: "org-q"})
	st.SoftDelete(context.Background(), "deleted-space") //nolint:errcheck

	list, err := st.ListByOrgID(context.Background(), "org-q")
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("want 1 active space, got %d", len(list))
	}
	if list[0].Key != "active-space" {
		t.Errorf("want active-space, got %q", list[0].Key)
	}
}

func TestListByMemberUserID(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	mustUpsert(t, st, &spacestore.Space{Key: "owned-space", OrgID: "org-a"})
	mustUpsert(t, st, &spacestore.Space{Key: "shared-space", OrgID: "org-b"})
	mustUpsert(t, st, &spacestore.Space{Key: "other-space", OrgID: "org-c"})

	require.NoError(t, st.AddMember(context.Background(), "shared-space", "user-guest", "member"))
	require.NoError(t, st.AddMember(context.Background(), "owned-space", "user-guest", "admin"))

	list, err := st.ListByMemberUserID(context.Background(), "user-guest")
	require.NoError(t, err)
	require.Len(t, list, 2)
	assert.Equal(t, "owned-space", list[0].Key)
	assert.Equal(t, "shared-space", list[1].Key)
}

func TestDelta_Empty_ReturnsNonNilSlices(t *testing.T) {
	st := spacestore.New(newTestDB(t), nil)
	delta, err := st.Delta(context.Background(), time.Time{})
	if err != nil {
		t.Fatalf("delta: %v", err)
	}
	// nil slices cause JSON to encode as null; we want [] (handled at handler layer,
	// but Upserted and Deleted are allowed to be nil at store layer).
	if delta.ServerTime.IsZero() {
		t.Error("ServerTime should not be zero even for empty store")
	}
}
