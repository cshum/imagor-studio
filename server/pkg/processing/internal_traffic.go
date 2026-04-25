package processing

import (
	"crypto/hmac"
	"crypto/sha256"
	"net/http"
	"net/url"
	"strings"

	"github.com/cshum/imagor/imagorpath"
)

const InternalTrafficSignerTruncate = 32

func SignInternalTraffic(canonicalPath, secret string) string {
	if canonicalPath == "" || strings.TrimSpace(secret) == "" {
		return ""
	}

	signer := imagorpath.NewHMACSigner(sha256.New, InternalTrafficSignerTruncate, secret)
	if signer == nil {
		return ""
	}

	return signer.Sign(canonicalPath)
}

func AppendInternalTrafficSignature(rawURL, canonicalPath, secret string) string {
	signature := SignInternalTraffic(canonicalPath, secret)
	if rawURL == "" || signature == "" {
		return rawURL
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}

	query := parsed.Query()
	query.Set(InternalTrafficQueryParam, signature)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func VerifyInternalTrafficRequest(r *http.Request, secret string) bool {
	if r == nil || r.URL == nil {
		return false
	}

	provided := r.URL.Query().Get(InternalTrafficQueryParam)
	if provided == "" {
		return false
	}

	canonicalPath, ok := CanonicalImagorPathFromRequestPath(r.URL.Path)
	if !ok {
		return false
	}

	expected := SignInternalTraffic(canonicalPath, secret)
	if expected == "" {
		return false
	}

	return hmac.Equal([]byte(provided), []byte(expected))
}

func CanonicalImagorPathFromRequestPath(requestPath string) (string, bool) {
	trimmed := strings.TrimPrefix(strings.TrimSpace(requestPath), "/")
	if trimmed == "" {
		return "", false
	}
	trimmed = strings.TrimPrefix(trimmed, "imagor/")

	if strings.HasPrefix(trimmed, "unsafe/") {
		canonical := strings.TrimPrefix(trimmed, "unsafe/")
		return canonical, canonical != ""
	}

	_, canonical, found := strings.Cut(trimmed, "/")
	if !found || canonical == "" {
		return "", false
	}

	return canonical, true
}
