package storagerepository

import (
	"context"
	"database/sql"
	"encoding/json"
	"github.com/cshum/imagor-studio/server/pkg/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"go.uber.org/zap"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func setupTestDB(t *testing.T) *bun.DB {
	sqldb, err := sql.Open("sqlite3", "file::memory:?cache=shared")
	require.NoError(t, err)

	db := bun.NewDB(sqldb, sqlitedialect.New())

	// Create table with UUID columns
	err = db.RunInTx(context.Background(), nil, func(ctx context.Context, tx bun.Tx) error {
		_, err := tx.ExecContext(ctx, `
			CREATE TABLE storages (
				id TEXT PRIMARY KEY,
				owner_id TEXT NOT NULL,
				key TEXT NOT NULL,
				name TEXT NOT NULL,
				type TEXT NOT NULL,
				config TEXT NOT NULL,
				UNIQUE(owner_id, key)
			)
		`)
		return err
	})
	require.NoError(t, err)

	return db
}

func TestSorageRepository_AddConfig(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()
	ownerID := uuid.GenerateUUID()

	testCases := []struct {
		name        string
		config      *StorageConfig
		expectError bool
	}{
		{
			name: "Valid S3 Config",
			config: &StorageConfig{
				Name: "Test S3",
				Key:  "test-s3",
				Type: "s3",
				Config: json.RawMessage(`{
					"bucket": "test-bucket",
					"region": "us-west-2",
					"accessKeyId": "AKIAIOSFODNN7EXAMPLE",
					"secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
				}`),
			},
			expectError: false,
		},
		{
			name: "Valid File Config",
			config: &StorageConfig{
				Name: "Test File",
				Key:  "test-file",
				Type: "file",
				Config: json.RawMessage(`{
					"baseDir": "/tmp/test-storage"
				}`),
			},
			expectError: false,
		},
		{
			name: "Invalid Config Type",
			config: &StorageConfig{
				Name:   "Invalid Type",
				Key:    "invalid-type",
				Type:   "invalid",
				Config: json.RawMessage(`{}`),
			},
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := sm.AddConfig(ctx, ownerID, tc.config)
			if tc.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the config was added
				retrievedConfig, err := sm.GetConfig(ctx, ownerID, tc.config.Key)
				assert.NoError(t, err)
				assert.NotNil(t, retrievedConfig)
				assert.Equal(t, tc.config.Name, retrievedConfig.Name)
				assert.Equal(t, tc.config.Key, retrievedConfig.Key)
				assert.Equal(t, tc.config.Type, retrievedConfig.Type)
				assert.JSONEq(t, string(tc.config.Config), string(retrievedConfig.Config))
			}
		})
	}
}

func TestSorageRepository_ConfigIsolationBetweenOwners(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()
	ownerID1 := uuid.GenerateUUID()
	ownerID2 := uuid.GenerateUUID()

	// Add config for owner 1
	config1 := &StorageConfig{
		Name: "Owner1 S3",
		Key:  "shared-key",
		Type: "s3",
		Config: json.RawMessage(`{
			"bucket": "owner1-bucket",
			"region": "us-west-2"
		}`),
	}
	err = sm.AddConfig(ctx, ownerID1, config1)
	require.NoError(t, err)

	// Add config for owner 2 with the same key
	config2 := &StorageConfig{
		Name: "Owner2 S3",
		Key:  "shared-key",
		Type: "s3",
		Config: json.RawMessage(`{
			"bucket": "owner2-bucket",
			"region": "us-east-1"
		}`),
	}
	err = sm.AddConfig(ctx, ownerID2, config2)
	require.NoError(t, err)

	// Verify owner 1's config
	retrievedConfig1, err := sm.GetConfig(ctx, ownerID1, "shared-key")
	assert.NoError(t, err)
	assert.NotNil(t, retrievedConfig1)
	assert.Equal(t, "Owner1 S3", retrievedConfig1.Name)
	assert.JSONEq(t, `{"bucket": "owner1-bucket", "region": "us-west-2"}`, string(retrievedConfig1.Config))

	// Verify owner 2's config
	retrievedConfig2, err := sm.GetConfig(ctx, ownerID2, "shared-key")
	assert.NoError(t, err)
	assert.NotNil(t, retrievedConfig2)
	assert.Equal(t, "Owner2 S3", retrievedConfig2.Name)
	assert.JSONEq(t, `{"bucket": "owner2-bucket", "region": "us-east-1"}`, string(retrievedConfig2.Config))

	// Verify that owner 1 cannot access owner 2's config
	retrievedConfig3, err := sm.GetConfig(ctx, ownerID1, "shared-key")
	assert.NoError(t, err)
	assert.NotEqual(t, retrievedConfig3.Name, "Owner2 S3")
}

