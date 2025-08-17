package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Create users table
		_, err := db.NewCreateTable().
			Model((*User)(nil)).
			IfNotExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		// Create unique constraint on username
		_, err = db.NewCreateIndex().
			Model((*User)(nil)).
			Index("idx_users_username").
			Unique().
			Column("username").
			Exec(ctx)
		if err != nil {
			return err
		}

		// Create unique constraint on email
		_, err = db.NewCreateIndex().
			Model((*User)(nil)).
			Index("idx_users_email").
			Unique().
			Column("email").
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Drop the indices
		_, err := db.NewDropIndex().
			Model((*User)(nil)).
			Index("idx_users_email").
			IfExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		_, err = db.NewDropIndex().
			Model((*User)(nil)).
			Index("idx_users_username").
			IfExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		// Drop the table
		_, err = db.NewDropTable().
			Model((*User)(nil)).
			IfExists().
			Exec(ctx)
		return err
	})
}

type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	ID             string    `bun:"id,pk,type:text"`
	Username       string    `bun:"username,notnull"`
	Email          string    `bun:"email,notnull"`
	HashedPassword string    `bun:"hashed_password,notnull"`
	Role           string    `bun:"role,notnull,default:'user'"`
	IsActive       bool      `bun:"is_active,notnull,default:true"`
	CreatedAt      time.Time `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt      time.Time `bun:"updated_at,notnull,default:current_timestamp"`
}
