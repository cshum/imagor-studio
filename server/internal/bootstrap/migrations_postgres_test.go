package bootstrap

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"go.uber.org/zap"
)

func newBootstrapPostgresTestDB(t *testing.T) (*bun.DB, string) {
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

	sqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))
	t.Cleanup(func() { _ = sqldb.Close() })
	require.Eventually(t, func() bool {
		pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		return sqldb.PingContext(pingCtx) == nil
	}, 30*time.Second, 250*time.Millisecond)

	return bun.NewDB(sqldb, pgdialect.New()), dsn
}

func postgresTableExists(t *testing.T, db *bun.DB, tableName string) bool {
	t.Helper()
	var count int
	err := db.NewRaw(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ?`, tableName).Scan(context.Background(), &count)
	require.NoError(t, err)
	return count == 1
}

func TestRunMigrationsIfNeeded_PostgresDoesNotAutoMigrateWithoutForce(t *testing.T) {
	db, dsn := newBootstrapPostgresTestDB(t)
	t.Cleanup(func() { require.NoError(t, db.Close()) })

	err := runMigrationsIfNeeded(db, &config.Config{DatabaseURL: dsn, ForceAutoMigrate: false}, zap.NewNop(), nil)
	require.NoError(t, err)
	assert.False(t, postgresTableExists(t, db, "bun_migrations"))
	assert.False(t, postgresTableExists(t, db, "users"))
}

func TestRunMigrationsIfNeeded_PostgresForcedAutoMigrateRunsSharedMigrations(t *testing.T) {
	db, dsn := newBootstrapPostgresTestDB(t)
	t.Cleanup(func() { require.NoError(t, db.Close()) })

	err := runMigrationsIfNeeded(db, &config.Config{DatabaseURL: dsn, ForceAutoMigrate: true}, zap.NewNop(), nil)
	require.NoError(t, err)
	assert.True(t, postgresTableExists(t, db, "bun_migrations"))
	assert.True(t, postgresTableExists(t, db, "users"))
	assert.False(t, postgresTableExists(t, db, "organizations"))
	assert.False(t, postgresTableExists(t, db, "spaces"))
	assert.False(t, postgresTableExists(t, db, "processing_usage"))
	assert.False(t, postgresTableExists(t, db, "processing_usage_batches"))
}
