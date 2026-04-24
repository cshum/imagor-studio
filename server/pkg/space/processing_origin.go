package space

import (
	"context"
	"strings"
)

// ProcessingOriginResolver returns the absolute processing origin to use for a
// space's imagor URLs. An empty string means the caller should keep URLs
// relative to the current management origin.
type ProcessingOriginResolver interface {
	ResolveProcessingOrigin(ctx context.Context, spaceKey string) string
}

type ProcessingOriginResolverFunc func(ctx context.Context, spaceKey string) string

func (f ProcessingOriginResolverFunc) ResolveProcessingOrigin(ctx context.Context, spaceKey string) string {
	return f(ctx, spaceKey)
}

// NewCustomDomainProcessingOriginResolver returns a resolver that only emits a
// processing origin for spaces with a verified custom domain.
func NewCustomDomainProcessingOriginResolver(spaceStore SpaceStore) ProcessingOriginResolver {
	return ProcessingOriginResolverFunc(func(ctx context.Context, spaceKey string) string {
		if spaceStore == nil {
			return ""
		}

		key := strings.TrimSpace(spaceKey)
		if key == "" {
			return ""
		}

		spaceConfig, err := spaceStore.GetByKey(ctx, key)
		if err != nil || spaceConfig == nil || !spaceConfig.CustomDomainVerified {
			return ""
		}

		customDomain := strings.TrimSpace(spaceConfig.CustomDomain)
		if customDomain == "" {
			return ""
		}

		return NormalizeOrigin(customDomain)
	})
}

func NormalizeOrigin(base string) string {
	trimmed := strings.TrimSpace(base)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.TrimRight(trimmed, "/")
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	return "https://" + trimmed
}
