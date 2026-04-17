package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.NewCreateTable().
			Model((*OAuthIdentity)(nil)).
			IfNotExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		// Unique index on (provider, provider_id) — one identity per provider per user
		_, err = db.NewCreateIndex().
			Model((*OAuthIdentity)(nil)).
			Index("idx_oauth_identities_provider").
			Unique().
			Column("provider", "provider_id").
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		if _, err := db.NewDropIndex().
			Model((*OAuthIdentity)(nil)).
			Index("idx_oauth_identities_provider").
			IfExists().
			Exec(ctx); err != nil {
			return err
		}
		_, err := db.NewDropTable().
			Model((*OAuthIdentity)(nil)).
			IfExists().
			Exec(ctx)
		return err
	})
}

type OAuthIdentity struct {
	bun.BaseModel `bun:"table:oauth_identities,alias:oi"`

	ID         string    `bun:"id,pk,type:text"`
	UserID     string    `bun:"user_id,notnull,type:text"`
	Provider   string    `bun:"provider,notnull,type:text"`    // 'google'
	ProviderID string    `bun:"provider_id,notnull,type:text"` // Google sub
	Email      string    `bun:"email,type:text"`
	CreatedAt  time.Time `bun:"created_at,notnull,default:current_timestamp"`
}
