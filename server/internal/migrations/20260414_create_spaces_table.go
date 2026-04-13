package migrations

import (
	"context"
	"time"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// Local struct scoped to this migration to avoid coupling to model package.
		type Space struct {
			bun.BaseModel `bun:"table:spaces"`

			ID              string     `bun:"id,pk,type:text"`
			Key             string     `bun:"key,notnull,unique"`
			Bucket          string     `bun:"bucket,notnull,default:''"`
			Prefix          string     `bun:"prefix,notnull,default:''"`
			Region          string     `bun:"region,notnull,default:''"`
			Endpoint        string     `bun:"endpoint,notnull,default:''"`
			AccessKeyID     string     `bun:"access_key_id,notnull,default:''"`
			SecretKey       string     `bun:"secret_key,notnull,default:''"`
			UsePathStyle    bool       `bun:"use_path_style,notnull,default:false"`
			CustomDomain    string     `bun:"custom_domain,notnull,default:''"`
			Suspended       bool       `bun:"suspended,notnull,default:false"`
			SignerAlgorithm string     `bun:"signer_algorithm,notnull,default:'sha1'"`
			SignerTruncate  int        `bun:"signer_truncate,notnull,default:0"`
			ImagorSecret    string     `bun:"imagor_secret,notnull,default:''"`
			CreatedAt       time.Time  `bun:"created_at,notnull,default:current_timestamp"`
			UpdatedAt       time.Time  `bun:"updated_at,notnull,default:current_timestamp"`
			DeletedAt       *time.Time `bun:"deleted_at,nullzero"`
		}

		if _, err := db.NewCreateTable().
			Model((*Space)(nil)).
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		// Index on updated_at powers efficient delta queries (WHERE updated_at > since).
		if _, err := db.NewCreateIndex().
			Model((*Space)(nil)).
			Index("idx_spaces_updated_at").
			Column("updated_at").
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		// Index on key for lookups.
		_, err := db.NewCreateIndex().
			Model((*Space)(nil)).
			Index("idx_spaces_key").
			Column("key").
			IfNotExists().
			Exec(ctx)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		type Space struct {
			bun.BaseModel `bun:"table:spaces"`
		}
		_, err := db.NewDropTable().
			Model((*Space)(nil)).
			IfExists().
			Exec(ctx)
		return err
	})
}
