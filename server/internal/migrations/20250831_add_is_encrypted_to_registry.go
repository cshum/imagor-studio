package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Add is_encrypted column to registry table
		_, err := db.NewAddColumn().
			Model((*Registry)(nil)).
			ColumnExpr("is_encrypted BOOLEAN NOT NULL DEFAULT FALSE").
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Drop is_encrypted column from registry table
		_, err := db.NewDropColumn().
			Model((*Registry)(nil)).
			Column("is_encrypted").
			Exec(ctx)
		return err
	})
}
