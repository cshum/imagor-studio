package server

import (
	"net/http"

	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
)

func newHealthHandler(spaceConfigStore sharedprocessing.SpaceConfigReader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if spaceConfigStore == nil {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"status":"ok"}`))
			return
		}

		if !spaceConfigStore.Ready() {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"status":"syncing"}`))
			return
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}
}
