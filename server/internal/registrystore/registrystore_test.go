package registrystore

import (
	"context"
	"database/sql"
	"encoding/base64"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"go.uber.org/zap"
)

func setupTestDB(t *testing.T) (*bun.DB, func()) {
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	require.NoError(t, err)

	db := bun.NewDB(sqldb, sqlitedialect.New())

	// Create a registry table directly with SQL
	ctx := context.Background()
	_, err = db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS registry (
			id TEXT PRIMARY KEY,
			owner_id TEXT NOT NULL,
			key TEXT NOT NULL,
			value TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	require.NoError(t, err)

	// Create unique constraint on owner_id + key
	_, err = db.ExecContext(ctx, `
		CREATE UNIQUE INDEX IF NOT EXISTS idx_registry_owner_id_key 
		ON registry (owner_id, key)
	`)
	require.NoError(t, err)

	// Verify table exists
	var count int
	err = db.NewSelect().
		ColumnExpr("COUNT(*)").
		TableExpr("sqlite_master").
		Where("type = 'table' AND name = 'registry'").
		Scan(ctx, &count)
	require.NoError(t, err)
	require.Equal(t, 1, count, "registry table should exist")

	cleanup := func() {
		db.Close()
		sqldb.Close()
	}

	return db, cleanup
}

func TestDatabaseSetup(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Test that we can directly insert data
	ctx := context.Background()
	_, err := db.ExecContext(ctx, `
		INSERT INTO registry (id, owner_id, key, value) 
		VALUES (?, ?, ?, ?)
	`, "test-id", "test-owner", "test-key", "test-value")
	require.NoError(t, err)

	// Verify we can read it back
	var value string
	err = db.NewSelect().
		Model((*model.Registry)(nil)).
		Column("value").
		Where("owner_id = ? AND key = ?", "test-owner", "test-key").
		Scan(ctx, &value)
	require.NoError(t, err)
	assert.Equal(t, "test-value", value)
}

func TestRegistryStore_Set(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Test creating new registry
	result, err := store.Set(ctx, "owner1", "key1", "value1")
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "key1", result.Key)
	assert.Equal(t, "value1", result.Value)
	assert.False(t, result.CreatedAt.IsZero())
	assert.False(t, result.UpdatedAt.IsZero())

	// Test updating existing registry
	time.Sleep(10 * time.Millisecond) // Ensure different timestamp
	updatedResult, err := store.Set(ctx, "owner1", "key1", "value2")
	assert.NoError(t, err)
	assert.NotNil(t, updatedResult)
	assert.Equal(t, "key1", updatedResult.Key)
	assert.Equal(t, "value2", updatedResult.Value)
	assert.True(t, updatedResult.UpdatedAt.After(result.UpdatedAt))
}

func TestRegistryStore_Get(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Insert test data
	_, err := store.Set(ctx, "owner1", "key1", "value1")
	require.NoError(t, err)

	// Test getting existing registry
	result, err := store.Get(ctx, "owner1", "key1")
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "key1", result.Key)
	assert.Equal(t, "value1", result.Value)

	// Test getting non-existent registry
	result, err = store.Get(ctx, "owner1", "non-existent")
	assert.NoError(t, err)
	assert.Nil(t, result)

	// Test getting registry for wrong owner
	result, err = store.Get(ctx, "owner2", "key1")
	assert.NoError(t, err)
	assert.Nil(t, result)
}

func TestRegistryStore_List(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Insert test data
	_, err := store.Set(ctx, "owner1", "app:setting1", "value1")
	require.NoError(t, err)
	_, err = store.Set(ctx, "owner1", "app:setting2", "value2")
	require.NoError(t, err)
	_, err = store.Set(ctx, "owner1", "config:option1", "value3")
	require.NoError(t, err)
	_, err = store.Set(ctx, "owner2", "app:setting1", "value4")
	require.NoError(t, err)

	// Test listing all registry for owner1
	results, err := store.List(ctx, "owner1", nil)
	assert.NoError(t, err)
	assert.Len(t, results, 3)

	// Test listing with prefix
	prefix := "app:"
	results, err = store.List(ctx, "owner1", &prefix)
	assert.NoError(t, err)
	assert.Len(t, results, 2)
	assert.Equal(t, "app:setting1", results[0].Key)
	assert.Equal(t, "app:setting2", results[1].Key)

	// Test listing for owner2
	results, err = store.List(ctx, "owner2", nil)
	assert.NoError(t, err)
	assert.Len(t, results, 1)
	assert.Equal(t, "app:setting1", results[0].Key)
	assert.Equal(t, "value4", results[0].Value)

	// Test listing with non-matching prefix
	nonMatchingPrefix := "xyz:"
	results, err = store.List(ctx, "owner1", &nonMatchingPrefix)
	assert.NoError(t, err)
	assert.Len(t, results, 0)
}

