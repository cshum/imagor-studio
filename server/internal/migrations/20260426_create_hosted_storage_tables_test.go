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

func TestHostedStorageMigrationCreatesTables(t *testing.T) {
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqldb.Close() })

	db := bun.NewDB(sqldb, sqlitedialect.New())
	migrator := migrate.NewMigrator(db, Migrations)
	require.NoError(t, migrator.Init(context.Background()))
	_, err = migrator.Migrate(context.Background())
	require.NoError(t, err)

	assert.True(t, tableExists(t, db, "hosted_storage_objects"))
	assert.True(t, tableExists(t, db, "hosted_storage_usage"))
	assert.True(t, indexExists(t, db, "uidx_hosted_storage_objects_space_key"))
	assert.True(t, indexExists(t, db, "idx_hosted_storage_objects_org_space_status"))
	assert.True(t, indexExists(t, db, "idx_hosted_storage_usage_org_id"))
}

func tableExists(t *testing.T, db *bun.DB, tableName string) bool {
	t.Helper()
	var count int
	err := db.NewRaw("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?", tableName).Scan(context.Background(), &count)
	require.NoError(t, err)
	return count == 1
}

func indexExists(t *testing.T, db *bun.DB, indexName string) bool {
	t.Helper()
	var count int
	err := db.NewRaw("SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = ?", indexName).Scan(context.Background(), &count)
	require.NoError(t, err)
	return count == 1
}
