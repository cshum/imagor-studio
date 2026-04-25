package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		type HostedStorageObject struct {
			bun.BaseModel `bun:"table:hosted_storage_objects"`

			ID        string    `bun:"id,pk,type:text"`
			OrgID     string    `bun:"org_id,notnull"`
			SpaceID   string    `bun:"space_id,notnull"`
			ObjectKey string    `bun:"object_key,notnull"`
			Status    string    `bun:"status,notnull"`
			SizeBytes int64     `bun:"size_bytes,notnull,default:0"`
			CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
			UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp"`
			ExpiresAt time.Time `bun:"expires_at,notnull"`
		}

		type HostedStorageUsage struct {
			bun.BaseModel `bun:"table:hosted_storage_usage"`

			OrgID     string    `bun:"org_id,pk,type:text"`
			SpaceID   string    `bun:"space_id,pk,type:text"`
			UsedBytes int64     `bun:"used_bytes,notnull,default:0"`
			CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
			UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp"`
		}

		if _, err := db.NewCreateTable().Model((*HostedStorageObject)(nil)).IfNotExists().Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewCreateIndex().
			Model((*HostedStorageObject)(nil)).
			Index("uidx_hosted_storage_objects_space_key").
			Unique().
			Column("space_id", "object_key").
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewCreateIndex().
			Model((*HostedStorageObject)(nil)).
			Index("idx_hosted_storage_objects_org_space_status").
			Column("org_id", "space_id", "status").
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		if _, err := db.NewCreateTable().Model((*HostedStorageUsage)(nil)).IfNotExists().Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewCreateIndex().
			Model((*HostedStorageUsage)(nil)).
			Index("idx_hosted_storage_usage_org_id").
			Column("org_id").
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}
		return nil
	}, func(ctx context.Context, db *bun.DB) error {
		type HostedStorageObject struct {
			bun.BaseModel `bun:"table:hosted_storage_objects"`
		}
		type HostedStorageUsage struct {
			bun.BaseModel `bun:"table:hosted_storage_usage"`
		}

		if _, err := db.NewDropTable().Model((*HostedStorageUsage)(nil)).IfExists().Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewDropTable().Model((*HostedStorageObject)(nil)).IfExists().Exec(ctx); err != nil {
			return err
		}
		return nil
	})
}