func TestSorageRepository_UpdateConfig(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()
	ownerID := uuid.GenerateUUID()

	// Add an initial config
	initialConfig := &StorageConfig{
		Name: "Initial S3",
		Key:  "initial-s3",
		Type: "s3",
		Config: json.RawMessage(`{
			"bucket": "initial-bucket",
			"region": "us-west-2"
		}`),
	}
	err = sm.AddConfig(ctx, ownerID, initialConfig)
	require.NoError(t, err)

	testCases := []struct {
		name         string
		key          string
		updateConfig *StorageConfig
		expectError  bool
	}{
		{
			name: "Valid Update",
			key:  "initial-s3",
			updateConfig: &StorageConfig{
				Name: "Updated S3",
				Key:  "initial-s3",
				Type: "s3",
				Config: json.RawMessage(`{
					"bucket": "updated-bucket",
					"region": "us-east-1"
				}`),
			},
			expectError: false,
		},
		{
			name: "Non-existent Key",
			key:  "non-existent",
			updateConfig: &StorageConfig{
				Name:   "Non-existent",
				Key:    "non-existent",
				Type:   "s3",
				Config: json.RawMessage(`{}`),
			},
			expectError: true,
		},
		{
			name: "Invalid Config Type",
			key:  "initial-s3",
			updateConfig: &StorageConfig{
				Name:   "Invalid Type",
				Key:    "initial-s3",
				Type:   "invalid",
				Config: json.RawMessage(`{}`),
			},
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := sm.UpdateConfig(ctx, ownerID, tc.key, tc.updateConfig)
			if tc.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the config was updated
				retrievedConfig, err := sm.GetConfig(ctx, ownerID, tc.key)
				assert.NoError(t, err)
				assert.NotNil(t, retrievedConfig)
				assert.Equal(t, tc.updateConfig.Name, retrievedConfig.Name)
				assert.Equal(t, tc.updateConfig.Key, retrievedConfig.Key)
				assert.Equal(t, tc.updateConfig.Type, retrievedConfig.Type)
				assert.JSONEq(t, string(tc.updateConfig.Config), string(retrievedConfig.Config))
			}
		})
	}
}

func TestSorageRepository_DeleteConfig(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()
	ownerID := uuid.GenerateUUID()

	// Add a config to delete
	configToDelete := &StorageConfig{
		Name: "Config to Delete",
		Key:  "delete-me",
		Type: "file",
		Config: json.RawMessage(`{
			"baseDir": "/tmp/delete-me"
		}`),
	}
	err = sm.AddConfig(ctx, ownerID, configToDelete)
	require.NoError(t, err)

	testCases := []struct {
		name        string
		key         string
		expectError bool
	}{
		{
			name:        "Existing Config",
			key:         "delete-me",
			expectError: false,
		},
		{
			name:        "Non-existent Config",
			key:         "non-existent",
			expectError: false, // DeleteConfig doesn't return an error for non-existent keys
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := sm.DeleteConfig(ctx, ownerID, tc.key)
			if tc.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the config was deleted
				retrievedConfig, err := sm.GetConfig(ctx, ownerID, tc.key)
				if tc.expectError {
					assert.Error(t, err)
				} else {
					assert.Nil(t, err)
					assert.Nil(t, retrievedConfig) // Check that retrievedConfig is nil for deleted/non-existent configs
				}
			}
		})
	}
}

