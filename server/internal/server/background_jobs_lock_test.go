package server

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/driver/sqliteshim"
	"go.uber.org/zap"
)

func TestNewPostgresAdvisoryLockSyncFunc_NonPostgresPassthrough(t *testing.T) {
	t.Parallel()

	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqldb.Close() })

	db := bun.NewDB(sqldb, sqlitedialect.New())
	t.Cleanup(func() { _ = db.Close() })

	called := 0
	syncFunc := newPostgresAdvisoryLockSyncFunc(context.Background(), db, zap.NewNop(), 123, "test_job", func() error {
		called++
		return nil
	})

	require.NoError(t, syncFunc())
	assert.Equal(t, 1, called)
}

func TestNewPostgresAdvisoryLockSyncFunc_PostgresSkipsWhenLockedElsewhere(t *testing.T) {
	db, dsn := newServerPostgresTestDB(t)
	t.Cleanup(func() { require.NoError(t, db.Close()) })

	ctx := context.Background()
	lockerDB := newServerPostgresLockDB(t, dsn)
	t.Cleanup(func() { require.NoError(t, lockerDB.Close()) })

	_, err := lockerDB.ExecContext(ctx, `SELECT pg_advisory_lock(?)`, processingUsageCleanupAdvisoryLockKey)
	require.NoError(t, err)
	t.Cleanup(func() {
		_, unlockErr := lockerDB.ExecContext(context.Background(), `SELECT pg_advisory_unlock(?)`, processingUsageCleanupAdvisoryLockKey)
		require.NoError(t, unlockErr)
	})

	called := 0
	syncFunc := newPostgresAdvisoryLockSyncFunc(ctx, db, zap.NewNop(), processingUsageCleanupAdvisoryLockKey, "processing_usage_batch_cleanup", func() error {
		called++
		return nil
	})

	require.NoError(t, syncFunc())
	assert.Equal(t, 0, called)

	_, err = lockerDB.ExecContext(ctx, `SELECT pg_advisory_unlock(?)`, processingUsageCleanupAdvisoryLockKey)
	require.NoError(t, err)

	require.NoError(t, syncFunc())
	assert.Equal(t, 1, called)
}

func newServerPostgresTestDB(t *testing.T) (*bun.DB, string) {
	t.Helper()
	if _, err := os.Stat("/var/run/docker.sock"); err != nil {
		t.Skip("docker is not available")
	}

	ctx := context.Background()
	container, err := postgres.Run(ctx, "postgres:16-alpine",
		postgres.WithDatabase("imagor_studio_test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, container.Terminate(context.Background()))
	})

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	return newServerPostgresLockDB(t, dsn), dsn
}

func newServerPostgresLockDB(t *testing.T, dsn string) *bun.DB {
	t.Helper()

	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))
	t.Cleanup(func() { _ = sqldb.Close() })
	require.Eventually(t, func() bool {
		pingCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		return sqldb.PingContext(pingCtx) == nil
	}, 30*time.Second, 250*time.Millisecond)

	return bun.NewDB(sqldb, pgdialect.New())
}
