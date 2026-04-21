package model

import (
	"time"

	"github.com/uptrace/bun"
)

// Space is the database model for a tenant space.
// Sensitive credential fields (AccessKeyID, SecretKey, ImagorSecret) are stored
// AES-GCM encrypted in the database and decrypted by spacestore before returning.
// A soft-delete via DeletedAt allows the processing service to learn about
// removals through the delta-sync endpoint without requiring hard deletes.
type Space struct {
	bun.BaseModel `bun:"table:spaces,alias:sp"`

	ID          string `bun:"id,pk,type:text"`
	OrgID       string `bun:"org_id,notnull,default:''"` // owning org; FK added when orgs table exists
	Key         string `bun:"key,notnull,unique"`
	Name        string `bun:"name,notnull,default:''"` // display name
	StorageMode string `bun:"storage_mode,notnull,default:'platform'"`
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

// SpaceMember is the database model for a user-to-space access grant.
// Composite PK: (space_id, user_id).
// Role values: "admin" | "member"
type SpaceMember struct {
	bun.BaseModel `bun:"table:space_members,alias:sm"`

	SpaceID   string    `bun:"space_id,pk,type:text"`
	UserID    string    `bun:"user_id,pk,type:text"`
	Role      string    `bun:"role,notnull,default:'member'"`
	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
}
