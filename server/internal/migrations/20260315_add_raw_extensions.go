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

// cr2RawExtensions is used when .cr2 is not present at all — prepends .cr2 before
// the rest of the RAW extensions so the full set is added in one operation.
const cr2RawExtensions = ",.cr2" + rawExtensions

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Append new RAW camera format extensions to existing image extensions.
		// Guard: skip if .dng is already present (migration already ran or custom list).
		// - Ends with .cr2 → append rawExtensions (cr2 already there)
		// - Ends with .cr3 → append rawExtensions (cr2 already there via rawExtensions path)
		// - Missing .cr2 entirely → append cr2RawExtensions (adds .cr2 + all RAW formats)
		// Users with .dng in their custom list are not touched.
		var entry model.Registry
		err := db.NewSelect().
			Model(&entry).
			Where("key = ?", "config.app_image_extensions").
			Scan(ctx)
		if err != nil {
			// No entry found — nothing to migrate
			return nil
		}
		if strings.Contains(entry.Value, ".dng") {
			// Already migrated or custom list — skip
			return nil
		}
		var suffix string
		if strings.HasSuffix(entry.Value, ".cr2") || strings.HasSuffix(entry.Value, ".cr3") {
			suffix = rawExtensions
		} else {
			// .cr2 not present — include it along with all other RAW extensions
			suffix = cr2RawExtensions
		}
		_, err = db.NewUpdate().
			Model((*model.Registry)(nil)).
			Set("value = ?", entry.Value+suffix).
			Where("key = ?", "config.app_image_extensions").
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Rollback: strip the extensions added by this migration.
		// Check the longer suffix (cr2RawExtensions) first to avoid a partial strip.
		var entry model.Registry
		err := db.NewSelect().
			Model(&entry).
			Where("key = ?", "config.app_image_extensions").
			Scan(ctx)
		if err != nil {
			return nil
		}
		var stripped string
		if strings.HasSuffix(entry.Value, cr2RawExtensions) {
			stripped = strings.TrimSuffix(entry.Value, cr2RawExtensions)
		} else if strings.HasSuffix(entry.Value, rawExtensions) {
			stripped = strings.TrimSuffix(entry.Value, rawExtensions)
		} else {
			return nil
		}
		_, err = db.NewUpdate().
			Model((*model.Registry)(nil)).
			Set("value = ?", stripped).
			Where("key = ?", "config.app_image_extensions").
			Exec(ctx)
		return err
	})
}
