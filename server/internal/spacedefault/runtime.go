package spacedefault

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/apperror"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
)

type store struct {
	db         *bun.DB
	encryption *encryption.Service
}

func NewStore(db *bun.DB, encryptionService *encryption.Service) cloudcontract.SpaceStore {
	return &store{db: db, encryption: encryptionService}
}

var dnsLabelRE = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)

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

func (s *store) modelToApp(row *model.Space) (*cloudcontract.Space, error) {
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
	return &cloudcontract.Space{ID: row.ID, OrgID: row.OrgID, Key: row.Key, Name: row.Name, StorageType: row.StorageType, Bucket: row.Bucket, Prefix: row.Prefix, Region: row.Region, Endpoint: row.Endpoint, AccessKeyID: accessKeyID, SecretKey: secretKey, UsePathStyle: row.UsePathStyle, CustomDomain: row.CustomDomain, CustomDomainVerified: row.CustomDomainVerified, Suspended: row.Suspended, IsShared: row.IsShared, SignerAlgorithm: row.SignerAlgorithm, SignerTruncate: row.SignerTruncate, ImagorSecret: imagorSecret, UpdatedAt: row.UpdatedAt, DeletedAt: row.DeletedAt}, nil
}

func isDuplicateKeyError(err error) bool {
	msg := err.Error()
	return strings.Contains(msg, "UNIQUE constraint failed") || strings.Contains(msg, "duplicate key value violates unique constraint")
}

func (s *store) Create(ctx context.Context, sp *cloudcontract.Space) error {
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
	row := &model.Space{ID: uuid.GenerateUUID(), OrgID: sp.OrgID, Key: sp.Key, Name: sp.Name, StorageType: storageType, Bucket: sp.Bucket, Prefix: sp.Prefix, Region: sp.Region, Endpoint: sp.Endpoint, AccessKeyID: encAccessKeyID, SecretKey: encSecretKey, UsePathStyle: sp.UsePathStyle, CustomDomain: sp.CustomDomain, CustomDomainVerified: sp.CustomDomainVerified, Suspended: sp.Suspended, IsShared: sp.IsShared, SignerAlgorithm: signerAlg, SignerTruncate: sp.SignerTruncate, ImagorSecret: encImagorSecret, CreatedAt: now, UpdatedAt: now}
	if _, err = s.db.NewInsert().Model(row).Exec(ctx); err != nil {
		if isDuplicateKeyError(err) {
			return apperror.Conflict(fmt.Sprintf("space key %q is already taken", sp.Key), "key")
		}
		return fmt.Errorf("create space: %w", err)
	}
	return nil
}

