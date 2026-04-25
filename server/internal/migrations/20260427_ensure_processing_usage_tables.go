package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		type ProcessingUsage struct {
			bun.BaseModel `bun:"table:processing_usage"`

			OrgID          string    `bun:"org_id,pk,type:text"`
			SpaceID        string    `bun:"space_id,pk,type:text"`
			BucketStartAt  time.Time `bun:"bucket_start_at,pk,notnull"`
			ProcessedCount int64     `bun:"processed_count,notnull,default:0"`
			CreatedAt      time.Time `bun:"created_at,notnull,default:current_timestamp"`
			UpdatedAt      time.Time `bun:"updated_at,notnull,default:current_timestamp"`
		}

		type ProcessingUsageBatch struct {
			bun.BaseModel `bun:"table:processing_usage_batches"`

			BatchID    string    `bun:"batch_id,pk,type:text"`
			NodeID     string    `bun:"node_id,notnull"`
			ReceivedAt time.Time `bun:"received_at,notnull,default:current_timestamp"`
			AppliedAt  time.Time `bun:"applied_at,notnull,default:current_timestamp"`
			ItemCount  int       `bun:"item_count,notnull,default:0"`
		}

		if _, err := db.NewCreateTable().Model((*ProcessingUsage)(nil)).IfNotExists().Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewCreateIndex().Model((*ProcessingUsage)(nil)).Index("idx_processing_usage_space_bucket").Column("space_id", "bucket_start_at").IfNotExists().Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewCreateIndex().Model((*ProcessingUsage)(nil)).Index("idx_processing_usage_org_bucket").Column("org_id", "bucket_start_at").IfNotExists().Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewCreateTable().Model((*ProcessingUsageBatch)(nil)).IfNotExists().Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewCreateIndex().Model((*ProcessingUsageBatch)(nil)).Index("idx_processing_usage_batches_received_at").Column("received_at").IfNotExists().Exec(ctx); err != nil {
			return err
		}
		return nil
	}, func(ctx context.Context, db *bun.DB) error {
		type ProcessingUsage struct {
			bun.BaseModel `bun:"table:processing_usage"`
		}
		type ProcessingUsageBatch struct {
			bun.BaseModel `bun:"table:processing_usage_batches"`
		}

		if _, err := db.NewDropTable().Model((*ProcessingUsageBatch)(nil)).IfExists().Exec(ctx); err != nil {
			return err
		}
		if _, err := db.NewDropTable().Model((*ProcessingUsage)(nil)).IfExists().Exec(ctx); err != nil {
			return err
		}
		return nil
	})
}