func TestSorageRepository_GetConfigs(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()
	ownerID := uuid.GenerateUUID()

	// Add multiple configs for this owner
	configs := []*StorageConfig{
		{
			Name: "S3 Config",
			Key:  "s3-config",
			Type: "s3",
			Config: json.RawMessage(`{
				"bucket": "test-bucket",
				"region": "us-west-2"
			}`),
		},
		{
			Name: "File Config",
			Key:  "file-config",
			Type: "file",
			Config: json.RawMessage(`{
				"baseDir": "/tmp/test-storage"
			}`),
		},
	}

	for _, cfg := range configs {
		err := sm.AddConfig(ctx, ownerID, cfg)
		require.NoError(t, err)
	}

	// Add a config for a different owner
	otherOwnerID := uuid.GenerateUUID()
	otherConfig := &StorageConfig{
		Name: "Other Owner Config",
		Key:  "other-config",
		Type: "s3",
		Config: json.RawMessage(`{
			"bucket": "other-bucket",
			"region": "eu-west-1"
		}`),
	}
	err = sm.AddConfig(ctx, otherOwnerID, otherConfig)
	require.NoError(t, err)

	// Test GetConfigs for the first owner
	retrievedConfigs, err := sm.GetConfigs(ctx, ownerID)
	assert.NoError(t, err)
	assert.Len(t, retrievedConfigs, len(configs))

	// Verify each config belongs to the correct owner
	for _, expectedConfig := range configs {
		found := false
		for _, retrievedConfig := range retrievedConfigs {
			if retrievedConfig.Key == expectedConfig.Key {
				assert.Equal(t, expectedConfig.Name, retrievedConfig.Name)
				assert.Equal(t, expectedConfig.Type, retrievedConfig.Type)
				assert.JSONEq(t, string(expectedConfig.Config), string(retrievedConfig.Config))
				found = true
				break
			}
		}
		assert.True(t, found, "Config with key %s not found in retrieved configs", expectedConfig.Key)
	}

	// Test GetConfigs for the other owner
	otherRetrievedConfigs, err := sm.GetConfigs(ctx, otherOwnerID)
	assert.NoError(t, err)
	assert.Len(t, otherRetrievedConfigs, 1)
	assert.Equal(t, otherConfig.Name, otherRetrievedConfigs[0].Name)
}

func TestSorageRepository_GetStorage(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()
	ownerID := uuid.GenerateUUID()

	// Add configs
	configs := []*StorageConfig{
		{
			Name: "S3 Storage",
			Key:  "s3-storage",
			Type: "s3",
			Config: json.RawMessage(`{
				"bucket": "test-bucket",
				"region": "us-west-2"
			}`),
		},
		{
			Name: "File Storage",
			Key:  "file-storage",
			Type: "file",
			Config: json.RawMessage(`{
				"baseDir": "/tmp/test-storage"
			}`),
		},
	}

	for _, cfg := range configs {
		err := sm.AddConfig(ctx, ownerID, cfg)
		require.NoError(t, err)
	}

	testCases := []struct {
		name        string
		ownerID     string
		key         string
		expectError bool
	}{
		{
			name:        "Existing S3 Storage",
			ownerID:     ownerID,
			key:         "s3-storage",
			expectError: false,
		},
		{
			name:        "Existing File Storage",
			ownerID:     ownerID,
			key:         "file-storage",
			expectError: false,
		},
		{
			name:        "Non-existent Storage",
			ownerID:     ownerID,
			key:         "non-existent",
			expectError: true,
		},
		{
			name:        "Wrong Owner ID",
			ownerID:     uuid.GenerateUUID(),
			key:         "s3-storage",
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			storage, err := sm.GetStorage(tc.ownerID, tc.key)
			if tc.expectError {
				assert.Error(t, err)
				assert.Nil(t, storage)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, storage)
			}
		})
	}
}

