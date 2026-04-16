package migrations

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Add email column (nullable — self-hosted users have no email)
		if _, err := db.ExecContext(ctx,
			`ALTER TABLE users ADD COLUMN email TEXT`,
		); err != nil {
			return err
		}

		// Add avatar_url column (nullable)
		if _, err := db.ExecContext(ctx,
			`ALTER TABLE users ADD COLUMN avatar_url TEXT`,
		); err != nil {
			return err
		}

		// Unique partial index so two real users can't share an email,
		// but NULLs (self-hosted only users) are not affected.
		_, err := db.ExecContext(ctx,
			`CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL`,
		)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		if _, err := db.ExecContext(ctx,
			`DROP INDEX IF EXISTS idx_users_email`,
		); err != nil {
			return err
		}
		// SQLite does not support DROP COLUMN — skip on SQLite (tests use fresh DB)
		if db.Dialect().Name() != dialect.SQLite {
			if _, err := db.ExecContext(ctx,
				`ALTER TABLE users DROP COLUMN avatar_url`,
			); err != nil {
				return err
			}
			if _, err := db.ExecContext(ctx,
				`ALTER TABLE users DROP COLUMN email`,
			); err != nil {
				return err
			}
		}
		return nil
	})
}
