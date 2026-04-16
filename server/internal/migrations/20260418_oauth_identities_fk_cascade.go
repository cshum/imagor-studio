package migrations

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// SQLite does not support adding FK constraints via ALTER TABLE — skip in
		// test environments; the application-level orphan-recovery logic in
		// UpsertOAuth handles this case regardless of DB dialect.
		if db.Dialect().Name() == dialect.SQLite {
			return nil
		}

		// Add ON DELETE CASCADE so that deleting a user automatically removes
		// all associated oauth_identities, preventing the "orphaned identity"
		// scenario where UpsertOAuth fails with "no rows in result set".
		_, err := db.ExecContext(ctx, `
			ALTER TABLE oauth_identities
				DROP CONSTRAINT IF EXISTS fk_oauth_identities_user_id,
				ADD CONSTRAINT fk_oauth_identities_user_id
					FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		if db.Dialect().Name() == dialect.SQLite {
			return nil
		}
		_, err := db.ExecContext(ctx, `
			ALTER TABLE oauth_identities
				DROP CONSTRAINT IF EXISTS fk_oauth_identities_user_id
		`)
		return err
	})
}
