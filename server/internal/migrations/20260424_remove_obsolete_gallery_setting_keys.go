package migrations

import (
	"context"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/uptrace/bun"
)

var obsoleteGallerySettingKeys = []string{
	"config.app_image_extensions",
	"config.app_video_extensions",
	"config.app_show_hidden",
}

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.NewDelete().
			Model((*model.Registry)(nil)).
			Where("key IN (?)", bun.In(obsoleteGallerySettingKeys)).
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Data deletion is intentionally not reversible.
		return nil
	})
}
