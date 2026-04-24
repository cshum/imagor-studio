package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

type spaceInvitation20260420 struct {
	bun.BaseModel `bun:"table:space_invitations,alias:si"`

	ID              string     `bun:"id,pk,type:text"`
	OrgID           string     `bun:"org_id,notnull,type:text"`
	SpaceKey        string     `bun:"space_key,notnull,type:text"`
	Email           string     `bun:"email,notnull,type:text"`
	Role            string     `bun:"role,notnull,type:text"`
	Token           string     `bun:"token,notnull,type:text,unique"`
	InvitedByUserID string     `bun:"invited_by_user_id,notnull,type:text"`
	AcceptedAt      *time.Time `bun:"accepted_at,type:timestamptz"`
	ExpiresAt       time.Time  `bun:"expires_at,notnull"`
	CreatedAt       time.Time  `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt       time.Time  `bun:"updated_at,notnull,default:current_timestamp"`
}

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.NewCreateTable().
			Model((*spaceInvitation20260420)(nil)).
			IfNotExists().
			Exec(ctx)
		if err != nil {
			return err
		}

		indexes := []string{
			"CREATE UNIQUE INDEX IF NOT EXISTS idx_space_invitations_token ON space_invitations (token)",
			"CREATE INDEX IF NOT EXISTS idx_space_invitations_space_key ON space_invitations (space_key)",
			"CREATE INDEX IF NOT EXISTS idx_space_invitations_org_id ON space_invitations (org_id)",
			"CREATE INDEX IF NOT EXISTS idx_space_invitations_email ON space_invitations (email)",
		}
		for _, query := range indexes {
			if _, err := db.ExecContext(ctx, query); err != nil {
				return err
			}
		}
		return nil
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.NewDropTable().Model((*spaceInvitation20260420)(nil)).IfExists().Exec(ctx)
		return err
	})
}
