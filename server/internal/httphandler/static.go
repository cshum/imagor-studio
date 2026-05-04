package httphandler

import (
	"bytes"
	"encoding/json"
	"io"
	"io/fs"
	"net/http"
	"regexp"
	"strings"

	"go.uber.org/zap"
)

const (
	spaDocumentCacheControl = "no-cache, no-store, must-revalidate"
	staticAssetCacheControl = "public, max-age=31536000, immutable"
	htmlBootstrapTarget     = "</head>"
)

type AppBootstrap struct {
	AuthProviders []string `json:"authProviders,omitempty"`
}

func (b AppBootstrap) enabled() bool {
	return len(b.AuthProviders) > 0
}

// imagorPathRegex matches imagor-style paths using the same logic as imagorpath package
var imagorPathRegex = regexp.MustCompile(
	"^/*" +
		// hash: either "unsafe/" or base64 URL-safe hash with min 17 chars
		"((unsafe/)|([A-Za-z0-9-_=]{17,})/)?" +
		// path (required for imagor)
		"(.+)",
)

// isImagorPath determines if a request path should be handled by imagor
func isImagorPath(path string) bool {
	// Skip empty paths and known studio routes
	if path == "" || path == "/" {
		return false
	}

	// Skip known studio API routes
	if strings.HasPrefix(path, "/api/") ||
		strings.HasPrefix(path, "/health") ||
		strings.HasPrefix(path, "/imagor/") { // Keep existing /imagor/ route separate
		return false
	}

	// Check if path matches imagor pattern
	matches := imagorPathRegex.FindStringSubmatch(path)
	if len(matches) < 5 {
		return false
	}

	// Check if we have either unsafe or a valid hash
	hasUnsafe := matches[2] == "unsafe/"
	hasValidHash := matches[3] != "" && len(matches[3]) >= 17 &&
		matches[3] != "adaptive-full-fit-in" && isValidBase64URLHash(matches[3])
	hasImagePath := matches[4] != ""

	// Must have either unsafe or valid hash, and must have an image path
	return (hasUnsafe || hasValidHash) && hasImagePath
}

// isValidBase64URLHash checks if a string contains only valid base64 URL-safe characters
func isValidBase64URLHash(hash string) bool {
	// Base64 URL-safe characters: A-Z, a-z, 0-9, -, _
	// May end with = for padding
	for _, char := range hash {
		if !((char >= 'A' && char <= 'Z') ||
			(char >= 'a' && char <= 'z') ||
			(char >= '0' && char <= '9') ||
			char == '-' || char == '_' || char == '=') {
			return false
		}
	}
	return true
}

func setStaticCacheHeaders(w http.ResponseWriter, path string) {
	if path == "index.html" || strings.HasSuffix(path, ".html") {
		w.Header().Set("Cache-Control", spaDocumentCacheControl)
		return
	}

	w.Header().Set("Cache-Control", staticAssetCacheControl)
}

func serveHTMLDocument(w http.ResponseWriter, staticFS fs.FS, path string, bootstrap AppBootstrap, logger *zap.Logger) bool {
	htmlFile, err := staticFS.Open(path)
	if err != nil {
		return false
	}
	defer htmlFile.Close()

	body, err := io.ReadAll(htmlFile)
	if err != nil {
		if logger != nil {
			logger.Error("Failed to read HTML document", zap.String("path", path), zap.Error(err))
		}
		http.NotFound(w, nil)
		return true
	}

	if bootstrap.enabled() {
		payload, err := json.Marshal(bootstrap)
		if err == nil {
			payload = bytes.ReplaceAll(payload, []byte("<"), []byte(`\u003c`))
			payload = bytes.ReplaceAll(payload, []byte(">"), []byte(`\u003e`))
			payload = bytes.ReplaceAll(payload, []byte("&"), []byte(`\u0026`))
			injection := []byte("<script>window.__IMAGOR_STUDIO_BOOTSTRAP__ = " + string(payload) + ";</script>")
			if idx := bytes.Index(bytes.ToLower(body), []byte(htmlBootstrapTarget)); idx >= 0 {
				body = append(body[:idx], append(injection, body[idx:]...)...)
			} else {
				body = append(body, injection...)
			}
		} else if logger != nil {
			logger.Warn("Failed to marshal HTML bootstrap payload", zap.Error(err))
		}
	}

	setStaticCacheHeaders(w, path)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(body)
	return true
}

// SPAHandler creates a handler for serving static files with SPA fallback and imagor routing.
// imagorHandler is an http.Handler whose ServeHTTP is called for imagor-style paths;
// pass nil when no imagor instance is available.
func SPAHandler(staticFS fs.FS, imagorHandler http.Handler, logger *zap.Logger, bootstrap AppBootstrap) http.Handler {
	fileServer := http.FileServer(http.FS(staticFS))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Check if this looks like an imagor request
		if isImagorPath(path) {
			if imagorHandler != nil {
				logger.Debug("Routing to imagor handler", zap.String("path", path))
				imagorHandler.ServeHTTP(w, r)
				return
			}
			// If no imagor handler available, fall through to 404
			logger.Debug("Imagor handler not available for path", zap.String("path", path))
			http.NotFound(w, r)
			return
		}

		// Handle static files and SPA routing
		trimmedPath := strings.TrimPrefix(path, "/")
		if trimmedPath == "" {
			trimmedPath = "index.html"
		}

		if _, err := staticFS.Open(trimmedPath); err != nil {
			// File doesn't exist, serve index.html for SPA routes
			if !serveHTMLDocument(w, staticFS, "index.html", bootstrap, logger) {
				if logger != nil {
					logger.Error("Failed to open index.html for SPA route",
						zap.String("path", path),
						zap.Error(err))
				}
				http.NotFound(w, r)
			}
			return
		}

		if trimmedPath == "index.html" || strings.HasSuffix(trimmedPath, ".html") {
			if !serveHTMLDocument(w, staticFS, trimmedPath, bootstrap, logger) {
				http.NotFound(w, r)
			}
			return
		}

		setStaticCacheHeaders(w, trimmedPath)
		fileServer.ServeHTTP(w, r)
	})
}
