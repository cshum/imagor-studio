package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		type SpaceMember struct {
			bun.BaseModel `bun:"table:space_members"`

			SpaceID   string    `bun:"space_id,pk,type:text"`
			UserID    string    `bun:"user_id,pk,type:text"`
			Role      string    `bun:"role,notnull,default:'member'"`
			CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
		}

		if _, err := db.NewCreateTable().
			Model((*SpaceMember)(nil)).
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		if _, err := db.NewCreateIndex().
			Model((*SpaceMember)(nil)).
			Index("idx_space_members_user_id").
			Column("user_id").
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		_, err := db.NewCreateIndex().
			Model((*SpaceMember)(nil)).
			Index("idx_space_members_space_id").
			Column("space_id").
			IfNotExists().
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		type SpaceMember struct {
			bun.BaseModel `bun:"table:space_members"`
		}

		if _, err := db.NewDropIndex().
			Model((*SpaceMember)(nil)).
			Index("idx_space_members_space_id").
			IfExists().
			Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewDropIndex().
			Model((*SpaceMember)(nil)).
			Index("idx_space_members_user_id").
			IfExists().
			Exec(ctx); err != nil {
			return err
		}
		_, err := db.NewDropTable().
			Model((*SpaceMember)(nil)).
			IfExists().
			Exec(ctx)
		return err
	})
}