func TestRegistryStore_Delete(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Insert test data
	_, err := store.Set(ctx, "owner1", "key1", "value1")
	require.NoError(t, err)

	// Test deleting existing registry
	err = store.Delete(ctx, "owner1", "key1")
	assert.NoError(t, err)

	// Verify deletion
	result, err := store.Get(ctx, "owner1", "key1")
	assert.NoError(t, err)
	assert.Nil(t, result)

	// Test deleting non-existent registry
	err = store.Delete(ctx, "owner1", "non-existent")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")

	// Test deleting registry for wrong owner
	_, err = store.Set(ctx, "owner1", "key2", "value2")
	require.NoError(t, err)

	err = store.Delete(ctx, "owner2", "key2")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestRegistryStore_IsolationByOwner(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Set same key for different owners
	_, err := store.Set(ctx, "owner1", "shared-key", "value1")
	require.NoError(t, err)

	_, err = store.Set(ctx, "owner2", "shared-key", "value2")
	require.NoError(t, err)

	// Verify isolation
	result1, err := store.Get(ctx, "owner1", "shared-key")
	assert.NoError(t, err)
	assert.Equal(t, "value1", result1.Value)

	result2, err := store.Get(ctx, "owner2", "shared-key")
	assert.NoError(t, err)
	assert.Equal(t, "value2", result2.Value)
}

func TestRegistryStore_LargeValue(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Test with large binary value - encode as base64 for safe storage
	largeBinaryData := make([]byte, 10000)
	for i := range largeBinaryData {
		largeBinaryData[i] = byte(i % 256)
	}

	// Encode binary data as base64
	largeValue := base64.StdEncoding.EncodeToString(largeBinaryData)

	result, err := store.Set(ctx, "owner1", "large-key", largeValue)
	assert.NoError(t, err)
	assert.Equal(t, largeValue, result.Value)

	// Verify retrieval
	retrieved, err := store.Get(ctx, "owner1", "large-key")
	assert.NoError(t, err)
	assert.Equal(t, largeValue, retrieved.Value)

	// Verify we can decode back to original binary data
	decodedData, err := base64.StdEncoding.DecodeString(retrieved.Value)
	assert.NoError(t, err)
	assert.Equal(t, largeBinaryData, decodedData)
}

func TestRegistryStore_LargeTextValue(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Test with large text value (e.g., a large JSON document)
	var sb strings.Builder
	for i := 0; i < 1000; i++ {
		sb.WriteString(fmt.Sprintf(`{"item_%d": "This is a test value for item %d with some longer text content to make the value larger."}`+"\n", i, i))
	}
	largeValue := sb.String()

	result, err := store.Set(ctx, "owner1", "large-text-key", largeValue)
	assert.NoError(t, err)
	assert.Equal(t, largeValue, result.Value)

	// Verify retrieval
	retrieved, err := store.Get(ctx, "owner1", "large-text-key")
	assert.NoError(t, err)
	assert.Equal(t, largeValue, retrieved.Value)
}

func TestRegistryStore_ListOrdering(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Insert data in non-alphabetical order
	_, err := store.Set(ctx, "owner1", "key-c", "value-c")
	require.NoError(t, err)
	_, err = store.Set(ctx, "owner1", "key-a", "value-a")
	require.NoError(t, err)
	_, err = store.Set(ctx, "owner1", "key-b", "value-b")
	require.NoError(t, err)

	// Verify ordering
	results, err := store.List(ctx, "owner1", nil)
	assert.NoError(t, err)
	assert.Len(t, results, 3)
	assert.Equal(t, "key-a", results[0].Key)
	assert.Equal(t, "key-b", results[1].Key)
	assert.Equal(t, "key-c", results[2].Key)
}

func TestRegistryStore_EmptyPrefix(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Insert test data
	_, err := store.Set(ctx, "owner1", "key1", "value1")
	require.NoError(t, err)
	_, err = store.Set(ctx, "owner1", "key2", "value2")
	require.NoError(t, err)

	// Test with empty prefix (should return all)
	emptyPrefix := ""
	results, err := store.List(ctx, "owner1", &emptyPrefix)
	assert.NoError(t, err)
	assert.Len(t, results, 2)
}

func TestRegistryStore_SpecialCharacters(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Test with special characters in key and value
	specialKey := "key:with/special@chars#123"
	specialValue := "value with spaces, 新的价值, emojis 🚀"

	result, err := store.Set(ctx, "owner1", specialKey, specialValue)
	assert.NoError(t, err)
	assert.Equal(t, specialKey, result.Key)
	assert.Equal(t, specialValue, result.Value)

	// Verify retrieval
	retrieved, err := store.Get(ctx, "owner1", specialKey)
	assert.NoError(t, err)
	assert.Equal(t, specialValue, retrieved.Value)
}

func BenchmarkRegistryStore_Set(b *testing.B) {
	db, cleanup := setupTestDB(&testing.T{})
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := store.Set(ctx, "owner1", "bench-key", "bench-value")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkRegistryStore_Get(b *testing.B) {
	db, cleanup := setupTestDB(&testing.T{})
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Setup data
	_, err := store.Set(ctx, "owner1", "bench-key", "bench-value")
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := store.Get(ctx, "owner1", "bench-key")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkRegistryStore_List(b *testing.B) {
	db, cleanup := setupTestDB(&testing.T{})
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger)
	ctx := context.Background()

	// Setup data
	for i := 0; i < 100; i++ {
		key := fmt.Sprintf("key-%d", i)
		value := fmt.Sprintf("value-%d", i)
		_, err := store.Set(ctx, "owner1", key, value)
		if err != nil {
			b.Fatal(err)
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := store.List(ctx, "owner1", nil)
		if err != nil {
			b.Fatal(err)
		}
	}
}
