// Package spacestore manages the tenant spaces table.
//
// Each Space holds the S3 credentials and imagor signing secret for one tenant.
// Sensitive fields (AccessKeyID, SecretKey, ImagorSecret) are stored AES-GCM
// encrypted in the database via encryption.Service and transparently decrypted
// on read so callers always receive plaintext values.
//
// Soft-deletes (DeletedAt != nil) are used instead of hard-deletes so the
// processing service can learn about removed spaces via the delta endpoint.
package spacestore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/apperror"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
)

// Space is the application-level representation of a tenant space.
// All sensitive credential fields are plaintext; encryption/decryption is
// handled internally by the store.
type Space struct {
	OrgID       string
	Key         string
	Name        string
	StorageType string

	// Storage config
	Bucket       string
	Prefix       string
	Region       string
	Endpoint     string
	AccessKeyID  string
	SecretKey    string
	UsePathStyle bool

	// Routing & status
	CustomDomain         string
	CustomDomainVerified bool
	Suspended            bool
	IsShared             bool

	// Imagor signing
	SignerAlgorithm string
	SignerTruncate  int
	ImagorSecret    string

	UpdatedAt time.Time
	DeletedAt *time.Time
}

// DeltaResult is the output of a delta query.
type DeltaResult struct {
	// Upserted lists active spaces (DeletedAt is nil) that changed since the cursor.
	Upserted []*Space
	// Deleted lists the keys of spaces that were soft-deleted since the cursor.
	Deleted []string
	// ServerTime is the time at which the query was executed (use as the next cursor).
	ServerTime time.Time
}

// Store is the interface exposed to other packages.
type Store interface {
	// Create inserts a brand-new space. Returns a Conflict error if the key already exists
	// (regardless of which org owns it), so that duplicate-key attempts surface as a proper
	// field-level error rather than a silent overwrite.
	Create(ctx context.Context, s *Space) error
	// Upsert creates or fully replaces a space by key.
	Upsert(ctx context.Context, s *Space) error
	// SoftDelete marks a space as deleted without removing the row.
	SoftDelete(ctx context.Context, key string) error
	// Get returns a single active space by key, or nil when not found.
	Get(ctx context.Context, key string) (*Space, error)
	// List returns all active (non-deleted) spaces.
	List(ctx context.Context) ([]*Space, error)
	// ListByOrgID returns all active spaces belonging to the given org.
	ListByOrgID(ctx context.Context, orgID string) ([]*Space, error)
	// Delta returns all spaces (active and deleted) whose updated_at > since.
	// Pass the zero time to request a full sync.
	Delta(ctx context.Context, since time.Time) (*DeltaResult, error)
}

// dnsLabelRE validates that a space key is a valid DNS label:
// lowercase letters, digits, and hyphens only; starts and ends with
// an alphanumeric character; maximum 63 characters.
// This ensures the key works as a subdomain label (e.g. "acme" in "acme.imagor.app").
var dnsLabelRE = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)

// validateSpaceKey returns an error if key is not a valid DNS label.
func validateSpaceKey(key string) error {
	if key == "" {
		return fmt.Errorf("space key must not be empty")
	}
	if len(key) > 63 {
		return fmt.Errorf("space key %q exceeds the 63-character DNS label limit", key)
	}
	if !dnsLabelRE.MatchString(key) {
		return fmt.Errorf("space key %q must contain only lowercase letters, digits, and hyphens, and must start and end with an alphanumeric character", key)
	}
	return nil
}

type store struct {
	db         *bun.DB
	encryption *encryption.Service
}

// New creates a new space store. encryptionService may be nil, in which case
// sensitive fields are stored and returned as plaintext (useful for tests).
func New(db *bun.DB, encryptionService *encryption.Service) Store {
	return &store{
		db:         db,
		encryption: encryptionService,
	}
}

// ---------- helpers ----------------------------------------------------------

func (s *store) encrypt(value string) (string, error) {
	if s.encryption == nil || value == "" {
		return value, nil
	}
	return s.encryption.EncryptWithJWT(value)
}

func (s *store) decrypt(value string) (string, error) {
	if s.encryption == nil || value == "" {
		return value, nil
	}
	return s.encryption.DecryptWithJWT(value)
}

