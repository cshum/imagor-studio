package migrations

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		exists, err := columnExists(ctx, db, "spaces", "storage_mode")
		if err != nil {
			return err
		}
		if exists {
			return nil
		}

		_, err = db.ExecContext(ctx,
			`ALTER TABLE spaces ADD COLUMN storage_mode TEXT NOT NULL DEFAULT 'platform'`,
		)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		exists, err := columnExists(ctx, db, "spaces", "storage_mode")
		if err != nil {
			return err
		}
		if !exists {
			return nil
		}

		if db.Dialect().Name() == dialect.SQLite {
			return nil
		}

		_, err = db.ExecContext(ctx,
			`ALTER TABLE spaces DROP COLUMN IF EXISTS storage_mode`,
		)
		return err
	})
}

func columnExists(ctx context.Context, db *bun.DB, tableName, columnName string) (bool, error) {
	var count int

	switch db.Dialect().Name() {
	case dialect.SQLite:
		if err := db.QueryRowContext(ctx,
			fmt.Sprintf(`SELECT COUNT(*) FROM pragma_table_info('%s') WHERE name = ?`, tableName),
			columnName,
		).Scan(&count); err != nil {
			return false, err
		}
	default:
		if err := db.QueryRowContext(ctx,
			`SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?`,
			tableName,
			columnName,
		).Scan(&count); err != nil {
			return false, err
		}
	}

	return count > 0, nil
}
