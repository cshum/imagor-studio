package registrystore

import (
	"context"
	"fmt"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

// getDatabaseDialect returns the current database dialect
func (s *store) getDatabaseDialect() dialect.Name {
	return s.db.Dialect().Name()
}

// upsertRegistry selects the appropriate upsert method based on the database dialect
func (s *store) upsertRegistry(ctx context.Context, db bun.IDB, modelEntry *model.Registry) error {
	dialectName := s.getDatabaseDialect()

	switch dialectName {
	case dialect.PG:
		return s.upsertPostgreSQL(ctx, db, modelEntry)
	case dialect.SQLite:
		return s.upsertSQLite(ctx, db, modelEntry)
	case dialect.MySQL:
		return s.upsertMySQL(ctx, db, modelEntry)
	default:
		return fmt.Errorf("unsupported database dialect: %s", dialectName.String())
	}
}

// upsertPostgreSQL handles upsert operations for PostgreSQL
func (s *store) upsertPostgreSQL(ctx context.Context, db bun.IDB, modelEntry *model.Registry) error {
	_, err := db.NewInsert().
		Model(modelEntry).
		On("CONFLICT (owner_id, key) DO UPDATE").
		Set("value = EXCLUDED.value").
		Set("updated_at = EXCLUDED.updated_at").
		Set("is_encrypted = EXCLUDED.is_encrypted").
		Exec(ctx)
	return err
}

// upsertSQLite handles upsert operations for SQLite
func (s *store) upsertSQLite(ctx context.Context, db bun.IDB, modelEntry *model.Registry) error {
	_, err := db.NewInsert().
		Model(modelEntry).
		On("CONFLICT (owner_id, key) DO UPDATE").
		Set("value = EXCLUDED.value").
		Set("updated_at = EXCLUDED.updated_at").
		Set("is_encrypted = EXCLUDED.is_encrypted").
		Exec(ctx)
	return err
}

// upsertMySQL handles upsert operations for MySQL
func (s *store) upsertMySQL(ctx context.Context, db bun.IDB, modelEntry *model.Registry) error {
	_, err := db.NewInsert().
		Model(modelEntry).
		On("DUPLICATE KEY UPDATE").
		Set("value = VALUES(value)").
		Set("updated_at = VALUES(updated_at)").
		Set("is_encrypted = VALUES(is_encrypted)").
		Exec(ctx)
	return err
}
