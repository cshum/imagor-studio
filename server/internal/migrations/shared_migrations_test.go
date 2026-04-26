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

func TestSharedMigrationsExcludeCloudTables(t *testing.T) {
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqldb.Close() })

	db := bun.NewDB(sqldb, sqlitedialect.New())
	migrator := migrate.NewMigrator(db, Migrations)
	require.NoError(t, migrator.Init(context.Background()))
	_, err = migrator.Migrate(context.Background())
	require.NoError(t, err)

	assert.False(t, tableExists(t, db, "organizations"))
	assert.False(t, tableExists(t, db, "spaces"))
	assert.False(t, tableExists(t, db, "hosted_storage_objects"))
	assert.False(t, tableExists(t, db, "processing_usage"))
	assert.False(t, tableExists(t, db, "processing_usage_batches"))
}

func tableExists(t *testing.T, db *bun.DB, tableName string) bool {
	t.Helper()
	var count int
	err := db.NewRaw("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?", tableName).Scan(context.Background(), &count)
	require.NoError(t, err)
	return count == 1
}
