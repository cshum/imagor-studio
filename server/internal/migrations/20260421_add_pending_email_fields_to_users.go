package migrations

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		if _, err := db.ExecContext(ctx,
			`ALTER TABLE users ADD COLUMN pending_email TEXT`,
		); err != nil {
			return err
		}

		if _, err := db.ExecContext(ctx,
			`ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE`,
		); err != nil {
			return err
		}

		_, err := db.ExecContext(ctx,
			`CREATE UNIQUE INDEX idx_users_pending_email ON users(pending_email) WHERE pending_email IS NOT NULL`,
		)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		if _, err := db.ExecContext(ctx,
			`DROP INDEX IF EXISTS idx_users_pending_email`,
		); err != nil {
			return err
		}

		if db.Dialect().Name() != dialect.SQLite {
			if _, err := db.ExecContext(ctx,
				`ALTER TABLE users DROP COLUMN email_verified`,
			); err != nil {
				return err
			}

			if _, err := db.ExecContext(ctx,
				`ALTER TABLE users DROP COLUMN pending_email`,
			); err != nil {
				return err
			}
		}

		return nil
	})
}
