package storagemanager

import (
	"context"
	"database/sql"
	"encoding/json"
	"github.com/cshum/imagor-studio/server/models"
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

	err = db.RunInTx(context.Background(), nil, func(ctx context.Context, tx bun.Tx) error {
		_, err := tx.NewCreateTable().Model((*models.Storage)(nil)).Exec(ctx)
		return err
	})
	require.NoError(t, err)

	return db
}

func TestStorageManager_AddConfig(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()

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
			err := sm.AddConfig(ctx, tc.config)
			if tc.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the config was added
				retrievedConfig, err := sm.GetConfig(ctx, tc.config.Key)
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

func TestStorageManager_UpdateConfig(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()

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
	err = sm.AddConfig(ctx, initialConfig)
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
			err := sm.UpdateConfig(ctx, tc.key, tc.updateConfig)
			if tc.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the config was updated
				retrievedConfig, err := sm.GetConfig(ctx, tc.key)
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

func TestStorageManager_DeleteConfig(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()

	// Add a config to delete
	configToDelete := &StorageConfig{
		Name: "Config to Delete",
		Key:  "delete-me",
		Type: "file",
		Config: json.RawMessage(`{
			"baseDir": "/tmp/delete-me"
		}`),
	}
	err = sm.AddConfig(ctx, configToDelete)
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
			err := sm.DeleteConfig(ctx, tc.key)
			if tc.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the config was deleted
				retrievedConfig, err := sm.GetConfig(ctx, tc.key)
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

func TestStorageManager_GetConfigs(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()

	// Add multiple configs
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
		err := sm.AddConfig(ctx, cfg)
		require.NoError(t, err)
	}

	// Test GetConfigs
	retrievedConfigs, err := sm.GetConfigs(ctx)
	assert.NoError(t, err)
	assert.Len(t, retrievedConfigs, len(configs))

	// Verify each config
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
}

func TestStorageManager_GetStorage(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()

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
		err := sm.AddConfig(ctx, cfg)
		require.NoError(t, err)
	}

	testCases := []struct {
		name        string
		key         string
		expectError bool
	}{
		{
			name:        "Existing S3 Storage",
			key:         "s3-storage",
			expectError: false,
		},
		{
			name:        "Existing File Storage",
			key:         "file-storage",
			expectError: false,
		},
		{
			name:        "Non-existent Storage",
			key:         "non-existent",
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			storage, err := sm.GetStorage(tc.key)
			if tc.expectError {
				assert.Error(t, err)
				assert.Nil(t, storage)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, storage)
				// You can add more specific checks here depending on the storage interface
			}
		})
	}
}

func TestStorageManager_GetDefaultStorage(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "test-secret-key"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	ctx := context.Background()

	t.Run("No Configs", func(t *testing.T) {
		storage, err := sm.GetDefaultStorage()
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
		err := sm.AddConfig(ctx, config)
		require.NoError(t, err)

		storage, err := sm.GetDefaultStorage()
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
		err := sm.AddConfig(ctx, config)
		require.NoError(t, err)

		storage, err := sm.GetDefaultStorage()
		assert.Error(t, err)
		assert.Nil(t, storage)
	})
}

func TestStorageManager_Encryption(t *testing.T) {
	// Setup
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db := setupTestDB(t)
	defer db.Close()

	secretKey := "imagor-secret"
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

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
		err := sm.AddConfig(context.Background(), originalConfig)
		require.NoError(t, err)

		// Retrieve the config (which includes decryption)
		retrievedConfig, err := sm.GetConfig(context.Background(), originalConfig.Key)
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
		err := sm.UpdateConfig(context.Background(), updatedConfig.Key, updatedConfig)
		require.NoError(t, err)

		// Retrieve the updated config
		retrievedConfig, err := sm.GetConfig(context.Background(), updatedConfig.Key)
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
		err := sm.AddConfig(context.Background(), anotherConfig)
		require.NoError(t, err)

		// List all configs
		configs, err := sm.GetConfigs(context.Background())
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
