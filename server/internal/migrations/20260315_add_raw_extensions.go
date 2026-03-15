package migrations

import (
	"context"
	"strings"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/uptrace/bun"
)

// rawExtensions contains all RAW camera format extensions to append.
// Includes formats explicitly typed in imagor blob.go (RAF, ORF, RW2, X3F, CR3)
// as well as TIFF-based RAW formats supported by libvips/dcraw (DNG, NEF, ARW, etc.)
const rawExtensions = ",.raf,.orf,.rw2,.x3f,.cr3,.dng,.nef,.arw,.pef,.raw,.nrw,.srw,.erf,.mrw,.dcr,.kdc,.3fr,.mef,.iiq,.rwl,.sr2,.srf,.crw"

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Append new RAW camera format extensions to existing image extensions,
		// but only if the current value ends with ".cr2" (old default before this migration)
		// and doesn't already contain the new extensions.
		// Users with custom extension lists are not touched.
		var entry model.Registry
		err := db.NewSelect().
			Model(&entry).
			Where("key = ?", "config.app_image_extensions").
			Scan(ctx)
		if err != nil {
			// No entry found — nothing to migrate
			return nil
		}
		if (strings.HasSuffix(entry.Value, ".cr2") || strings.HasSuffix(entry.Value, ".cr3")) &&
			!strings.Contains(entry.Value, ".dng") {
			_, err = db.NewUpdate().
				Model((*model.Registry)(nil)).
				Set("value = ?", entry.Value+rawExtensions).
				Where("key = ?", "config.app_image_extensions").
				Exec(ctx)
			return err
		}
		return nil
	}, func(ctx context.Context, db *bun.DB) error {
		// Rollback: strip the new RAW extensions if they were appended by this migration.
		var entry model.Registry
		err := db.NewSelect().
			Model(&entry).
			Where("key = ?", "config.app_image_extensions").
			Scan(ctx)
		if err != nil {
			return nil
		}
		if strings.HasSuffix(entry.Value, rawExtensions) {
			stripped := strings.TrimSuffix(entry.Value, rawExtensions)
			_, err = db.NewUpdate().
				Model((*model.Registry)(nil)).
				Set("value = ?", stripped).
				Where("key = ?", "config.app_image_extensions").
				Exec(ctx)
			return err
		}
		return nil
	})
}
