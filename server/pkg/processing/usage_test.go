package processing

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMarkRecorded_ReturnsBillableMetadataOnce(t *testing.T) {
	t.Parallel()

	ctx := WithRequestMetadata(context.Background(), RequestMetadata{
		OrgID:   "org-1",
		SpaceID: "space-1",
		Class:   UsageClassBillableProduction,
	})

	metadata, ok := MarkRecorded(ctx)
	require.True(t, ok)
	assert.Equal(t, RequestMetadata{
		OrgID:   "org-1",
		SpaceID: "space-1",
		Class:   UsageClassBillableProduction,
	}, metadata)

	metadata, ok = MarkRecorded(ctx)
	assert.False(t, ok)
	assert.Equal(t, RequestMetadata{}, metadata)
}

func TestMarkRecorded_SkipsInternalNonBillableTraffic(t *testing.T) {
	t.Parallel()

	ctx := WithRequestMetadata(context.Background(), RequestMetadata{
		OrgID:   "org-1",
		SpaceID: "space-1",
		Class:   UsageClassInternalNonBillable,
	})

	metadata, ok := MarkRecorded(ctx)
	assert.False(t, ok)
	assert.Equal(t, RequestMetadata{}, metadata)

	metadata, ok = MarkRecorded(ctx)
	assert.False(t, ok)
	assert.Equal(t, RequestMetadata{}, metadata)
}

func TestMarkRecorded_WithoutMetadataReturnsFalse(t *testing.T) {
	t.Parallel()

	metadata, ok := MarkRecorded(context.Background())
	assert.False(t, ok)
	assert.Equal(t, RequestMetadata{}, metadata)
}
