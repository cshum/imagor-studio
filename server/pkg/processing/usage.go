package processing

import (
	"context"
	"net"
	"strings"

	"github.com/cshum/imagor"
)

type contextKey string

const requestStateKey contextKey = "processing-usage-request-state"

type RequestMetadata struct {
	OrgID   string
	SpaceID string
	Class   UsageClass
}

type requestState struct {
	metadata RequestMetadata
	recorded bool
}

type UsageRecorder interface {
	RecordProcessed(ctx context.Context)
	Flush(ctx context.Context) error
}

type ProcessorDecorator interface {
	WrapProcessor(next imagor.Processor) imagor.Processor
}

type NodeHooks struct {
	ProcessorDecorator ProcessorDecorator
	UsageRecorder      UsageRecorder
	Processors         []imagor.Processor
}

func WithRequestMetadata(ctx context.Context, metadata RequestMetadata) context.Context {
	return context.WithValue(ctx, requestStateKey, &requestState{metadata: metadata})
}

func RequestMetadataFromContext(ctx context.Context) (RequestMetadata, bool) {
	state, ok := ctx.Value(requestStateKey).(*requestState)
	if !ok || state == nil {
		return RequestMetadata{}, false
	}
	return state.metadata, true
}

func MarkRecorded(ctx context.Context) (RequestMetadata, bool) {
	state, ok := ctx.Value(requestStateKey).(*requestState)
	if !ok || state == nil || state.recorded {
		return RequestMetadata{}, false
	}
	state.recorded = true
	return state.metadata, true
}

func ResolveSpaceFromHost(store SpaceConfigReader, host, baseDomain string) SpaceConfig {
	normalizedHost := normalizeHost(host)
	normalizedBaseDomain := strings.TrimPrefix(strings.TrimSpace(baseDomain), ".")
	if normalizedBaseDomain != "" && strings.HasSuffix(normalizedHost, "."+normalizedBaseDomain) {
		spaceKey := strings.TrimSuffix(normalizedHost, "."+normalizedBaseDomain)
		sc, ok := store.Get(spaceKey)
		if !ok || sc == nil {
			return nil
		}
		return sc
	}
	sc, ok := store.GetByHostname(normalizedHost)
	if !ok || sc == nil {
		return nil
	}
	return sc
}

func normalizeHost(host string) string {
	trimmed := strings.TrimSpace(host)
	if trimmed == "" {
		return ""
	}
	if parsedHost, _, err := net.SplitHostPort(trimmed); err == nil {
		return parsedHost
	}
	return trimmed
}
