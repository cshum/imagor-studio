package migrations

import (
	"context"
	"fmt"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		return migrateStorageConfigKeysUp(ctx, db)
	}, func(ctx context.Context, db *bun.DB) error {
		return migrateStorageConfigKeysDown(ctx, db)
	})
}

// migrateStorageConfigKeysUp migrates old storage config keys to new prefixed format
func migrateStorageConfigKeysUp(ctx context.Context, db *bun.DB) error {
	// Define the key mappings from old to new format
	keyMappings := map[string]string{
		"config.file_base_dir":          "config.file_storage_base_dir",
		"config.file_mkdir_permissions": "config.file_storage_mkdir_permissions",
		"config.file_write_permissions": "config.file_storage_write_permissions",
		"config.s3_bucket":              "config.s3_storage_bucket",
		"config.s3_region":              "config.s3_storage_region",
		"config.s3_endpoint":            "config.s3_storage_endpoint",
		"config.s3_access_key_id":       "config.s3_storage_access_key_id",
		"config.s3_secret_access_key":   "config.s3_storage_secret_access_key",
		"config.s3_session_token":       "config.s3_storage_session_token",
		"config.s3_force_path_style":    "config.s3_storage_force_path_style",
		"config.s3_base_dir":            "config.s3_storage_base_dir",
	}

	// Use a transaction to ensure atomicity
	return db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		now := time.Now()

		// Update each key mapping
		for oldKey, newKey := range keyMappings {
			result, err := tx.NewUpdate().
				Model((*RegistryWithEncryption)(nil)).
				Set("key = ?", newKey).
				Set("updated_at = ?", now).
				Where("owner_id = ?", "system:global").
				Where("key = ?", oldKey).
				Exec(ctx)
			if err != nil {
				return fmt.Errorf("failed to update key %s to %s: %w", oldKey, newKey, err)
			}

			// Check if any rows were affected (optional logging)
			rowsAffected, err := result.RowsAffected()
			if err != nil {
				return fmt.Errorf("failed to get rows affected for key %s: %w", oldKey, err)
			}

			// Log if needed (rows affected will be 0 if key doesn't exist, which is fine)
			_ = rowsAffected // Suppress unused variable warning
		}

		return nil
	})
}

// migrateStorageConfigKeysDown reverts the migration by converting new prefixed keys back to old format
func migrateStorageConfigKeysDown(ctx context.Context, db *bun.DB) error {
	// Define the reverse key mappings from new to old format
	reverseKeyMappings := map[string]string{
		"config.file_storage_base_dir":          "config.file_base_dir",
		"config.file_storage_mkdir_permissions": "config.file_mkdir_permissions",
		"config.file_storage_write_permissions": "config.file_write_permissions",
		"config.s3_storage_bucket":              "config.s3_bucket",
		"config.s3_storage_region":              "config.s3_region",
		"config.s3_storage_endpoint":            "config.s3_endpoint",
		"config.s3_storage_access_key_id":       "config.s3_access_key_id",
		"config.s3_storage_secret_access_key":   "config.s3_secret_access_key",
		"config.s3_storage_session_token":       "config.s3_session_token",
		"config.s3_storage_force_path_style":    "config.s3_force_path_style",
		"config.s3_storage_base_dir":            "config.s3_base_dir",
	}

	// Use a transaction to ensure atomicity
	return db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		now := time.Now()

		// Update each key mapping in reverse
		for newKey, oldKey := range reverseKeyMappings {
			result, err := tx.NewUpdate().
				Model((*RegistryWithEncryption)(nil)).
				Set("key = ?", oldKey).
				Set("updated_at = ?", now).
				Where("owner_id = ?", "system:global").
				Where("key = ?", newKey).
				Exec(ctx)
			if err != nil {
				return fmt.Errorf("failed to revert key %s to %s: %w", newKey, oldKey, err)
			}

			// Check if any rows were affected (optional logging)
			rowsAffected, err := result.RowsAffected()
			if err != nil {
				return fmt.Errorf("failed to get rows affected for key %s: %w", newKey, err)
			}

			// Log if needed (rows affected will be 0 if key doesn't exist, which is fine)
			_ = rowsAffected // Suppress unused variable warning
		}

		return nil
	})
}