func (s *store) RenameKey(ctx context.Context, oldKey, newKey string) error {
	oldKey = strings.TrimSpace(oldKey)
	newKey = strings.TrimSpace(newKey)
	if oldKey == newKey {
		return nil
	}
	if err := validateSpaceKey(newKey); err != nil {
		return fmt.Errorf("invalid space key: %w", err)
	}
	now := time.Now().UTC()
	res, err := s.db.NewUpdate().Model((*model.Space)(nil)).Set("key = ?", newKey).Set("updated_at = ?", now).Where("key = ? AND deleted_at IS NULL", oldKey).Exec(ctx)
	if err != nil {
		if isDuplicateKeyError(err) {
			return apperror.Conflict(fmt.Sprintf("space key %q is already taken", newKey), "key")
		}
		return fmt.Errorf("rename space key %s -> %s: %w", oldKey, newKey, err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rename space key rows affected: %w", err)
	}
	if affected == 0 {
		return fmt.Errorf("space %q not found", oldKey)
	}
	return nil
}

func (s *store) Upsert(ctx context.Context, sp *cloudcontract.Space) error {
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
	row := &model.Space{ID: uuid.GenerateUUID(), OrgID: sp.OrgID, Key: sp.Key, Name: sp.Name, StorageType: storageType, Bucket: sp.Bucket, Prefix: sp.Prefix, Region: sp.Region, Endpoint: sp.Endpoint, AccessKeyID: encAccessKeyID, SecretKey: encSecretKey, UsePathStyle: sp.UsePathStyle, CustomDomain: sp.CustomDomain, CustomDomainVerified: sp.CustomDomainVerified, Suspended: sp.Suspended, IsShared: sp.IsShared, SignerAlgorithm: signerAlg, SignerTruncate: sp.SignerTruncate, ImagorSecret: encImagorSecret, CreatedAt: now, UpdatedAt: now}
	_, err = s.db.NewInsert().Model(row).On("CONFLICT (key) DO UPDATE").Set("org_id = EXCLUDED.org_id").Set("name = EXCLUDED.name").Set("storage_type = EXCLUDED.storage_type").Set("bucket = EXCLUDED.bucket").Set("prefix = EXCLUDED.prefix").Set("region = EXCLUDED.region").Set("endpoint = EXCLUDED.endpoint").Set("access_key_id = EXCLUDED.access_key_id").Set("secret_key = EXCLUDED.secret_key").Set("use_path_style = EXCLUDED.use_path_style").Set("custom_domain = EXCLUDED.custom_domain").Set("custom_domain_verified = EXCLUDED.custom_domain_verified").Set("suspended = EXCLUDED.suspended").Set("is_shared = EXCLUDED.is_shared").Set("signer_algorithm = EXCLUDED.signer_algorithm").Set("signer_truncate = EXCLUDED.signer_truncate").Set("imagor_secret = EXCLUDED.imagor_secret").Set("updated_at = EXCLUDED.updated_at").Set("deleted_at = NULL").Exec(ctx)
	return err
}

func (s *store) SoftDelete(ctx context.Context, key string) error {
	now := time.Now().UTC()
	res, err := s.db.NewUpdate().Model((*model.Space)(nil)).Set("deleted_at = ?", now).Set("updated_at = ?", now).Where("key = ? AND deleted_at IS NULL", key).Exec(ctx)
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

func (s *store) Get(ctx context.Context, key string) (*cloudcontract.Space, error) {
	var row model.Space
	err := s.db.NewSelect().Model(&row).Where("key = ? AND deleted_at IS NULL", key).Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get space %s: %w", key, err)
	}
	return s.modelToApp(&row)
}

func (s *store) List(ctx context.Context) ([]*cloudcontract.Space, error) {
	var rows []model.Space
	if err := s.db.NewSelect().Model(&rows).Where("deleted_at IS NULL").OrderExpr("key ASC").Scan(ctx); err != nil {
		return nil, fmt.Errorf("list spaces: %w", err)
	}
	result := make([]*cloudcontract.Space, 0, len(rows))
	for i := range rows {
		sp, err := s.modelToApp(&rows[i])
		if err != nil {
			return nil, err
		}
		result = append(result, sp)
	}
	return result, nil
}

func (s *store) ListByOrgID(ctx context.Context, orgID string) ([]*cloudcontract.Space, error) {
	var rows []model.Space
	if err := s.db.NewSelect().Model(&rows).Where("org_id = ? AND deleted_at IS NULL", orgID).OrderExpr("key ASC").Scan(ctx); err != nil {
		return nil, fmt.Errorf("list spaces by org: %w", err)
	}
	result := make([]*cloudcontract.Space, 0, len(rows))
	for i := range rows {
		sp, err := s.modelToApp(&rows[i])
		if err != nil {
			return nil, err
		}
		result = append(result, sp)
	}
	return result, nil
}

func (s *store) ListByMemberUserID(ctx context.Context, userID string) ([]*cloudcontract.Space, error) {
	var rows []model.Space
	if err := s.db.NewSelect().Model(&rows).Join("JOIN space_members sm ON sm.space_id = space.id").Where("sm.user_id = ? AND space.deleted_at IS NULL", userID).OrderExpr("space.key ASC").Scan(ctx); err != nil {
		return nil, fmt.Errorf("list spaces by member: %w", err)
	}
	result := make([]*cloudcontract.Space, 0, len(rows))
	for i := range rows {
		sp, err := s.modelToApp(&rows[i])
		if err != nil {
			return nil, err
		}
		result = append(result, sp)
	}
	return result, nil
}

func (s *store) Delta(ctx context.Context, since time.Time) (*cloudcontract.DeltaResult, error) {
	var rows []model.Space
	q := s.db.NewSelect().Model(&rows).Where("updated_at > ?", since).OrderExpr("updated_at ASC")
	if err := q.Scan(ctx); err != nil {
		return nil, fmt.Errorf("space delta: %w", err)
	}
	result := &cloudcontract.DeltaResult{Deleted: []string{}, Upserted: []*cloudcontract.Space{}, ServerTime: time.Now().UTC()}
	for i := range rows {
		if rows[i].DeletedAt != nil {
			result.Deleted = append(result.Deleted, rows[i].Key)
			continue
		}
		sp, err := s.modelToApp(&rows[i])
		if err != nil {
			return nil, err
		}
		result.Upserted = append(result.Upserted, sp)
	}
	return result, nil
}

func (s *store) KeyExists(ctx context.Context, key string) (bool, error) {
	exists, err := s.db.NewSelect().Model((*model.Space)(nil)).Where("key = ?", key).Exists(ctx)
	if err != nil {
		return false, fmt.Errorf("space key exists: %w", err)
	}
	return exists, nil
}

func (s *store) ListMembers(ctx context.Context, spaceKey string) ([]*cloudcontract.SpaceMemberView, error) {
	type memberRow struct {
		SpaceID     string    `bun:"space_id"`
		UserID      string    `bun:"user_id"`
		Role        string    `bun:"role"`
		CreatedAt   time.Time `bun:"created_at"`
		Username    string    `bun:"username"`
		DisplayName string    `bun:"display_name"`
		Email       *string   `bun:"email"`
		AvatarURL   *string   `bun:"avatar_url"`
	}
	var rows []memberRow
	err := s.db.NewSelect().TableExpr("space_members AS sm").ColumnExpr("sm.space_id, sm.user_id, sm.role, sm.created_at").ColumnExpr("u.username, u.display_name, u.email, u.avatar_url").Join("JOIN spaces s ON s.id = sm.space_id").Join("LEFT JOIN users u ON u.id = sm.user_id").Where("s.key = ? AND s.deleted_at IS NULL", spaceKey).OrderExpr("sm.created_at ASC").Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("list space members: %w", err)
	}
	result := make([]*cloudcontract.SpaceMemberView, 0, len(rows))
	for _, r := range rows {
		result = append(result, &cloudcontract.SpaceMemberView{SpaceID: r.SpaceID, UserID: r.UserID, Username: r.Username, DisplayName: r.DisplayName, Email: r.Email, AvatarURL: r.AvatarURL, Role: r.Role, CreatedAt: r.CreatedAt})
	}
	return result, nil
}

