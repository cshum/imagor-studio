package migrations

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		hasSpaceID, err := tableHasColumn(ctx, db, "space_invitations", "space_id")
		if err != nil {
			return err
		}
		if !hasSpaceID {
			if _, err := db.ExecContext(ctx, "ALTER TABLE space_invitations ADD COLUMN space_id text NOT NULL DEFAULT ''"); err != nil {
				return err
			}
		}
		if _, err := db.ExecContext(ctx, "DROP INDEX IF EXISTS idx_space_invitations_space_key"); err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, "CREATE INDEX IF NOT EXISTS idx_space_invitations_space_id ON space_invitations (space_id)"); err != nil {
			return err
		}
		hasSpaceKey, err := tableHasColumn(ctx, db, "space_invitations", "space_key")
		if err != nil {
			return err
		}
		if hasSpaceKey {
			if _, err := db.ExecContext(ctx, "ALTER TABLE space_invitations DROP COLUMN space_key"); err != nil {
				return err
			}
		}
		return nil
	}, func(ctx context.Context, db *bun.DB) error {
		hasSpaceKey, err := tableHasColumn(ctx, db, "space_invitations", "space_key")
		if err != nil {
			return err
		}
		if !hasSpaceKey {
			if _, err := db.ExecContext(ctx, "ALTER TABLE space_invitations ADD COLUMN space_key text NOT NULL DEFAULT ''"); err != nil {
				return err
			}
		}
		if _, err := db.ExecContext(ctx, "DROP INDEX IF EXISTS idx_space_invitations_space_id"); err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, "CREATE INDEX IF NOT EXISTS idx_space_invitations_space_key ON space_invitations (space_key)"); err != nil {
			return err
		}
		hasSpaceID, err := tableHasColumn(ctx, db, "space_invitations", "space_id")
		if err != nil {
			return err
		}
		if hasSpaceID {
			if _, err := db.ExecContext(ctx, "ALTER TABLE space_invitations DROP COLUMN space_id"); err != nil {
				return err
			}
		}
		return nil
	})
}

func tableHasColumn(ctx context.Context, db *bun.DB, tableName, columnName string) (bool, error) {
	rows, err := db.QueryContext(ctx, fmt.Sprintf("PRAGMA table_info(%s)", tableName))
	if err != nil {
		return false, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			cid        int
			name       string
			columnType string
			notNull    int
			defaultVal any
			pk         int
		)
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultVal, &pk); err != nil {
			return false, err
		}
		if name == columnName {
			return true, nil
		}
	}

	if err := rows.Err(); err != nil {
		return false, err
	}

	return false, nil
}
