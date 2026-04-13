package httphandler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/httphandler"
	"github.com/cshum/imagor-studio/server/internal/spacestore"
	"go.uber.org/zap"
)

// ── mock store ───────────────────────────────────────────────────────────────

type mockSpaceStore struct {
	deltaFunc func(ctx context.Context, since time.Time) (*spacestore.DeltaResult, error)
}

func (m *mockSpaceStore) Delta(ctx context.Context, since time.Time) (*spacestore.DeltaResult, error) {
	return m.deltaFunc(ctx, since)
}
func (m *mockSpaceStore) Upsert(ctx context.Context, s *spacestore.Space) error { return nil }
func (m *mockSpaceStore) SoftDelete(ctx context.Context, key string) error      { return nil }
func (m *mockSpaceStore) Get(ctx context.Context, key string) (*spacestore.Space, error) {
	return nil, nil
}
func (m *mockSpaceStore) List(ctx context.Context) ([]*spacestore.Space, error) {
	return nil, nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

func newDeltaHandler(store spacestore.Store, secret string) http.HandlerFunc {
	h := httphandler.NewSpacesDeltaHandler(store, secret, zap.NewNop())
	return h.GetDelta()
}

func fixedDelta(result *spacestore.DeltaResult) func(ctx context.Context, since time.Time) (*spacestore.DeltaResult, error) {
	return func(_ context.Context, _ time.Time) (*spacestore.DeltaResult, error) {
		return result, nil
	}
}

type deltaResp struct {
	Spaces []struct {
		Key             string `json:"key"`
		Bucket          string `json:"bucket"`
		Prefix          string `json:"prefix"`
		Region          string `json:"region"`
		Endpoint        string `json:"endpoint"`
		AccessKeyID     string `json:"access_key_id"`
		SecretKey       string `json:"secret_key"`
		UsePathStyle    bool   `json:"use_path_style"`
		CustomDomain    string `json:"custom_domain"`
		Suspended       bool   `json:"suspended"`
		SignerAlgorithm string `json:"signer_algorithm"`
		SignerTruncate  int    `json:"signer_truncate"`
		ImagorSecret    string `json:"imagor_secret"`
	} `json:"spaces"`
	Deleted    []string `json:"deleted"`
	ServerTime int64    `json:"server_time"`
}

func parseDeltaResp(t *testing.T, body []byte) deltaResp {
	t.Helper()
	var r deltaResp
	if err := json.Unmarshal(body, &r); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	return r
}

// ── tests ────────────────────────────────────────────────────────────────────

func TestSpacesDelta_FullSync_NoAuth(t *testing.T) {
	st := &mockSpaceStore{deltaFunc: fixedDelta(&spacestore.DeltaResult{
		Upserted:   []*spacestore.Space{{Key: "acme", Bucket: "b1", AccessKeyID: "AK", SecretKey: "SK", ImagorSecret: "SEC", SignerAlgorithm: "sha256"}},
		Deleted:    []string{},
		ServerTime: time.Unix(1_000_000, 0),
	})}

	// No apiSecret configured → no auth check
	handler := newDeltaHandler(st, "")
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rr.Code, rr.Body)
	}
	r := parseDeltaResp(t, rr.Body.Bytes())
	if len(r.Spaces) != 1 {
		t.Fatalf("want 1 space, got %d", len(r.Spaces))
	}
	got := r.Spaces[0]
	if got.Key != "acme" {
		t.Errorf("key: want acme got %q", got.Key)
	}
	if got.Bucket != "b1" {
		t.Errorf("bucket: want b1 got %q", got.Bucket)
	}
	if got.AccessKeyID != "AK" {
		t.Errorf("access_key_id: want AK got %q", got.AccessKeyID)
	}
	if got.SecretKey != "SK" {
		t.Errorf("secret_key: want SK got %q", got.SecretKey)
	}
	if got.SignerAlgorithm != "sha256" {
		t.Errorf("signer_algorithm: want sha256 got %q", got.SignerAlgorithm)
	}
	if r.ServerTime != 1_000_000 {
		t.Errorf("server_time: want 1000000 got %d", r.ServerTime)
	}
}

func TestSpacesDelta_BearerToken_Valid(t *testing.T) {
	const secret = "super-secret-token"
	st := &mockSpaceStore{deltaFunc: fixedDelta(&spacestore.DeltaResult{
		ServerTime: time.Now(),
	})}
	handler := newDeltaHandler(st, secret)
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta", nil)
	req.Header.Set("Authorization", "Bearer "+secret)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rr.Code, rr.Body)
	}
}

