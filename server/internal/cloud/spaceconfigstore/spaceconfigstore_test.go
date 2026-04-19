package spaceconfigstore

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// -----------------------------------------------------------------------
// Unit tests for applyDelta (white-box, no HTTP server needed)
// -----------------------------------------------------------------------

// newTestStore returns a zero-configuration store suitable for direct
// applyDelta unit tests.  The mu, configs, and byDomain fields are initialised.
func newTestStore() *SpaceConfigStore {
	return &SpaceConfigStore{
		configs:  make(map[string]*SpaceConfig),
		byDomain: make(map[string]*SpaceConfig),
		logger:   zap.NewNop(),
	}
}

func TestApplyDelta_Upsert(t *testing.T) {
	s := newTestStore()

	s.mu.Lock()
	s.applyDelta(&SpacesDeltaResponse{
		Spaces: []*SpaceConfig{
			{Key: "acme", Bucket: "b1", Prefix: "acme/", ImagorSecret: "sec1"},
			{Key: "corp", Bucket: "b2", CustomDomain: "images.corp.com", ImagorSecret: "sec2"},
		},
		ServerTime: 1000,
	})
	s.mu.Unlock()

	assert.Equal(t, 2, s.Len())

	cfg, ok := s.Get("acme")
	require.True(t, ok)
	assert.Equal(t, "acme/", cfg.GetPrefix())
	assert.Equal(t, "sec1", cfg.GetImagorSecret())

	cfg2, ok := s.Get("corp")
	require.True(t, ok)
	assert.Equal(t, "images.corp.com", cfg2.GetCustomDomain())

	cfg3, ok := s.GetByHostname("images.corp.com")
	require.True(t, ok)
	assert.Equal(t, "corp", cfg3.GetKey())

	// lastSync should advance to ServerTime
	assert.Equal(t, int64(1000), s.lastSync.Unix())
}

func TestApplyDelta_Delete(t *testing.T) {
	s := newTestStore()

	// Populate two spaces, one with a custom domain
	s.mu.Lock()
	s.applyDelta(&SpacesDeltaResponse{
		Spaces: []*SpaceConfig{
			{Key: "acme", Bucket: "b", CustomDomain: "images.acme.com"},
			{Key: "corp", Bucket: "b"},
		},
		ServerTime: 100,
	})
	s.mu.Unlock()

	require.Equal(t, 2, s.Len())

	// Delete "acme"
	s.mu.Lock()
	s.applyDelta(&SpacesDeltaResponse{
		Deleted:    []string{"acme"},
		ServerTime: 200,
	})
	s.mu.Unlock()

	assert.Equal(t, 1, s.Len())

	_, ok := s.Get("acme")
	assert.False(t, ok, "deleted space should not be in configs map")

	_, ok = s.GetByHostname("images.acme.com")
	assert.False(t, ok, "deleted space's custom domain should be removed from byDomain map")

	_, ok = s.Get("corp")
	assert.True(t, ok, "unrelated space should still be present")
}

func TestApplyDelta_DomainReassignment(t *testing.T) {
	s := newTestStore()

	// Initial state: "acme" has "old.acme.com"
	s.mu.Lock()
	s.applyDelta(&SpacesDeltaResponse{
		Spaces:     []*SpaceConfig{{Key: "acme", Bucket: "b", CustomDomain: "old.acme.com"}},
		ServerTime: 100,
	})
	s.mu.Unlock()

	_, ok := s.GetByHostname("old.acme.com")
	require.True(t, ok)

	// Update: "acme" changes custom domain to "new.acme.com"
	s.mu.Lock()
	s.applyDelta(&SpacesDeltaResponse{
		Spaces:     []*SpaceConfig{{Key: "acme", Bucket: "b", CustomDomain: "new.acme.com"}},
		ServerTime: 200,
	})
	s.mu.Unlock()

	_, ok = s.GetByHostname("old.acme.com")
	assert.False(t, ok, "old domain should be removed")

	cfg, ok := s.GetByHostname("new.acme.com")
	require.True(t, ok, "new domain should be present")
	assert.Equal(t, "acme", cfg.GetKey())
}

func TestApplyDelta_RemoveCustomDomain(t *testing.T) {
	s := newTestStore()

	// Space starts with a custom domain
	s.mu.Lock()
	s.applyDelta(&SpacesDeltaResponse{
		Spaces:     []*SpaceConfig{{Key: "acme", Bucket: "b", CustomDomain: "images.acme.com"}},
		ServerTime: 100,
	})
	s.mu.Unlock()

	_, ok := s.GetByHostname("images.acme.com")
	require.True(t, ok)

	// Domain removed (custom_domain = "")
	s.mu.Lock()
	s.applyDelta(&SpacesDeltaResponse{
		Spaces:     []*SpaceConfig{{Key: "acme", Bucket: "b", CustomDomain: ""}},
		ServerTime: 200,
	})
	s.mu.Unlock()

	_, ok = s.GetByHostname("images.acme.com")
	assert.False(t, ok, "domain removed when custom_domain becomes empty")
}

