package migrations

import (
	"context"

	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Rename app_file_extensions to app_image_extensions
		_, err := db.Exec("UPDATE registry SET key = 'config.app_image_extensions' WHERE key = 'config.app_file_extensions'")
		if err != nil {
			return err
		}

		// Add default video extensions entry
		_, err = db.Exec(`
			INSERT INTO registry (id, owner_id, key, value, is_encrypted, created_at, updated_at) 
			VALUES (?, '', 'config.app_video_extensions', '.mp4,.webm,.avi,.mov,.mkv,.m4v,.3gp,.flv,.wmv,.mpg,.mpeg', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT (owner_id, key) DO NOTHING
		`, uuid.GenerateUUID())
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Rollback: rename back to app_file_extensions and remove video extensions
		_, err := db.Exec("UPDATE registry SET key = 'config.app_file_extensions' WHERE key = 'config.app_image_extensions'")
		if err != nil {
			return err
		}
		_, err = db.Exec("DELETE FROM registry WHERE key = 'config.app_video_extensions'")
		return err
	})
}
