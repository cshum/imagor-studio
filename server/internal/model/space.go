package model

import (
	"time"

	"github.com/uptrace/bun"
)

// Space is the database model for a SaaS tenant space.
// Sensitive credential fields (AccessKeyID, SecretKey, ImagorSecret) are stored
// AES-GCM encrypted in the database and decrypted by spacestore before returning.
// A soft-delete via DeletedAt allows the processing service to learn about
// removals through the delta-sync endpoint without requiring hard deletes.
type Space struct {
	bun.BaseModel `bun:"table:spaces,alias:sp"`

	ID              string     `bun:"id,pk,type:text"`
	Key             string     `bun:"key,notnull,unique"`
	Bucket          string     `bun:"bucket,notnull,default:''"`
	Prefix          string     `bun:"prefix,notnull,default:''"`
	Region          string     `bun:"region,notnull,default:''"`
	Endpoint        string     `bun:"endpoint,notnull,default:''"`
	AccessKeyID     string     `bun:"access_key_id,notnull,default:''"` // encrypted at rest
	SecretKey       string     `bun:"secret_key,notnull,default:''"`    // encrypted at rest
	UsePathStyle    bool       `bun:"use_path_style,notnull,default:false"`
	CustomDomain    string     `bun:"custom_domain,notnull,default:''"`
	Suspended       bool       `bun:"suspended,notnull,default:false"`
	SignerAlgorithm string     `bun:"signer_algorithm,notnull,default:'sha1'"`
	SignerTruncate  int        `bun:"signer_truncate,notnull,default:0"`
	ImagorSecret    string     `bun:"imagor_secret,notnull,default:''"` // encrypted at rest
	CreatedAt       time.Time  `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt       time.Time  `bun:"updated_at,notnull,default:current_timestamp"`
	DeletedAt       *time.Time `bun:"deleted_at,nullzero"` // NULL = active; non-NULL = soft-deleted
}
