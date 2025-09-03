package registrystore

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestRegistryStore_DeleteMulti(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger, nil)
	ctx := context.Background()

	// Setup test data
	ownerID := "test-owner"
	entries := []*Registry{
		{Key: "key1", Value: "value1", IsEncrypted: false},
		{Key: "key2", Value: "value2", IsEncrypted: true},
		{Key: "key3", Value: "value3", IsEncrypted: false},
		{Key: "key4", Value: "value4", IsEncrypted: false},
	}

	// Insert test data
	_, err := store.SetMulti(ctx, ownerID, entries)
	require.NoError(t, err)

	// Test deleting multiple keys
	keysToDelete := []string{"key1", "key3"}
	err = store.DeleteMulti(ctx, ownerID, keysToDelete)
	assert.NoError(t, err)

	// Verify deleted keys are gone
	for _, key := range keysToDelete {
		registry, err := store.Get(ctx, ownerID, key)
		assert.NoError(t, err)
		assert.Nil(t, registry, "Key %s should be deleted", key)
	}

	// Verify remaining keys still exist
	remainingKeys := []string{"key2", "key4"}
	for _, key := range remainingKeys {
		registry, err := store.Get(ctx, ownerID, key)
		assert.NoError(t, err)
		assert.NotNil(t, registry, "Key %s should still exist", key)
	}
}

func TestRegistryStore_DeleteMulti_EmptyKeys(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger, nil)
	ctx := context.Background()

	ownerID := "test-owner"

	// Test with empty keys slice - should not error
	err := store.DeleteMulti(ctx, ownerID, []string{})
	assert.NoError(t, err)
}

func TestRegistryStore_DeleteMulti_NonExistentKeys(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger, nil)
	ctx := context.Background()

	ownerID := "test-owner"

	// Test deleting non-existent keys - should return error
	err := store.DeleteMulti(ctx, ownerID, []string{"non-existent-key1", "non-existent-key2"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no registry entries found")
}

func TestRegistryStore_DeleteMulti_MixedExistentAndNonExistent(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger, nil)
	ctx := context.Background()

	ownerID := "test-owner"

	// Setup one existing key
	_, err := store.Set(ctx, ownerID, "existing-key", "value", false)
	require.NoError(t, err)

	// Test deleting mix of existent and non-existent keys
	keysToDelete := []string{"existing-key", "non-existent-key"}
	err = store.DeleteMulti(ctx, ownerID, keysToDelete)
	assert.Error(t, err, "Should error when some keys don't exist")

	// Verify the existing key was not deleted due to the error
	registry, err := store.Get(ctx, ownerID, "existing-key")
	assert.NoError(t, err)
	assert.NotNil(t, registry, "Existing key should still exist due to transaction rollback")
}

func TestRegistryStore_DeleteMulti_OwnerIsolation(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger, nil)
	ctx := context.Background()

	owner1 := "owner1"
	owner2 := "owner2"
	key := "shared-key"

	// Setup same key for different owners
	_, err := store.Set(ctx, owner1, key, "value1", false)
	require.NoError(t, err)
	_, err = store.Set(ctx, owner2, key, "value2", false)
	require.NoError(t, err)

	// Delete key for owner1 only
	err = store.DeleteMulti(ctx, owner1, []string{key})
	assert.NoError(t, err)

	// Verify owner1's key is deleted
	registry, err := store.Get(ctx, owner1, key)
	assert.NoError(t, err)
	assert.Nil(t, registry)

	// Verify owner2's key still exists
	registry, err = store.Get(ctx, owner2, key)
	assert.NoError(t, err)
	assert.NotNil(t, registry)
	assert.Equal(t, "value2", registry.Value)
}

func TestRegistryStore_DeleteMulti_DuplicateKeys(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger, nil)
	ctx := context.Background()

	ownerID := "test-owner"

	// Setup test data
	_, err := store.Set(ctx, ownerID, "key1", "value1", false)
	require.NoError(t, err)

	// Test deleting with duplicate keys in the slice
	keysToDelete := []string{"key1", "key1", "key1"}
	err = store.DeleteMulti(ctx, ownerID, keysToDelete)
	assert.NoError(t, err)

	// Verify key is deleted
	registry, err := store.Get(ctx, ownerID, "key1")
	assert.NoError(t, err)
	assert.Nil(t, registry)
}

func TestRegistryStore_DeleteMulti_LargeNumberOfKeys(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger, nil)
	ctx := context.Background()

	ownerID := "test-owner"

	// Setup many keys
	const numKeys = 100
	var entries []*Registry
	var keysToDelete []string

	for i := 0; i < numKeys; i++ {
		key := fmt.Sprintf("key%d", i)
		entries = append(entries, &Registry{
			Key:         key,
			Value:       fmt.Sprintf("value%d", i),
			IsEncrypted: false,
		})
		keysToDelete = append(keysToDelete, key)
	}

	// Insert all keys
	_, err := store.SetMulti(ctx, ownerID, entries)
	require.NoError(t, err)

	// Delete all keys at once
	err = store.DeleteMulti(ctx, ownerID, keysToDelete)
	assert.NoError(t, err)

	// Verify all keys are deleted
	for _, key := range keysToDelete {
		registry, err := store.Get(ctx, ownerID, key)
		assert.NoError(t, err)
		assert.Nil(t, registry, "Key %s should be deleted", key)
	}
}

func TestRegistryStore_DeleteMulti_Performance(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	logger, _ := zap.NewDevelopment()
	store := New(db, logger, nil)
	ctx := context.Background()

	ownerID := "test-owner"

	// Setup test data
	const numKeys = 50
	var entries []*Registry
	var keysToDelete []string

	for i := 0; i < numKeys; i++ {
		key := fmt.Sprintf("perf-key%d", i)
		entries = append(entries, &Registry{
			Key:         key,
			Value:       fmt.Sprintf("value%d", i),
			IsEncrypted: false,
		})
		keysToDelete = append(keysToDelete, key)
	}

	// Insert all keys
	_, err := store.SetMulti(ctx, ownerID, entries)
	require.NoError(t, err)

	// Measure DeleteMulti performance
	start := time.Now()
	err = store.DeleteMulti(ctx, ownerID, keysToDelete)
	deleteMultiDuration := time.Since(start)
	assert.NoError(t, err)

	// Re-insert for comparison
	_, err = store.SetMulti(ctx, ownerID, entries)
	require.NoError(t, err)

	// Measure individual Delete performance
	start = time.Now()
	for _, key := range keysToDelete {
		err = store.Delete(ctx, ownerID, key)
		assert.NoError(t, err)
	}
	individualDeleteDuration := time.Since(start)

	t.Logf("DeleteMulti took %v for %d keys", deleteMultiDuration, numKeys)
	t.Logf("Individual Delete took %v for %d keys", individualDeleteDuration, numKeys)

	// DeleteMulti should be faster than individual deletes
	// Note: This is a rough performance check, actual results may vary
	if individualDeleteDuration > 0 {
		ratio := float64(deleteMultiDuration) / float64(individualDeleteDuration)
		t.Logf("DeleteMulti is %.2fx the time of individual deletes", ratio)
		// In most cases, DeleteMulti should be faster, but we won't enforce this
		// as it depends on database implementation and test environment
	}
}
