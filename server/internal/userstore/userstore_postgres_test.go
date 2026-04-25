package userstore

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestUserStoreCreate_PostgresDuplicateUsername(t *testing.T) {
	db, cleanup := setupPostgresTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	created, err := store.Create(ctx, "testuser", "testuser", "hashed-password", "user")
	require.NoError(t, err)
	require.NotNil(t, created)

	duplicate, err := store.Create(ctx, "other", "testuser", "hashed-password", "user")
	require.Error(t, err)
	assert.Nil(t, duplicate)
	assert.Contains(t, err.Error(), "username already exists")

	found, findErr := store.GetByUsername(ctx, "testuser")
	require.NoError(t, findErr)
	require.NotNil(t, found)
	assert.Equal(t, created.ID, found.ID)
	assert.Equal(t, "testuser", found.Username)
	assert.Equal(t, "testuser", found.DisplayName)
}

func TestUserStoreUpdateUsername_PostgresDuplicateUsername(t *testing.T) {
	db, cleanup := setupPostgresTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	alpha, err := store.Create(ctx, "alpha", "alpha", "hashed-password", "user")
	require.NoError(t, err)
	require.NotNil(t, alpha)
	_, err = store.Create(ctx, "beta", "beta", "hashed-password", "user")
	require.NoError(t, err)

	err = store.UpdateUsername(ctx, alpha.ID, "beta")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "username already exists")

	found, findErr := store.GetByID(ctx, alpha.ID)
	require.NoError(t, findErr)
	require.NotNil(t, found)
	assert.Equal(t, "alpha", found.Username)
}
