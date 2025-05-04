package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Create metadata table
		_, err := db.NewCreateTable().
			Model((*Metadata)(nil)).
			IfNotExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		// Create unique constraint on owner_id + key
		_, err = db.NewCreateIndex().
			Model((*Metadata)(nil)).
			Index("idx_metadata_owner_id_key").
			Unique().
			Column("owner_id", "key").
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Drop the composite index
		_, err := db.NewDropIndex().
			Model((*Metadata)(nil)).
			Index("idx_metadata_owner_id_key").
			IfExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		// Drop the table
		_, err = db.NewDropTable().
			Model((*Metadata)(nil)).
			IfExists().
			Exec(ctx)
		return err
	})
}

type Metadata struct {
	bun.BaseModel `bun:"table:metadata,alias:m"`

	ID        string    `bun:"id,pk,type:text"`
	OwnerID   string    `bun:"owner_id,notnull,type:text"`
	Key       string    `bun:"key,notnull"`
	Value     string    `bun:"value,notnull"`
	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp"`
}
