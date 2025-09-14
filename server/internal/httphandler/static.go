package httphandler

import (
	"io"
	"io/fs"
	"net/http"
	"path/filepath"
	"strings"

	"go.uber.org/zap"
)

// SPAHandler creates a handler for serving static files with SPA fallback
func SPAHandler(staticFS fs.FS, logger *zap.Logger) http.Handler {
	fileServer := http.FileServer(http.FS(staticFS))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		if _, err := staticFS.Open(path); err != nil {
			// File doesn't exist, check if it's a SPA route (no extension)
			if !strings.Contains(filepath.Base(r.URL.Path), ".") {
				// Serve index.html directly for SPA routes
				indexFile, err := staticFS.Open("index.html")
				if err != nil {
					logger.Error("Failed to open index.html for SPA route",
						zap.String("path", r.URL.Path),
						zap.Error(err))
					http.NotFound(w, r)
					return
				}
				defer indexFile.Close()

				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				if _, err := io.Copy(w, indexFile); err != nil {
					logger.Error("Failed to serve index.html", zap.Error(err))
				}
				return
			}
		}
		fileServer.ServeHTTP(w, r)
	})
}
