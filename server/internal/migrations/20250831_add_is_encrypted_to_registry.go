package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Add is_encrypted column to registry table
		_, err := db.NewAddColumn().
			Model((*RegistryWithEncryption)(nil)).
			ColumnExpr("is_encrypted BOOLEAN NOT NULL DEFAULT FALSE").
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Drop is_encrypted column from registry table
		_, err := db.NewDropColumn().
			Model((*RegistryWithEncryption)(nil)).
			Column("is_encrypted").
			Exec(ctx)
		return err
	})
}

// RegistryWithEncryption represents the registry table with the is_encrypted column
type RegistryWithEncryption struct {
	bun.BaseModel `bun:"table:registry,alias:r"`

	ID          string    `bun:"id,pk,type:text"`
	OwnerID     string    `bun:"owner_id,notnull,type:text"`
	Key         string    `bun:"key,notnull"`
	Value       string    `bun:"value,notnull"`
	IsEncrypted bool      `bun:"is_encrypted,notnull,default:false"`
	CreatedAt   time.Time `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt   time.Time `bun:"updated_at,notnull,default:current_timestamp"`
}