// modelToApp converts a DB row to application-level Space, decrypting credentials.
func (s *store) modelToApp(row *model.Space) (*Space, error) {
	accessKeyID, err := s.decrypt(row.AccessKeyID)
	if err != nil {
		return nil, fmt.Errorf("decrypt access_key_id for space %s: %w", row.Key, err)
	}
	secretKey, err := s.decrypt(row.SecretKey)
	if err != nil {
		return nil, fmt.Errorf("decrypt secret_key for space %s: %w", row.Key, err)
	}
	imagorSecret, err := s.decrypt(row.ImagorSecret)
	if err != nil {
		return nil, fmt.Errorf("decrypt imagor_secret for space %s: %w", row.Key, err)
	}
	return &Space{
		OrgID:                row.OrgID,
		Key:                  row.Key,
		Name:                 row.Name,
		StorageType:          row.StorageType,
		Bucket:               row.Bucket,
		Prefix:               row.Prefix,
		Region:               row.Region,
		Endpoint:             row.Endpoint,
		AccessKeyID:          accessKeyID,
		SecretKey:            secretKey,
		UsePathStyle:         row.UsePathStyle,
		CustomDomain:         row.CustomDomain,
		CustomDomainVerified: row.CustomDomainVerified,
		Suspended:            row.Suspended,
		IsShared:             row.IsShared,
		SignerAlgorithm:      row.SignerAlgorithm,
		SignerTruncate:       row.SignerTruncate,
		ImagorSecret:         imagorSecret,
		UpdatedAt:            row.UpdatedAt,
		DeletedAt:            row.DeletedAt,
	}, nil
}

// isDuplicateKeyError reports whether err came from a unique-constraint violation
// on the key column (works for both SQLite and PostgreSQL).
func isDuplicateKeyError(err error) bool {
	msg := err.Error()
	return strings.Contains(msg, "UNIQUE constraint failed") || // SQLite
		strings.Contains(msg, "duplicate key value violates unique constraint") // PostgreSQL
}

// ---------- Store implementation ---------------------------------------------

