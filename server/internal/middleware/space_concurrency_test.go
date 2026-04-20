package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/cshum/imagor-studio/server/internal/middleware"
)

func okHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

// TestSpaceConcurrencyMiddleware_AllowsUnderLimit verifies that requests below
// the per-space limit pass through to the next handler with HTTP 200.
func TestSpaceConcurrencyMiddleware_AllowsUnderLimit(t *testing.T) {
	store := newTestSpaceConfigStore(&testSpaceConfig{Key: "acme"})
	mid := middleware.SpaceConcurrencyMiddleware(store, "imagor.app", 3)
	handler := mid(http.HandlerFunc(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/unsafe/photo.jpg", nil)
	req.Host = "acme.imagor.app"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
}

// TestSpaceConcurrencyMiddleware_BlocksAtLimit verifies that when maxPerSpace
// concurrent requests are in-flight, the next request gets HTTP 429.
func TestSpaceConcurrencyMiddleware_BlocksAtLimit(t *testing.T) {
	store := newTestSpaceConfigStore(&testSpaceConfig{Key: "acme"})
	const maxPerSpace = 2
	mid := middleware.SpaceConcurrencyMiddleware(store, "imagor.app", maxPerSpace)

	// A handler that blocks until released so we can hold slots open.
	release := make(chan struct{})
	var inFlight atomic.Int64
	blocker := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		inFlight.Add(1)
		<-release
		w.WriteHeader(http.StatusOK)
	})
	handler := mid(blocker)

	var started sync.WaitGroup
	started.Add(maxPerSpace)
	for i := 0; i < maxPerSpace; i++ {
		go func() {
			req := httptest.NewRequest(http.MethodGet, "/unsafe/photo.jpg", nil)
			req.Host = "acme.imagor.app"
			rr := httptest.NewRecorder()
			// Signal we're about to enter the handler, then serve.
			started.Done()
			handler.ServeHTTP(rr, req)
		}()
	}
	// Wait until both goroutines are inside the blocker handler.
	started.Wait()
	// Spin until both slots are confirmed in-flight.
	for inFlight.Load() < maxPerSpace {
		// tight wait — usually takes < 1µs
	}

	// Now the limit is full — next request should get 429.
	req := httptest.NewRequest(http.MethodGet, "/unsafe/photo.jpg", nil)
	req.Host = "acme.imagor.app"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rr.Code)
	}

	// Release held slots.
	close(release)
}

// TestSpaceConcurrencyMiddleware_SeparateCountersPerSpace verifies that two
// spaces do not share the same counter — acme being at limit does not block
// widget-corp.
func TestSpaceConcurrencyMiddleware_SeparateCountersPerSpace(t *testing.T) {
	store := newTestSpaceConfigStore(
		&testSpaceConfig{Key: "acme"},
		&testSpaceConfig{Key: "widget-corp"},
	)
	const maxPerSpace = 1
	mid := middleware.SpaceConcurrencyMiddleware(store, "imagor.app", maxPerSpace)

	release := make(chan struct{})
	var inFlight atomic.Int64
	blocker := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		inFlight.Add(1)
		<-release
		w.WriteHeader(http.StatusOK)
	})
	handler := mid(blocker)

	// Fill acme's slot.
	var started sync.WaitGroup
	started.Add(1)
	go func() {
		req := httptest.NewRequest(http.MethodGet, "/unsafe/photo.jpg", nil)
		req.Host = "acme.imagor.app"
		rr := httptest.NewRecorder()
		started.Done()
		handler.ServeHTTP(rr, req)
	}()
	started.Wait()
	for inFlight.Load() < 1 {
		// spin
	}

	// widget-corp should still be allowed through (different counter).
	req := httptest.NewRequest(http.MethodGet, "/unsafe/photo.jpg", nil)
	req.Host = "widget-corp.imagor.app"
	rr := httptest.NewRecorder()
	// widget-corp request would also block — run synchronously is fine as long
	// as the blocker releases after the assertion.
	go handler.ServeHTTP(rr, req)

	// Give goroutine time to enter the handler.
	for inFlight.Load() < 2 {
		// spin
	}

	// acme is also at limit — a third acme request should be 429.
	req2 := httptest.NewRequest(http.MethodGet, "/unsafe/photo.jpg", nil)
	req2.Host = "acme.imagor.app"
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected acme to be limited (429), got %d", rr2.Code)
	}

	close(release)
}

// TestSpaceConcurrencyMiddleware_UnknownSpacePassesThrough verifies that a
// request for an unrecognised domain (not in SpaceConfigStore) is passed to
// the next handler, not rejected by the middleware.
func TestSpaceConcurrencyMiddleware_UnknownSpacePassesThrough(t *testing.T) {
	store := newTestSpaceConfigStore() // empty store
	mid := middleware.SpaceConcurrencyMiddleware(store, "imagor.app", 1)
	var called bool
	handler := mid(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/unsafe/photo.jpg", nil)
	req.Host = "nonexistent.imagor.app"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if !called {
		t.Fatal("expected next handler to be called for unknown space")
	}
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
}

// TestSpaceConcurrencyMiddleware_CustomDomain verifies that spaces registered
// with a custom domain (not subdomain) are resolved correctly.
func TestSpaceConcurrencyMiddleware_CustomDomain(t *testing.T) {
	store := newTestSpaceConfigStore(&testSpaceConfig{
		Key:          "acme",
		CustomDomain: "images.acme.com",
	})
	mid := middleware.SpaceConcurrencyMiddleware(store, "imagor.app", 3)
	handler := mid(http.HandlerFunc(okHandler))

	req := httptest.NewRequest(http.MethodGet, "/unsafe/photo.jpg", nil)
	req.Host = "images.acme.com"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for custom domain, got %d", rr.Code)
	}
}

// TestSpaceConcurrencyMiddleware_Disabled verifies that maxPerSpace=0 disables
// the middleware entirely — all requests pass through regardless of volume.
func TestSpaceConcurrencyMiddleware_Disabled(t *testing.T) {
	store := newTestSpaceConfigStore(&testSpaceConfig{Key: "acme"})
	mid := middleware.SpaceConcurrencyMiddleware(store, "imagor.app", 0)
	var count atomic.Int64
	handler := mid(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count.Add(1)
		w.WriteHeader(http.StatusOK)
	}))

	const n = 100
	var wg sync.WaitGroup
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func() {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodGet, "/unsafe/photo.jpg", nil)
			req.Host = "acme.imagor.app"
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)
			if rr.Code != http.StatusOK {
				t.Errorf("expected 200, got %d", rr.Code)
			}
		}()
	}
	wg.Wait()
	if count.Load() != n {
		t.Fatalf("expected %d calls, got %d", n, count.Load())
	}
}
