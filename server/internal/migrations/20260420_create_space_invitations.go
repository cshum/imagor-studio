package migrations

import (
	"context"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.NewCreateTable().
			Model((*model.SpaceInvitation)(nil)).
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
		_, err := db.NewDropTable().Model((*model.SpaceInvitation)(nil)).IfExists().Exec(ctx)
		return err
	})
}