// Create inserts a brand-new space. If the key already exists (active or
// soft-deleted, same org or different org) it returns apperror.Conflict with
// field="key" so the caller can surface a field-level error to the user.
func (s *store) Create(ctx context.Context, sp *Space) error {
	if err := validateSpaceKey(sp.Key); err != nil {
		return fmt.Errorf("invalid space key: %w", err)
	}

	encAccessKeyID, err := s.encrypt(sp.AccessKeyID)
	if err != nil {
		return fmt.Errorf("encrypt access_key_id: %w", err)
	}
	encSecretKey, err := s.encrypt(sp.SecretKey)
	if err != nil {
		return fmt.Errorf("encrypt secret_key: %w", err)
	}
	encImagorSecret, err := s.encrypt(sp.ImagorSecret)
	if err != nil {
		return fmt.Errorf("encrypt imagor_secret: %w", err)
	}

	signerAlg := sp.SignerAlgorithm
	if signerAlg == "" {
		signerAlg = "sha256"
	}
	storageType := sp.StorageType
	if storageType == "" {
		storageType = "s3"
	}

	now := time.Now().UTC()
	row := &model.Space{
		ID:                   uuid.GenerateUUID(),
		OrgID:                sp.OrgID,
		Key:                  sp.Key,
		Name:                 sp.Name,
		StorageType:          storageType,
		Bucket:               sp.Bucket,
		Prefix:               sp.Prefix,
		Region:               sp.Region,
		Endpoint:             sp.Endpoint,
		AccessKeyID:          encAccessKeyID,
		SecretKey:            encSecretKey,
		UsePathStyle:         sp.UsePathStyle,
		CustomDomain:         sp.CustomDomain,
		CustomDomainVerified: sp.CustomDomainVerified,
		Suspended:            sp.Suspended,
		IsShared:             sp.IsShared,
		SignerAlgorithm:      signerAlg,
		SignerTruncate:       sp.SignerTruncate,
		ImagorSecret:         encImagorSecret,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	if _, err = s.db.NewInsert().Model(row).Exec(ctx); err != nil {
		if isDuplicateKeyError(err) {
			return apperror.Conflict(fmt.Sprintf("space key %q is already taken", sp.Key), "key")
		}
		return fmt.Errorf("create space: %w", err)
	}
	return nil
}

func (s *store) Upsert(ctx context.Context, sp *Space) error {
	if err := validateSpaceKey(sp.Key); err != nil {
		return fmt.Errorf("invalid space key: %w", err)
	}

	encAccessKeyID, err := s.encrypt(sp.AccessKeyID)
	if err != nil {
		return fmt.Errorf("encrypt access_key_id: %w", err)
	}
	encSecretKey, err := s.encrypt(sp.SecretKey)
	if err != nil {
		return fmt.Errorf("encrypt secret_key: %w", err)
	}
	encImagorSecret, err := s.encrypt(sp.ImagorSecret)
	if err != nil {
		return fmt.Errorf("encrypt imagor_secret: %w", err)
	}

	signerAlg := sp.SignerAlgorithm
	if signerAlg == "" {
		signerAlg = "sha256"
	}
	storageType := sp.StorageType
	if storageType == "" {
		storageType = "s3"
	}

	now := time.Now().UTC()
	row := &model.Space{
		ID:                   uuid.GenerateUUID(),
		OrgID:                sp.OrgID,
		Key:                  sp.Key,
		Name:                 sp.Name,
		StorageType:          storageType,
		Bucket:               sp.Bucket,
		Prefix:               sp.Prefix,
		Region:               sp.Region,
		Endpoint:             sp.Endpoint,
		AccessKeyID:          encAccessKeyID,
		SecretKey:            encSecretKey,
		UsePathStyle:         sp.UsePathStyle,
		CustomDomain:         sp.CustomDomain,
		CustomDomainVerified: sp.CustomDomainVerified,
		Suspended:            sp.Suspended,
		IsShared:             sp.IsShared,
		SignerAlgorithm:      signerAlg,
		SignerTruncate:       sp.SignerTruncate,
		ImagorSecret:         encImagorSecret,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	_, err = s.db.NewInsert().
		Model(row).
		On("CONFLICT (key) DO UPDATE").
		Set("org_id = EXCLUDED.org_id").
		Set("name = EXCLUDED.name").
		Set("storage_type = EXCLUDED.storage_type").
		Set("bucket = EXCLUDED.bucket").
		Set("prefix = EXCLUDED.prefix").
		Set("region = EXCLUDED.region").
		Set("endpoint = EXCLUDED.endpoint").
		Set("access_key_id = EXCLUDED.access_key_id").
		Set("secret_key = EXCLUDED.secret_key").
		Set("use_path_style = EXCLUDED.use_path_style").
		Set("custom_domain = EXCLUDED.custom_domain").
		Set("custom_domain_verified = EXCLUDED.custom_domain_verified").
		Set("suspended = EXCLUDED.suspended").
		Set("is_shared = EXCLUDED.is_shared").
		Set("signer_algorithm = EXCLUDED.signer_algorithm").
		Set("signer_truncate = EXCLUDED.signer_truncate").
		Set("imagor_secret = EXCLUDED.imagor_secret").
		Set("updated_at = EXCLUDED.updated_at").
		Set("deleted_at = NULL"). // restore if previously deleted
		Exec(ctx)
	return err
}

func (s *store) SoftDelete(ctx context.Context, key string) error {
	now := time.Now().UTC()
	res, err := s.db.NewUpdate().
		Model((*model.Space)(nil)).
		Set("deleted_at = ?", now).
		Set("updated_at = ?", now).
		Where("key = ? AND deleted_at IS NULL", key).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("soft-delete space %s: %w", key, err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if n == 0 {
		return fmt.Errorf("space %s not found or already deleted", key)
	}
	return nil
}

func (s *store) Get(ctx context.Context, key string) (*Space, error) {
	var row model.Space
	err := s.db.NewSelect().
		Model(&row).
		Where("key = ? AND deleted_at IS NULL", key).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get space %s: %w", key, err)
	}
	return s.modelToApp(&row)
}

func (s *store) List(ctx context.Context) ([]*Space, error) {
	var rows []model.Space
	if err := s.db.NewSelect().
		Model(&rows).
		Where("deleted_at IS NULL").
		OrderExpr("key ASC").
		Scan(ctx); err != nil {
		return nil, fmt.Errorf("list spaces: %w", err)
	}
	result := make([]*Space, 0, len(rows))
	for i := range rows {
		sp, err := s.modelToApp(&rows[i])
		if err != nil {
			return nil, err
		}
		result = append(result, sp)
	}
	return result, nil
}

func (s *store) ListByOrgID(ctx context.Context, orgID string) ([]*Space, error) {
	var rows []model.Space
	if err := s.db.NewSelect().
		Model(&rows).
		Where("org_id = ? AND deleted_at IS NULL", orgID).
		OrderExpr("key ASC").
		Scan(ctx); err != nil {
		return nil, fmt.Errorf("list spaces by org %s: %w", orgID, err)
	}
	result := make([]*Space, 0, len(rows))
	for i := range rows {
		sp, err := s.modelToApp(&rows[i])
		if err != nil {
			return nil, err
		}
		result = append(result, sp)
	}
	return result, nil
}

// Delta returns all spaces whose updated_at is strictly after since.
// Pass the zero time to get every row (full sync).
// The returned DeltaResult.ServerTime should be used as the next since cursor.
func (s *store) Delta(ctx context.Context, since time.Time) (*DeltaResult, error) {
	// Capture server time before the query so we don't miss updates that land
	// between the query execution and the caller recording the cursor.
	serverTime := time.Now().UTC()

	var rows []model.Space
	q := s.db.NewSelect().Model(&rows)
	if !since.IsZero() {
		q = q.Where("updated_at > ?", since)
	}
	if err := q.OrderExpr("updated_at ASC").Scan(ctx); err != nil {
		return nil, fmt.Errorf("delta query: %w", err)
	}

	result := &DeltaResult{ServerTime: serverTime}
	for i := range rows {
		if rows[i].DeletedAt != nil {
			// Soft-deleted: just return the key so the receiver can evict it.
			result.Deleted = append(result.Deleted, rows[i].Key)
		} else {
			sp, err := s.modelToApp(&rows[i])
			if err != nil {
				return nil, err
			}
			result.Upserted = append(result.Upserted, sp)
		}
	}
	return result, nil
}
