package storagemanager

import (
	"context"
	"database/sql"
	"encoding/json"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestStorageManager_Encryption(t *testing.T) {
	// Setup
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	db, err := sql.Open("sqlite3", ":memory:")
	require.NoError(t, err)
	defer db.Close()

	// Create table with the correct schema
	_, err = db.Exec(`
		CREATE TABLE storage_configs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			key TEXT NOT NULL UNIQUE,
			type TEXT NOT NULL,
			config TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	require.NoError(t, err)

	secretKey := []byte("test-secret-key-32-bytes-long!!!")
	sm, err := New(db, logger, secretKey)
	require.NoError(t, err)

	t.Run("EncryptAndDecryptConfig", func(t *testing.T) {
		originalConfig := StorageConfig{
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
		updatedConfig := StorageConfig{
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
		anotherConfig := StorageConfig{
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
		configMap := make(map[string]StorageConfig)
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