func TestSorageRepository_GetDefaultStorage(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()
	ownerID := uuid.GenerateUUID()

	t.Run("No Configs", func(t *testing.T) {
		storage, err := sm.GetDefaultStorage(ownerID)
		assert.Error(t, err)
		assert.Nil(t, storage)
	})

	t.Run("Single Config", func(t *testing.T) {
		config := &StorageConfig{
			Name: "Default Storage",
			Key:  "default",
			Type: "file",
			Config: json.RawMessage(`{
				"baseDir": "/tmp/default-storage"
			}`),
		}
		err := sm.AddConfig(ctx, ownerID, config)
		require.NoError(t, err)

		storage, err := sm.GetDefaultStorage(ownerID)
		assert.NoError(t, err)
		assert.NotNil(t, storage)
	})

	t.Run("Multiple Configs", func(t *testing.T) {
		config := &StorageConfig{
			Name: "Second Storage",
			Key:  "second",
			Type: "s3",
			Config: json.RawMessage(`{
				"bucket": "second-bucket",
				"region": "us-east-1"
			}`),
		}
		err := sm.AddConfig(ctx, ownerID, config)
		require.NoError(t, err)

		storage, err := sm.GetDefaultStorage(ownerID)
		assert.Error(t, err)
		assert.Nil(t, storage)
	})

	t.Run("Different Owner", func(t *testing.T) {
		otherOwnerID := uuid.GenerateUUID()
		storage, err := sm.GetDefaultStorage(otherOwnerID)
		assert.Error(t, err)
		assert.Nil(t, storage)
	})
}

func TestSorageRepository_Encryption(t *testing.T) {
	// Setup
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "imagor-secret"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ownerID := uuid.GenerateUUID()

	t.Run("EncryptAndDecryptConfig", func(t *testing.T) {
		originalConfig := &StorageConfig{
			Name: "Test Storage",
			Key:  "test-storage",
			Type: "s3",
			Config: json.RawMessage(`{
				"bucket": "test-bucket",
				"region": "us-west-2",
				"accessKeyId": "AKIAIOSFODNN7EXAMPLE",
				"secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
			}`),
		}

		// Test AddConfig (which includes encryption)
		err := sm.AddConfig(context.Background(), ownerID, originalConfig)
		require.NoError(t, err)

		// Retrieve the config (which includes decryption)
		retrievedConfig, err := sm.GetConfig(context.Background(), ownerID, originalConfig.Key)
		require.NoError(t, err)
		require.NotNil(t, retrievedConfig)

		// Compare original and retrieved configs
		assert.Equal(t, originalConfig.Name, retrievedConfig.Name)
		assert.Equal(t, originalConfig.Key, retrievedConfig.Key)
		assert.Equal(t, originalConfig.Type, retrievedConfig.Type)

		var originalConfigMap map[string]interface{}
		var retrievedConfigMap map[string]interface{}
		err = json.Unmarshal(originalConfig.Config, &originalConfigMap)
		require.NoError(t, err)
		err = json.Unmarshal(retrievedConfig.Config, &retrievedConfigMap)
		require.NoError(t, err)

		assert.Equal(t, originalConfigMap, retrievedConfigMap)
	})

	t.Run("UpdateEncryptedConfig", func(t *testing.T) {
		updatedConfig := &StorageConfig{
			Name: "Updated Test Storage",
			Key:  "test-storage",
			Type: "s3",
			Config: json.RawMessage(`{
				"bucket": "updated-test-bucket",
				"region": "us-east-1",
				"accessKeyId": "AKIAIOSFODNN7EXAMPLE",
				"secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
			}`),
		}

		// Update the config
		err := sm.UpdateConfig(context.Background(), ownerID, updatedConfig.Key, updatedConfig)
		require.NoError(t, err)

		// Retrieve the updated config
		retrievedConfig, err := sm.GetConfig(context.Background(), ownerID, updatedConfig.Key)
		require.NoError(t, err)
		require.NotNil(t, retrievedConfig)

		// Compare updated and retrieved configs
		assert.Equal(t, updatedConfig.Name, retrievedConfig.Name)
		assert.Equal(t, updatedConfig.Key, retrievedConfig.Key)
		assert.Equal(t, updatedConfig.Type, retrievedConfig.Type)

		var updatedConfigMap map[string]interface{}
		var retrievedConfigMap map[string]interface{}
		err = json.Unmarshal(updatedConfig.Config, &updatedConfigMap)
		require.NoError(t, err)
		err = json.Unmarshal(retrievedConfig.Config, &retrievedConfigMap)
		require.NoError(t, err)

		assert.Equal(t, updatedConfigMap, retrievedConfigMap)
	})

	t.Run("ListEncryptedConfigs", func(t *testing.T) {
		// Add another config
		anotherConfig := &StorageConfig{
			Name: "Another Test Storage",
			Key:  "another-test-storage",
			Type: "file",
			Config: json.RawMessage(`{
				"baseDir": "/tmp/test-storage"
			}`),
		}
		err := sm.AddConfig(context.Background(), ownerID, anotherConfig)
		require.NoError(t, err)

		// List all configs for this owner
		configs, err := sm.GetConfigs(context.Background(), ownerID)
		require.NoError(t, err)
		assert.Len(t, configs, 2)

		// Check if both configs are in the list
		configMap := make(map[string]*StorageConfig)
		for _, cfg := range configs {
			configMap[cfg.Key] = cfg
		}

		assert.Contains(t, configMap, "test-storage")
		assert.Contains(t, configMap, "another-test-storage")

		// Verify the contents of the configs
		testConfig := configMap["test-storage"]
		assert.Equal(t, "Updated Test Storage", testConfig.Name)
		assert.Equal(t, "s3", testConfig.Type)

		anotherTestConfig := configMap["another-test-storage"]
		assert.Equal(t, "Another Test Storage", anotherTestConfig.Name)
		assert.Equal(t, "file", anotherTestConfig.Type)
	})
}