func TestApplyDelta_SuspendedFlag(t *testing.T) {
	s := newTestStore()

	s.mu.Lock()
	s.applyDelta(&SpacesDeltaResponse{
		Spaces:     []*SpaceConfig{{Key: "acme", Suspended: true}},
		ServerTime: 100,
	})
	s.mu.Unlock()

	cfg, ok := s.Get("acme")
	require.True(t, ok)
	assert.True(t, cfg.IsSuspended())
}

func TestGet_NotFound(t *testing.T) {
	s := newTestStore()
	_, ok := s.Get("nonexistent")
	assert.False(t, ok)
}

func TestGetByHostname_NotFound(t *testing.T) {
	s := newTestStore()
	_, ok := s.GetByHostname("unknown.example.com")
	assert.False(t, ok)
}

// -----------------------------------------------------------------------
// Integration tests using a mock management HTTP server
// -----------------------------------------------------------------------

// deltaHandler returns an http.HandlerFunc that serves SpacesDeltaResponse
// and records the `since` query params it receives.
type deltaHandler struct {
	mu         sync.Mutex
	sincesSeen []string
	response   SpacesDeltaResponse
}

func (h *deltaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	h.sincesSeen = append(h.sincesSeen, r.URL.Query().Get("since"))
	h.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.response)
}

func (h *deltaHandler) getSinces() []string {
	h.mu.Lock()
	defer h.mu.Unlock()
	cp := make([]string, len(h.sincesSeen))
	copy(cp, h.sincesSeen)
	return cp
}

func TestStart_InitialFullSync(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dh := &deltaHandler{
		response: SpacesDeltaResponse{
			Spaces: []*SpaceConfig{
				{Key: "acme", Bucket: "b", Prefix: "acme/"},
				{Key: "corp", Bucket: "b", CustomDomain: "images.corp.com"},
			},
			ServerTime: 999999,
		},
	}
	ts := httptest.NewServer(dh)
	defer ts.Close()

	logger := zap.NewNop()
	store := New(ts.URL, "test-secret", logger,
		WithHTTPClient(ts.Client()),
		WithSyncInterval(10*time.Second), // long interval — we only want the initial sync
	)

	err := store.Start(ctx)
	require.NoError(t, err)

	// Initial full sync sends since=0
	sinces := dh.getSinces()
	require.GreaterOrEqual(t, len(sinces), 1)
	assert.Equal(t, "0", sinces[0])

	// Spaces are populated
	assert.Equal(t, 2, store.Len())

	cfg, ok := store.Get("acme")
	require.True(t, ok)
	assert.Equal(t, "acme/", cfg.GetPrefix())

	cfg2, ok := store.GetByHostname("images.corp.com")
	require.True(t, ok)
	assert.Equal(t, "corp", cfg2.GetKey())
}

func TestStart_BearerTokenSent(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var receivedAuth string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(SpacesDeltaResponse{ServerTime: 1})
	}))
	defer ts.Close()

	store := New(ts.URL, "my-api-secret", zap.NewNop(), WithHTTPClient(ts.Client()))
	err := store.Start(ctx)
	require.NoError(t, err)

	assert.Equal(t, "Bearer my-api-secret", receivedAuth)
}

func TestStart_SincePropagates(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dh := &deltaHandler{
		response: SpacesDeltaResponse{ServerTime: 777777},
	}
	ts := httptest.NewServer(dh)
	defer ts.Close()

	store := New(ts.URL, "secret", zap.NewNop(),
		WithHTTPClient(ts.Client()),
		WithSyncInterval(50*time.Millisecond), // fast — trigger a second poll quickly
	)

	err := store.Start(ctx)
	require.NoError(t, err)

	// Wait for at least one background poll after the initial sync
	require.Eventually(t, func() bool {
		return len(dh.getSinces()) >= 2
	}, 500*time.Millisecond, 10*time.Millisecond)

	sinces := dh.getSinces()
	assert.Equal(t, "0", sinces[0], "initial sync should use since=0")
	assert.Equal(t, "777777", sinces[1], "background sync should use ServerTime from previous response")
}

func TestStart_ServerError_ReturnsError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer ts.Close()

	store := New(ts.URL, "secret", zap.NewNop(), WithHTTPClient(ts.Client()))
	err := store.Start(context.Background())

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "HTTP 500")
}

func TestStart_CancelStopsBackground(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	callCount := 0
	var mu sync.Mutex
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		callCount++
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(SpacesDeltaResponse{ServerTime: 1})
	}))
	defer ts.Close()

	store := New(ts.URL, "secret", zap.NewNop(),
		WithHTTPClient(ts.Client()),
		WithSyncInterval(20*time.Millisecond),
	)

	err := store.Start(ctx)
	require.NoError(t, err)

	// Let a couple of polls happen
	time.Sleep(60 * time.Millisecond)

	// Cancel and record count
	cancel()
	time.Sleep(60 * time.Millisecond)

	mu.Lock()
	countAfterCancel := callCount
	mu.Unlock()

	// No more polls should happen after cancel
	time.Sleep(60 * time.Millisecond)

	mu.Lock()
	countFinal := callCount
	mu.Unlock()

	assert.Equal(t, countAfterCancel, countFinal, "no polls should occur after context is cancelled")
}
