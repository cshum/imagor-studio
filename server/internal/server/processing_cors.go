package server

import (
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"

	"github.com/cshum/imagor-studio/server/internal/middleware"
	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
)

func newProcessingCORSMiddleware(spaceConfigStore sharedprocessing.SpaceConfigReader, appURL, extraOrigins, baseDomain string) func(http.Handler) http.Handler {
	config := middleware.DefaultCORSConfig()
	defaultOrigins := normalizeProcessingAllowedOrigins([]string{originFromAppURL(appURL), extraOrigins})
	normalizedBaseDomain := normalizeProcessingBaseDomain(baseDomain)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := strings.TrimSpace(r.Header.Get("Origin"))
			if origin == "" {
				next.ServeHTTP(w, r)
				return
			}

			allowedOrigins := append([]string{}, defaultOrigins...)
			if spaceConfigStore != nil {
				host := normalizeProcessingRedirectHost(r.Host)
				if cfg, ok := spaceConfigStore.GetByHostname(host); ok && cfg != nil {
					allowedOrigins = append(allowedOrigins, cfg.GetImagorCORSOrigins()...)
				} else if normalizedBaseDomain != "" && strings.HasSuffix(host, normalizedBaseDomain) {
					spaceKey := strings.TrimSuffix(host, normalizedBaseDomain)
					if cfg, ok := spaceConfigStore.Get(spaceKey); ok && cfg != nil {
						allowedOrigins = append(allowedOrigins, cfg.GetImagorCORSOrigins()...)
					}
				}
			}

			allowedOrigins = normalizeProcessingAllowedOrigins(allowedOrigins)
			if !slices.Contains(allowedOrigins, origin) {
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Set("Access-Control-Allow-Origin", origin)
			if config.AllowCredentials {
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Methods", joinHeaderValues(config.AllowedMethods))
				w.Header().Set("Access-Control-Allow-Headers", joinHeaderValues(config.AllowedHeaders))
				if config.MaxAge > 0 {
					w.Header().Set("Access-Control-Max-Age", strconv.Itoa(config.MaxAge))
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func originFromAppURL(appURL string) string {
	trimmed := strings.TrimSpace(appURL)
	if trimmed == "" {
		return ""
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	return parsed.Scheme + "://" + parsed.Host
}

func normalizeProcessingAllowedOrigins(origins []string) []string {
	seen := make(map[string]struct{}, len(origins))
	result := make([]string, 0, len(origins))
	for _, item := range origins {
		for _, origin := range strings.Split(item, ",") {
			normalized := strings.TrimSpace(origin)
			if normalized == "" {
				continue
			}
			if _, ok := seen[normalized]; ok {
				continue
			}
			seen[normalized] = struct{}{}
			result = append(result, normalized)
		}
	}
	return result
}

func joinHeaderValues(values []string) string {
	return strings.Join(values, ", ")
}
