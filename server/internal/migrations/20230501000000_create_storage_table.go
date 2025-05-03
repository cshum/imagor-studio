package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.NewCreateTable().Model((*Storage)(nil)).IfNotExists().Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.NewDropTable().Model((*Storage)(nil)).IfExists().Exec(ctx)
		return err
	})
}

type Storage struct {
	bun.BaseModel `bun:"table:storages,alias:s"`

	ID     int64  `bun:"id,pk,autoincrement"`
	Key    string `bun:"key,unique"`
	Name   string `bun:"name"`
	Type   string `bun:"type"`
	Config string `bun:"config"`
}