func TestSorageRepository_MultiTenant(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()
	owner1ID := uuid.GenerateUUID()
	owner2ID := uuid.GenerateUUID()

	// Add configs for owner 1
	config1 := &StorageConfig{
		Name: "Owner1 Storage 1",
		Key:  "storage1",
		Type: "file",
		Config: json.RawMessage(`{
			"baseDir": "/owner1/storage1"
		}`),
	}
	err = sm.AddConfig(ctx, owner1ID, config1)
	require.NoError(t, err)

	// Add configs for owner 2
	config2 := &StorageConfig{
		Name: "Owner2 Storage 1",
		Key:  "storage1", // Same key as owner1's config
		Type: "file",
		Config: json.RawMessage(`{
			"baseDir": "/owner2/storage1"
		}`),
	}
	err = sm.AddConfig(ctx, owner2ID, config2)
	require.NoError(t, err)

	// Test GetConfig for owner 1
	retrieved1, err := sm.GetConfig(ctx, owner1ID, "storage1")
	assert.NoError(t, err)
	assert.Equal(t, "Owner1 Storage 1", retrieved1.Name)

	// Test GetConfig for owner 2
	retrieved2, err := sm.GetConfig(ctx, owner2ID, "storage1")
	assert.NoError(t, err)
	assert.Equal(t, "Owner2 Storage 1", retrieved2.Name)

	// Test GetStorage for owner 1
	storage1, err := sm.GetStorage(owner1ID, "storage1")
	assert.NoError(t, err)
	assert.NotNil(t, storage1)

	// Test GetStorage for owner 2
	storage2, err := sm.GetStorage(owner2ID, "storage1")
	assert.NoError(t, err)
	assert.NotNil(t, storage2)

	// Verify that the two storages are different
	assert.NotEqual(t, storage1, storage2)

	// Test that owner 1 cannot access owner 2's storage
	_, err = sm.GetStorage(owner1ID, "storage1")
	assert.NoError(t, err) // Should not error because owner1 has their own storage1

	// Test deletion isolation
	err = sm.DeleteConfig(ctx, owner1ID, "storage1")
	assert.NoError(t, err)

	// Owner2's config should still exist
	retrieved2After, err := sm.GetConfig(ctx, owner2ID, "storage1")
	assert.NoError(t, err)
	assert.NotNil(t, retrieved2After)

	// Owner1's config should be gone
	retrieved1After, err := sm.GetConfig(ctx, owner1ID, "storage1")
	assert.NoError(t, err)
	assert.Nil(t, retrieved1After)
}
