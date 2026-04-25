package server

import (
	"context"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/bootstrap"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type cleanupRecordingStore struct {
	olderThan time.Time
	called    int
	err       error
}

func (s *cleanupRecordingStore) ApplyUsageBatch(context.Context, processing.UsageBatch) (*processing.UsageBatchApplyResult, error) {
	return nil, nil
}

func (s *cleanupRecordingStore) CleanupUsageBatches(_ context.Context, olderThan time.Time) error {
	s.called++
	s.olderThan = olderThan
	return s.err
}

func TestProcessingUsageCleanupLoopConfig(t *testing.T) {
	t.Parallel()

	store := &cleanupRecordingStore{}
	services := &bootstrap.Services{ProcessingUsageStore: store}
	cloudConfig := management.CloudConfig{
		ProcessingUsageBatchCleanupEnabled:   true,
		ProcessingUsageBatchCleanupRetention: 7 * 24 * time.Hour,
		ProcessingUsageBatchCleanupInterval:  24 * time.Hour,
	}

	interval, retention, ok := processingUsageCleanupLoopConfig(services, ModeCloud, cloudConfig)
	require.True(t, ok)
	assert.Equal(t, 24*time.Hour, interval)
	assert.Equal(t, 7*24*time.Hour, retention)

	_, _, ok = processingUsageCleanupLoopConfig(services, ModeSelfHosted, cloudConfig)
	assert.False(t, ok)

	_, _, ok = processingUsageCleanupLoopConfig(&bootstrap.Services{}, ModeCloud, cloudConfig)
	assert.False(t, ok)

	cloudConfig.ProcessingUsageBatchCleanupEnabled = false
	_, _, ok = processingUsageCleanupLoopConfig(services, ModeCloud, cloudConfig)
	assert.False(t, ok)

	cloudConfig.ProcessingUsageBatchCleanupEnabled = true
	cloudConfig.ProcessingUsageBatchCleanupRetention = 0
	_, _, ok = processingUsageCleanupLoopConfig(services, ModeCloud, cloudConfig)
	assert.False(t, ok)

	cloudConfig.ProcessingUsageBatchCleanupRetention = 7 * 24 * time.Hour
	cloudConfig.ProcessingUsageBatchCleanupInterval = -time.Hour
	_, _, ok = processingUsageCleanupLoopConfig(services, ModeCloud, cloudConfig)
	assert.False(t, ok)
}

func TestNewProcessingUsageCleanupSyncFunc(t *testing.T) {
	t.Parallel()

	store := &cleanupRecordingStore{}
	now := time.Date(2026, 4, 26, 18, 0, 0, 0, time.UTC)
	retention := 14 * 24 * time.Hour

	cleanup := newProcessingUsageCleanupSyncFunc(context.Background(), store, retention, func() time.Time {
		return now
	})

	require.NoError(t, cleanup())
	assert.Equal(t, 1, store.called)
	assert.Equal(t, now.Add(-retention), store.olderThan)
}

func TestNewProcessingUsageCleanupSyncFunc_PropagatesStoreError(t *testing.T) {
	t.Parallel()

	store := &cleanupRecordingStore{err: assert.AnError}
	cleanup := newProcessingUsageCleanupSyncFunc(context.Background(), store, time.Hour, func() time.Time {
		return time.Date(2026, 4, 26, 18, 0, 0, 0, time.UTC)
	})

	require.ErrorIs(t, cleanup(), assert.AnError)
	assert.Equal(t, 1, store.called)
}
