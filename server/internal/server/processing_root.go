package server

import (
	"net"
	"net/http"
	"net/url"
	"strings"

	sharedprocessing "github.com/cshum/imagor-studio/server/pkg/processing"
)

func newProcessingRootHandler(
	imagorHandler http.Handler,
	spaceConfigStore sharedprocessing.SpaceConfigReader,
	appURL string,
	baseDomain string,
	internalAPISecret string,
) http.Handler {
	if imagorHandler == nil {
		return http.NotFoundHandler()
	}

	trimmedAppURL := strings.TrimRight(strings.TrimSpace(appURL), "/")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !shouldRedirectProcessingRootRequest(r) || trimmedAppURL == "" {
			if spaceConfigStore != nil {
				if sc := sharedprocessing.ResolveSpaceFromHost(spaceConfigStore, r.Host, baseDomain); sc != nil {
					usageClass := sharedprocessing.UsageClassBillableProduction
					if sharedprocessing.VerifyInternalTrafficRequest(r, internalAPISecret) {
						usageClass = sharedprocessing.UsageClassInternalNonBillable
					}
					r = r.WithContext(sharedprocessing.WithRequestMetadata(r.Context(), sharedprocessing.RequestMetadata{
						OrgID:   sc.GetOrgID(),
						SpaceID: sc.GetKey(),
						Class:   usageClass,
					}))
				}
			}
			imagorHandler.ServeHTTP(w, r)
			return
		}

		host := normalizeProcessingRedirectHost(r.Host)
		spaceKey := resolveProcessingRedirectSpaceKey(host, normalizeProcessingBaseDomain(baseDomain), spaceConfigStore)
		if spaceKey != "" {
			http.Redirect(w, r, trimmedAppURL+"/spaces/"+url.PathEscape(spaceKey), http.StatusFound)
			return
		}

		http.Redirect(w, r, trimmedAppURL, http.StatusFound)
	})
}
func shouldRedirectProcessingRootRequest(r *http.Request) bool {
	if r == nil {
		return false
	}

	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}

	return r.URL.Path == "" || r.URL.Path == "/"
}

func resolveProcessingRedirectSpaceKey(host, baseDomain string, store sharedprocessing.SpaceConfigReader) string {
	if host == "" || store == nil {
		return ""
	}

	if cfg, ok := store.GetByHostname(host); ok && cfg != nil {
		return cfg.GetKey()
	}

	if baseDomain == "" || !strings.HasSuffix(host, baseDomain) {
		return ""
	}

	spaceKey := strings.TrimSuffix(host, baseDomain)
	if spaceKey == "" {
		return ""
	}

	if cfg, ok := store.Get(spaceKey); ok && cfg != nil {
		return cfg.GetKey()
	}

	return ""
}

func normalizeProcessingBaseDomain(baseDomain string) string {
	baseDomain = strings.ToLower(strings.TrimSpace(baseDomain))
	baseDomain = strings.TrimSuffix(baseDomain, ".")
	if baseDomain == "" {
		return ""
	}
	if !strings.HasPrefix(baseDomain, ".") {
		return "." + baseDomain
	}
	return baseDomain
}

func normalizeProcessingRedirectHost(host string) string {
	host = strings.ToLower(strings.TrimSpace(host))
	host = strings.TrimSuffix(host, ".")
	if host == "" {
		return ""
	}

	if parsedHost, _, err := net.SplitHostPort(host); err == nil {
		return strings.TrimSuffix(parsedHost, ".")
	}

	if strings.Count(host, ":") == 1 {
		if parsedHost, _, found := strings.Cut(host, ":"); found {
			return strings.TrimSuffix(parsedHost, ".")
		}
	}

	return host
}
