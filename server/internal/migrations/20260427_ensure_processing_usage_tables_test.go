package migrations

import (
	"context"
	"database/sql"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"github.com/uptrace/bun/migrate"
)

func TestEnsureProcessingUsageMigrationRepairsExisting20260426Database(t *testing.T) {
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqldb.Close() })

	db := bun.NewDB(sqldb, sqlitedialect.New())
	migrator := migrate.NewMigrator(db, Migrations)
	require.NoError(t, migrator.Init(context.Background()))

	_, err = db.ExecContext(context.Background(), `CREATE TABLE IF NOT EXISTS hosted_storage_objects (id TEXT PRIMARY KEY)`)
	require.NoError(t, err)
	_, err = db.ExecContext(context.Background(), `CREATE TABLE IF NOT EXISTS hosted_storage_usage (org_id TEXT PRIMARY KEY)`)
	require.NoError(t, err)
	_, err = db.ExecContext(context.Background(), `INSERT INTO bun_migrations (name, group_id) VALUES ('20260426', 1)`)
	require.NoError(t, err)

	_, err = migrator.Migrate(context.Background())
	require.NoError(t, err)

	assert.True(t, tableExists(t, db, "hosted_storage_objects"))
	assert.True(t, tableExists(t, db, "hosted_storage_usage"))
	assert.True(t, tableExists(t, db, "processing_usage"))
	assert.True(t, tableExists(t, db, "processing_usage_batches"))
	assert.True(t, indexExists(t, db, "idx_processing_usage_space_bucket"))
	assert.True(t, indexExists(t, db, "idx_processing_usage_org_bucket"))
	assert.True(t, indexExists(t, db, "idx_processing_usage_batches_received_at"))
}
