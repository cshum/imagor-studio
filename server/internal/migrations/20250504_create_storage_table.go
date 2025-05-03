package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Create storages table with UUID columns
		_, err := db.NewCreateTable().
			Model((*Storage)(nil)).
			IfNotExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		// Create unique constraint on owner_id + key
		// This index can also be used for queries filtering by owner_id alone
		_, err = db.NewCreateIndex().
			Model((*Storage)(nil)).
			Index("idx_storages_owner_id_key").
			Unique().
			Column("owner_id", "key").
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Drop the composite index
		_, err := db.NewDropIndex().
			Model((*Storage)(nil)).
			Index("idx_storages_owner_id_key").
			IfExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		// Drop the table
		_, err = db.NewDropTable().
			Model((*Storage)(nil)).
			IfExists().
			Exec(ctx)
		return err
	})
}

type Storage struct {
	bun.BaseModel `bun:"table:storages,alias:s"`

	ID      string `bun:"id,pk,type:text"`
	OwnerID string `bun:"owner_id,notnull,type:text"`
	Key     string `bun:"key,notnull"`
	Name    string `bun:"name,notnull"`
	Type    string `bun:"type,notnull"`
	Config  string `bun:"config,notnull"`
}
