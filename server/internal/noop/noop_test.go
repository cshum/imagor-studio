// Package noop_test verifies that all no-op store implementations return errors
// on every call (they must never silently succeed in production).
package noop_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/cloudapi"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/cloudmode"
	"github.com/cshum/imagor-studio/server/internal/noop"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Compile-time: NewOrgStore / NewSpaceStore must satisfy the public interfaces.
var _ cloudcontract.OrgStore = noop.NewOrgStore()
var _ cloudcontract.SpaceStore = noop.NewSpaceStore()
var _ cloudapi.Disabled = noop.NewOrgStore()
var _ cloudapi.Disabled = noop.NewSpaceStore()

var ctx = context.Background()

// ── OrgStore ─────────────────────────────────────────────────────────────────

func TestNoopOrgStore_AllMethodsReturnError(t *testing.T) {
	s := noop.NewOrgStore()

	t.Run("CreateWithMember", func(t *testing.T) {
		_, err := s.CreateWithMember(ctx, "org-name", "user-id", "owner", nil)
		require.Error(t, err, "CreateWithMember must return an error in noop mode")
	})

	t.Run("GetByUserID", func(t *testing.T) {
		_, err := s.GetByUserID(ctx, "user-id")
		require.Error(t, err)
	})

	t.Run("GetBySlug", func(t *testing.T) {
		_, err := s.GetBySlug(ctx, "some-slug")
		require.Error(t, err)
	})
}

// ── SpaceStore ────────────────────────────────────────────────────────────────

func TestNoopSpaceStore_AllMethodsReturnError(t *testing.T) {
	s := noop.NewSpaceStore()

	t.Run("Upsert", func(t *testing.T) {
		// Use a valid DNS-label key so validateSpaceKey passes and reaches the noop check.
		err := s.Upsert(ctx, &cloudcontract.Space{Key: "test"})
		require.Error(t, err, "Upsert must return an error in noop mode")
	})

	t.Run("Get", func(t *testing.T) {
		_, err := s.Get(ctx, "test")
		require.Error(t, err)
	})

	t.Run("List", func(t *testing.T) {
		_, err := s.List(ctx)
		require.Error(t, err)
	})

	t.Run("ListByOrgID", func(t *testing.T) {
		_, err := s.ListByOrgID(ctx, "org-id")
		require.Error(t, err)
	})

	t.Run("SoftDelete", func(t *testing.T) {
		err := s.SoftDelete(ctx, "test")
		require.Error(t, err)
	})

	t.Run("Delta", func(t *testing.T) {
		_, err := s.Delta(ctx, time.Time{})
		require.Error(t, err)
	})
}

// ── Error message consistency ─────────────────────────────────────────────────
// Noop stores should mention the disabled operating mode so operators get a
// clear signal when they accidentally hit a noop store.

func TestNoopOrgStore_ErrorMentionsDisabledMode(t *testing.T) {
	s := noop.NewOrgStore()
	_, err := s.GetByUserID(ctx, "any")
	require.Error(t, err)
	assert.True(t,
		strings.Contains(err.Error(), "embedded") || strings.Contains(err.Error(), "self-hosted"),
		"noop OrgStore error should mention the disabled mode",
	)
}

func TestNoopSpaceStore_ErrorMentionsDisabledMode(t *testing.T) {
	s := noop.NewSpaceStore()
	_, err := s.Get(ctx, "any")
	require.Error(t, err)
	assert.True(t,
		strings.Contains(err.Error(), "embedded") || strings.Contains(err.Error(), "self-hosted"),
		"noop SpaceStore error should mention the disabled mode",
	)
}

func TestNoopStores_ReportCloudDisabled(t *testing.T) {
	assert.True(t, noop.NewOrgStore().CloudDisabled())
	assert.True(t, noop.NewSpaceStore().CloudDisabled())
	assert.True(t, cloudapi.IsDisabled(noop.NewOrgStore()))
	assert.True(t, cloudapi.IsDisabled(noop.NewSpaceStore()))
}

func TestCloudMode_DisabledNoopStoresDisableCloud(t *testing.T) {
	assert.False(t, cloudmode.OrgEnabled(noop.NewOrgStore()))
	assert.False(t, cloudmode.SpaceEnabled(noop.NewSpaceStore()))
	assert.False(t, cloudmode.CloudEnabled(noop.NewOrgStore(), noop.NewSpaceStore()))
	assert.False(t, cloudmode.InviteEnabled(noop.NewOrgStore(), noop.NewSpaceStore(), nil, nil))
}