func TestSpacesDelta_BearerToken_Missing_Returns401(t *testing.T) {
	const secret = "super-secret-token"
	st := &mockSpaceStore{}
	handler := newDeltaHandler(st, secret)
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d: %s", rr.Code, rr.Body)
	}
}

func TestSpacesDelta_BearerToken_Wrong_Returns401(t *testing.T) {
	const secret = "super-secret-token"
	st := &mockSpaceStore{}
	handler := newDeltaHandler(st, secret)
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta", nil)
	req.Header.Set("Authorization", "Bearer wrong-token")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d: %s", rr.Code, rr.Body)
	}
}

func TestSpacesDelta_SinceParam_Propagated(t *testing.T) {
	var capturedSince time.Time
	st := &mockSpaceStore{deltaFunc: func(_ context.Context, since time.Time) (*spacestore.DeltaResult, error) {
		capturedSince = since
		return &spacestore.DeltaResult{ServerTime: time.Now()}, nil
	}}
	handler := newDeltaHandler(st, "")
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta?since=1700000000", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rr.Code)
	}
	if capturedSince.Unix() != 1_700_000_000 {
		t.Errorf("since: want 1700000000 got %d", capturedSince.Unix())
	}
}

func TestSpacesDelta_SinceZero_FullSync(t *testing.T) {
	var capturedSince time.Time
	st := &mockSpaceStore{deltaFunc: func(_ context.Context, since time.Time) (*spacestore.DeltaResult, error) {
		capturedSince = since
		return &spacestore.DeltaResult{ServerTime: time.Now()}, nil
	}}
	handler := newDeltaHandler(st, "")
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta?since=0", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rr.Code)
	}
	if !capturedSince.IsZero() {
		t.Errorf("since=0 should produce zero time, got %v", capturedSince)
	}
}

func TestSpacesDelta_InvalidSince_Returns400(t *testing.T) {
	st := &mockSpaceStore{}
	handler := newDeltaHandler(st, "")
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta?since=notanumber", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d: %s", rr.Code, rr.Body)
	}
}

func TestSpacesDelta_DeletedSpaces(t *testing.T) {
	st := &mockSpaceStore{deltaFunc: fixedDelta(&spacestore.DeltaResult{
		Upserted:   []*spacestore.Space{},
		Deleted:    []string{"old-space", "gone-space"},
		ServerTime: time.Unix(999, 0),
	})}
	handler := newDeltaHandler(st, "")
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rr.Code)
	}
	r := parseDeltaResp(t, rr.Body.Bytes())
	if len(r.Spaces) != 0 {
		t.Errorf("want 0 upserted spaces, got %d", len(r.Spaces))
	}
	if len(r.Deleted) != 2 {
		t.Fatalf("want 2 deleted spaces, got %d", len(r.Deleted))
	}
	if r.Deleted[0] != "old-space" || r.Deleted[1] != "gone-space" {
		t.Errorf("deleted: got %v", r.Deleted)
	}
}

func TestSpacesDelta_WrongMethod_Returns405(t *testing.T) {
	st := &mockSpaceStore{}
	handler := newDeltaHandler(st, "")
	req := httptest.NewRequest(http.MethodPost, "/internal/spaces/delta", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusMethodNotAllowed {
		t.Fatalf("want 405, got %d", rr.Code)
	}
}

func TestSpacesDelta_DefaultSignerAlgorithm(t *testing.T) {
	// SignerAlgorithm="" should be normalised to "sha256" in the response.
	st := &mockSpaceStore{deltaFunc: fixedDelta(&spacestore.DeltaResult{
		Upserted:   []*spacestore.Space{{Key: "x", Bucket: "b", SignerAlgorithm: ""}},
		ServerTime: time.Now(),
	})}
	handler := newDeltaHandler(st, "")
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	r := parseDeltaResp(t, rr.Body.Bytes())
	if r.Spaces[0].SignerAlgorithm != "sha256" {
		t.Errorf("want sha256, got %q", r.Spaces[0].SignerAlgorithm)
	}
}

func TestSpacesDelta_EmptyStore(t *testing.T) {
	st := &mockSpaceStore{deltaFunc: fixedDelta(&spacestore.DeltaResult{
		ServerTime: time.Unix(1234567890, 0),
	})}
	handler := newDeltaHandler(st, "")
	req := httptest.NewRequest(http.MethodGet, "/internal/spaces/delta", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rr.Code)
	}
	r := parseDeltaResp(t, rr.Body.Bytes())
	if r.Spaces == nil {
		t.Error("spaces should be empty array, not null")
	}
	if r.Deleted == nil {
		t.Error("deleted should be empty array, not null")
	}
}
