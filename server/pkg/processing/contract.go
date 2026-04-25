package processing

import (
	"context"
	"time"

	"github.com/cshum/imagor"
	"go.uber.org/zap"
)

type RuntimeConfig struct {
	SpacesEndpoint            string
	InternalAPISecret         string
	SpaceBaseDomain           string
	S3HTTPMaxIdleConnsPerHost int
}

type NodeConfig struct {
	Runtime RuntimeConfig
}

type SpaceConfig interface {
	GetOrgID() string
	GetKey() string
	GetPrefix() string
	GetBucket() string
	GetRegion() string
	GetEndpoint() string
	GetAccessKeyID() string
	GetSecretKey() string
	GetUsePathStyle() bool
	GetCustomDomain() string
	IsSuspended() bool
	GetSignerAlgorithm() string
	GetSignerTruncate() int
	GetImagorSecret() string
	GetImagorCORSOrigins() []string
}

const (
	// InternalTemplatePreviewRenderPath is the private processing endpoint path
	// management calls for synchronous template preview renders.
	InternalTemplatePreviewRenderPath = "/internal/template-renders/preview"

	// InternalProcessingUsageBatchesPath is the private management endpoint path
	// processing nodes call to flush aggregated usage deltas.
	InternalProcessingUsageBatchesPath = "/internal/processing/usage-batches"

	// InternalAPISecretHeader carries the shared secret for internal management
	// to processing and processing to management requests.
	InternalAPISecretHeader = "X-Internal-API-Secret"

	// InternalTrafficQueryParam marks internally generated preview/browse traffic
	// so processing usage can classify it as non-billable.
	InternalTrafficQueryParam = "it"
)

type UsageClass string

const (
	UsageClassBillableProduction  UsageClass = "billable_production"
	UsageClassInternalNonBillable UsageClass = "internal_non_billable"
)

type UsageBatch struct {
	NodeID  string           `json:"node_id"`
	BatchID string           `json:"batch_id"`
	SentAt  time.Time        `json:"sent_at"`
	Items   []UsageBatchItem `json:"items"`
}

type UsageBatchItem struct {
	OrgID          string    `json:"org_id"`
	SpaceID        string    `json:"space_id"`
	BucketStartAt  time.Time `json:"bucket_start_at"`
	ProcessedCount int64     `json:"processed_count"`
}

type UsageBatchApplyResult struct {
	Accepted       bool   `json:"accepted"`
	BatchID        string `json:"batch_id"`
	AlreadyApplied bool   `json:"already_applied"`
}

type SpaceConfigReader interface {
	Get(key string) (SpaceConfig, bool)
	GetByHostname(hostname string) (SpaceConfig, bool)
	Start(ctx context.Context) error
	Ready() bool
}

type RuntimeFactory = func(runtimeCfg RuntimeConfig, logger *zap.Logger) (SpaceConfigReader, imagor.Loader, error)
