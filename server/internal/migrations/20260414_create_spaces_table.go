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

			ID          string `bun:"id,pk,type:text"`
			OrgID       string `bun:"org_id,notnull,default:''"` // owning org; FK added when orgs table exists
			Key         string `bun:"key,notnull,unique"`
			Name        string `bun:"name,notnull,default:''"`           // display name
			StorageType string `bun:"storage_type,notnull,default:'s3'"` // "managed" | "s3" | "r2"

			// Storage config
			Bucket       string `bun:"bucket,notnull,default:''"`
			Prefix       string `bun:"prefix,notnull,default:''"`
			Region       string `bun:"region,notnull,default:''"`
			Endpoint     string `bun:"endpoint,notnull,default:''"`
			AccessKeyID  string `bun:"access_key_id,notnull,default:''"` // encrypted at rest
			SecretKey    string `bun:"secret_key,notnull,default:''"`    // encrypted at rest
			UsePathStyle bool   `bun:"use_path_style,notnull,default:false"`

			// Routing & status
			CustomDomain         string `bun:"custom_domain,nullzero,unique"` // NULL = no custom domain
			CustomDomainVerified bool   `bun:"custom_domain_verified,notnull,default:false"`
			Suspended            bool   `bun:"suspended,notnull,default:false"`
			IsShared             bool   `bun:"is_shared,notnull,default:false"` // true = all org members can browse & copy

			// Imagor signing
			SignerAlgorithm string `bun:"signer_algorithm,notnull,default:'sha256'"` // "sha1" | "sha256" | "sha512"
			SignerTruncate  int    `bun:"signer_truncate,notnull,default:32"`
			ImagorSecret    string `bun:"imagor_secret,notnull,default:''"` // encrypted at rest

			CreatedAt time.Time  `bun:"created_at,notnull,default:current_timestamp"`
			UpdatedAt time.Time  `bun:"updated_at,notnull,default:current_timestamp"`
			DeletedAt *time.Time `bun:"deleted_at,nullzero"` // NULL = active; non-NULL = soft-deleted
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
		if _, err := db.NewCreateIndex().
			Model((*Space)(nil)).
			Index("idx_spaces_key").
			Column("key").
			IfNotExists().
			Exec(ctx); err != nil {
			return err
		}

		// Index on org_id for org-scoped queries.
		_, err := db.NewCreateIndex().
			Model((*Space)(nil)).
			Index("idx_spaces_org_id").
			Column("org_id").
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
