package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, "ALTER TABLE spaces ADD COLUMN imagor_cors_origins TEXT NOT NULL DEFAULT ''")
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, "ALTER TABLE spaces DROP COLUMN imagor_cors_origins")
		return err
	})
}
