package migrations

import (
	"context"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Rename app_file_extensions to app_image_extensions
		_, err := db.NewUpdate().
			Model((*model.Registry)(nil)).
			Set("key = ?", "config.app_image_extensions").
			Where("key = ?", "config.app_file_extensions").
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Rollback: rename back to app_file_extensions and remove any video extensions entry
		_, err := db.NewUpdate().
			Model((*model.Registry)(nil)).
			Set("key = ?", "config.app_file_extensions").
			Where("key = ?", "config.app_image_extensions").
			Exec(ctx)
		if err != nil {
			return err
		}

		// Clean up any video extensions entry that might exist
		_, err = db.NewDelete().
			Model((*model.Registry)(nil)).
			Where("key = ?", "config.app_video_extensions").
			Exec(ctx)
		return err
	})
}
