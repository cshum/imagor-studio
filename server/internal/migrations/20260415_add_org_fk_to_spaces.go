package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Remove the empty-string default from org_id now that every space must
		// reference a real organization.
		if _, err := db.ExecContext(ctx,
			`ALTER TABLE spaces ALTER COLUMN org_id DROP DEFAULT`,
		); err != nil {
			return err
		}

		// Add the foreign-key constraint.  Because the DB is fresh at this point
		// there are no orphaned rows, so this will always succeed.
		_, err := db.ExecContext(ctx, `
			ALTER TABLE spaces
			ADD CONSTRAINT fk_spaces_org_id
			FOREIGN KEY (org_id) REFERENCES organizations(id)
		`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Down: remove the FK and restore the permissive default.
		if _, err := db.ExecContext(ctx,
			`ALTER TABLE spaces DROP CONSTRAINT IF EXISTS fk_spaces_org_id`,
		); err != nil {
			return err
		}
		_, err := db.ExecContext(ctx,
			`ALTER TABLE spaces ALTER COLUMN org_id SET DEFAULT ''`,
		)
		return err
	})
}
