package middleware

import (
	"net/http"
	"net/url"
	"strings"
)

type frameAncestorsResponseWriter struct {
	http.ResponseWriter
	policy  string
	written bool
}

func (w *frameAncestorsResponseWriter) WriteHeader(statusCode int) {
	w.applyPolicy()
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *frameAncestorsResponseWriter) Write(data []byte) (int, error) {
	w.applyPolicy()
	return w.ResponseWriter.Write(data)
}

func (w *frameAncestorsResponseWriter) applyPolicy() {
	if w.written || w.policy == "" {
		return
	}
	w.written = true

	if existing := strings.TrimSpace(w.Header().Get("Content-Security-Policy")); existing != "" {
		if !strings.Contains(strings.ToLower(existing), "frame-ancestors") {
			w.Header().Set("Content-Security-Policy", existing+"; "+w.policy)
		}
		return
	}

	w.Header().Set("Content-Security-Policy", w.policy)
}

type FrameAncestorsConfig struct {
	AllowedAncestors []string
}

func NewFrameAncestorsConfig(appURL, corsOrigins, explicit string) FrameAncestorsConfig {
	if strings.TrimSpace(explicit) != "" {
		return FrameAncestorsConfig{AllowedAncestors: normalizeFrameAncestors([]string{explicit})}
	}

	allowedAncestors := []string{"'self'"}
	if origin := originFromURL(appURL); origin != "" {
		allowedAncestors = append(allowedAncestors, origin)
	}
	allowedAncestors = append(allowedAncestors, strings.Split(corsOrigins, ",")...)

	return FrameAncestorsConfig{AllowedAncestors: normalizeFrameAncestors(allowedAncestors)}
}

func FrameAncestorsMiddleware(config FrameAncestorsConfig) func(http.Handler) http.Handler {
	policy := buildFrameAncestorsPolicy(config.AllowedAncestors)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			wrapped := &frameAncestorsResponseWriter{
				ResponseWriter: w,
				policy:         policy,
			}

			next.ServeHTTP(wrapped, r)
			wrapped.applyPolicy()
		})
	}
}

func buildFrameAncestorsPolicy(allowedAncestors []string) string {
	if len(allowedAncestors) == 0 {
		return ""
	}

	return "frame-ancestors " + strings.Join(allowedAncestors, " ")
}

func normalizeFrameAncestors(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))

	for _, value := range values {
		for _, part := range strings.Split(value, ",") {
			normalized := strings.TrimSpace(part)
			if normalized == "" || normalized == "*" {
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

func originFromURL(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}

	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}

	return parsed.Scheme + "://" + parsed.Host
}