func (s *store) AddMember(ctx context.Context, spaceKey, userID, role string) error {
	space, err := s.Get(ctx, spaceKey)
	if err != nil {
		return err
	}
	if space == nil {
		return fmt.Errorf("space %s not found", spaceKey)
	}
	entry := &model.SpaceMember{SpaceID: space.ID, UserID: userID, Role: role, CreatedAt: time.Now().UTC()}
	if _, err := s.db.NewInsert().Model(entry).Exec(ctx); err != nil {
		return fmt.Errorf("add space member: %w", err)
	}
	return nil
}

func (s *store) RemoveMember(ctx context.Context, spaceKey, userID string) error {
	space, err := s.Get(ctx, spaceKey)
	if err != nil {
		return err
	}
	if space == nil {
		return fmt.Errorf("space %s not found", spaceKey)
	}
	if _, err := s.db.NewDelete().TableExpr("space_members").Where("space_id = ? AND user_id = ?", space.ID, userID).Exec(ctx); err != nil {
		return fmt.Errorf("remove space member: %w", err)
	}
	return nil
}

func (s *store) UpdateMemberRole(ctx context.Context, spaceKey, userID, role string) error {
	space, err := s.Get(ctx, spaceKey)
	if err != nil {
		return err
	}
	if space == nil {
		return fmt.Errorf("space %s not found", spaceKey)
	}
	if _, err := s.db.NewUpdate().TableExpr("space_members").Set("role = ?", role).Where("space_id = ? AND user_id = ?", space.ID, userID).Exec(ctx); err != nil {
		return fmt.Errorf("update space member role: %w", err)
	}
	return nil
}

func (s *store) HasMember(ctx context.Context, spaceKey, userID string) (bool, error) {
	space, err := s.Get(ctx, spaceKey)
	if err != nil {
		return false, err
	}
	if space == nil {
		return false, nil
	}
	exists, err := s.db.NewSelect().TableExpr("space_members").Where("space_id = ? AND user_id = ?", space.ID, userID).Exists(ctx)
	if err != nil {
		return false, fmt.Errorf("space member exists: %w", err)
	}
	return exists, nil
}
