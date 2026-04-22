package httphandler

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/cshum/imagor-studio/server/pkg/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type testOrgStore struct{ db *bun.DB }

func newTestOrgStore(db *bun.DB) org.OrgStore {
	return &testOrgStore{db: db}
}

func (s *testOrgStore) CreateWithMember(ctx context.Context, ownerID, name, slug string, trialEndsAt *time.Time) (*org.Org, error) {
	now := time.Now().UTC()
	organization := &model.Organization{ID: uuid.GenerateUUID(), OwnerID: ownerID, Name: name, Slug: slug, Plan: model.PlanTrial, PlanStatus: model.PlanStatusTrialing, TrialEndsAt: trialEndsAt, CreatedAt: now, UpdatedAt: now}
	member := &model.OrgMember{OrgID: organization.ID, UserID: ownerID, Role: "owner", CreatedAt: now}
	if err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewInsert().Model(organization).Exec(ctx); err != nil {
			return fmt.Errorf("insert organization: %w", err)
		}
		if _, err := tx.NewInsert().Model(member).Exec(ctx); err != nil {
			return fmt.Errorf("insert org_member: %w", err)
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return mapTestOrg(organization), nil
}

func (s *testOrgStore) GetByUserID(ctx context.Context, userID string) (*org.Org, error) {
	var member model.OrgMember
	if err := s.db.NewSelect().Model(&member).Where("user_id = ?", userID).Limit(1).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get org_member for user %s: %w", userID, err)
	}
	var organization model.Organization
	if err := s.db.NewSelect().Model(&organization).Where("id = ?", member.OrgID).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get organization %s: %w", member.OrgID, err)
	}
	return mapTestOrg(&organization), nil
}

func (s *testOrgStore) GetBySlug(ctx context.Context, slug string) (*org.Org, error) {
	var organization model.Organization
	if err := s.db.NewSelect().Model(&organization).Where("slug = ?", slug).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get organization by slug %s: %w", slug, err)
	}
	return mapTestOrg(&organization), nil
}

func (s *testOrgStore) ListMembers(ctx context.Context, orgID string) ([]*org.OrgMemberView, error) {
	type memberRow struct {
		OrgID       string    `bun:"org_id"`
		UserID      string    `bun:"user_id"`
		Role        string    `bun:"role"`
		CreatedAt   time.Time `bun:"created_at"`
		Username    string    `bun:"username"`
		DisplayName string    `bun:"display_name"`
	}
	var rows []memberRow
	err := s.db.NewSelect().
		TableExpr("org_members AS om").
		ColumnExpr("om.org_id, om.user_id, om.role, om.created_at").
		ColumnExpr("COALESCE(u.username, om.user_id) AS username").
		ColumnExpr("COALESCE(NULLIF(u.display_name, ''), COALESCE(u.username, om.user_id)) AS display_name").
		Join("LEFT JOIN users AS u ON u.id = om.user_id").
		Where("om.org_id = ?", orgID).
		OrderExpr("om.created_at ASC").
		Scan(ctx, &rows)
	if err != nil {
		return nil, fmt.Errorf("list org members: %w", err)
	}
	result := make([]*org.OrgMemberView, 0, len(rows))
	for _, row := range rows {
		result = append(result, &org.OrgMemberView{OrgID: row.OrgID, UserID: row.UserID, Username: row.Username, DisplayName: row.DisplayName, Role: row.Role, CreatedAt: row.CreatedAt})
	}
	return result, nil
}

func (s *testOrgStore) AddMember(ctx context.Context, orgID, userID, role string) error {
	member := &model.OrgMember{OrgID: orgID, UserID: userID, Role: role, CreatedAt: time.Now().UTC()}
	if _, err := s.db.NewInsert().Model(member).Exec(ctx); err != nil {
		return fmt.Errorf("add org member: %w", err)
	}
	return nil
}

func (s *testOrgStore) RemoveMember(ctx context.Context, orgID, userID string) error {
	if _, err := s.db.NewDelete().TableExpr("org_members").Where("org_id = ? AND user_id = ?", orgID, userID).Exec(ctx); err != nil {
		return fmt.Errorf("remove org member: %w", err)
	}
	return nil
}

func (s *testOrgStore) UpdateMemberRole(ctx context.Context, orgID, userID, role string) error {
	if _, err := s.db.NewUpdate().TableExpr("org_members").Set("role = ?", role).Where("org_id = ? AND user_id = ?", orgID, userID).Exec(ctx); err != nil {
		return fmt.Errorf("update org member role: %w", err)
	}
	return nil
}

func mapTestOrg(row *model.Organization) *org.Org {
	result := &org.Org{ID: row.ID, OwnerID: row.OwnerID, Name: row.Name, Slug: row.Slug, Plan: row.Plan, PlanStatus: row.PlanStatus, TrialEndsAt: row.TrialEndsAt, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt}
	if row.StripeCustomerID != nil {
		result.StripeCustomerID = *row.StripeCustomerID
	}
	if row.StripeSubscriptionID != nil {
		result.StripeSubscriptionID = *row.StripeSubscriptionID
	}
	if row.BillingEmail != nil {
		result.BillingEmail = *row.BillingEmail
	}
	return result
}

type testSpaceStore struct{ db *bun.DB }

func newTestSpaceStore(db *bun.DB) space.SpaceStore {
	return &testSpaceStore{db: db}
}

func (s *testSpaceStore) Create(ctx context.Context, sp *space.Space) error {
	now := time.Now().UTC()
	row := &model.Space{ID: uuid.GenerateUUID(), OrgID: sp.OrgID, Key: sp.Key, Name: sp.Name, StorageType: sp.StorageType, Bucket: sp.Bucket, Prefix: sp.Prefix, Region: sp.Region, Endpoint: sp.Endpoint, AccessKeyID: sp.AccessKeyID, SecretKey: sp.SecretKey, UsePathStyle: sp.UsePathStyle, CustomDomain: sp.CustomDomain, CustomDomainVerified: sp.CustomDomainVerified, Suspended: sp.Suspended, IsShared: sp.IsShared, SignerAlgorithm: sp.SignerAlgorithm, SignerTruncate: sp.SignerTruncate, ImagorSecret: sp.ImagorSecret, ImagorCORSOrigins: sp.ImagorCORSOrigins, CreatedAt: now, UpdatedAt: now}
	if row.StorageType == "" {
		row.StorageType = "s3"
	}
	if row.SignerAlgorithm == "" {
		row.SignerAlgorithm = "sha256"
	}
	_, err := s.db.NewInsert().Model(row).Exec(ctx)
	if err != nil {
		return fmt.Errorf("create space: %w", err)
	}
	return nil
}

func (s *testSpaceStore) RenameKey(ctx context.Context, oldKey, newKey string) error {
	_, err := s.db.NewUpdate().Model((*model.Space)(nil)).Set("key = ?", newKey).Set("updated_at = ?", time.Now().UTC()).Where("key = ? AND deleted_at IS NULL", oldKey).Exec(ctx)
	return err
}

func (s *testSpaceStore) Upsert(ctx context.Context, sp *space.Space) error {
	if existing, err := s.Get(ctx, sp.Key); err != nil {
		return err
	} else if existing != nil {
		_, err = s.db.NewUpdate().Model((*model.Space)(nil)).Set("org_id = ?", sp.OrgID).Set("name = ?", sp.Name).Set("updated_at = ?", time.Now().UTC()).Where("key = ?", sp.Key).Exec(ctx)
		return err
	}
	return s.Create(ctx, sp)
}

func (s *testSpaceStore) SoftDelete(ctx context.Context, key string) error {
	_, err := s.db.NewUpdate().Model((*model.Space)(nil)).Set("deleted_at = ?", time.Now().UTC()).Set("updated_at = ?", time.Now().UTC()).Where("key = ? AND deleted_at IS NULL", key).Exec(ctx)
	return err
}

func (s *testSpaceStore) Get(ctx context.Context, key string) (*space.Space, error) {
	var row model.Space
	if err := s.db.NewSelect().Model(&row).Where("key = ? AND deleted_at IS NULL", key).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &space.Space{ID: row.ID, OrgID: row.OrgID, Key: row.Key, Name: row.Name, StorageType: row.StorageType, Bucket: row.Bucket, Prefix: row.Prefix, Region: row.Region, Endpoint: row.Endpoint, AccessKeyID: row.AccessKeyID, SecretKey: row.SecretKey, UsePathStyle: row.UsePathStyle, CustomDomain: row.CustomDomain, CustomDomainVerified: row.CustomDomainVerified, Suspended: row.Suspended, IsShared: row.IsShared, SignerAlgorithm: row.SignerAlgorithm, SignerTruncate: row.SignerTruncate, ImagorSecret: row.ImagorSecret, ImagorCORSOrigins: row.ImagorCORSOrigins, UpdatedAt: row.UpdatedAt, DeletedAt: row.DeletedAt}, nil
}

func (s *testSpaceStore) List(ctx context.Context) ([]*space.Space, error) { return nil, nil }
func (s *testSpaceStore) ListByOrgID(ctx context.Context, orgID string) ([]*space.Space, error) {
	return nil, nil
}
func (s *testSpaceStore) ListByMemberUserID(ctx context.Context, userID string) ([]*space.Space, error) {
	return nil, nil
}
func (s *testSpaceStore) Delta(ctx context.Context, since time.Time) (*space.DeltaResult, error) {
	return nil, nil
}
func (s *testSpaceStore) KeyExists(ctx context.Context, key string) (bool, error) {
	exists, err := s.db.NewSelect().Model((*model.Space)(nil)).Where("key = ?", key).Exists(ctx)
	return exists, err
}
func (s *testSpaceStore) ListMembers(ctx context.Context, spaceKey string) ([]*space.SpaceMemberView, error) {
	return nil, nil
}
func (s *testSpaceStore) AddMember(ctx context.Context, spaceKey, userID, role string) error {
	sp, err := s.Get(ctx, spaceKey)
	if err != nil {
		return err
	}
	if sp == nil {
		return fmt.Errorf("space %s not found", spaceKey)
	}
	_, err = s.db.NewInsert().Model(&model.SpaceMember{SpaceID: sp.ID, UserID: userID, Role: role, CreatedAt: time.Now().UTC()}).Exec(ctx)
	return err
}
func (s *testSpaceStore) RemoveMember(ctx context.Context, spaceKey, userID string) error {
	sp, err := s.Get(ctx, spaceKey)
	if err != nil || sp == nil {
		return err
	}
	_, err = s.db.NewDelete().TableExpr("space_members").Where("space_id = ? AND user_id = ?", sp.ID, userID).Exec(ctx)
	return err
}
func (s *testSpaceStore) UpdateMemberRole(ctx context.Context, spaceKey, userID, role string) error {
	sp, err := s.Get(ctx, spaceKey)
	if err != nil || sp == nil {
		return err
	}
	_, err = s.db.NewUpdate().TableExpr("space_members").Set("role = ?", role).Where("space_id = ? AND user_id = ?", sp.ID, userID).Exec(ctx)
	return err
}
func (s *testSpaceStore) HasMember(ctx context.Context, spaceKey, userID string) (bool, error) {
	sp, err := s.Get(ctx, spaceKey)
	if err != nil || sp == nil {
		return false, err
	}
	return s.db.NewSelect().TableExpr("space_members").Where("space_id = ? AND user_id = ?", sp.ID, userID).Exists(ctx)
}

func newOrgTestDB(t *testing.T) *bun.DB {
	t.Helper()
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	if err != nil {
		t.Fatalf("open in-memory sqlite: %v", err)
	}
	t.Cleanup(func() { _ = sqldb.Close() })
	db := bun.NewDB(sqldb, sqlitedialect.New())
	if _, err := db.NewCreateTable().Model((*model.Organization)(nil)).IfNotExists().Exec(context.Background()); err != nil {
		t.Fatalf("create organizations table: %v", err)
	}
	if _, err := db.NewCreateTable().Model((*model.OrgMember)(nil)).IfNotExists().Exec(context.Background()); err != nil {
		t.Fatalf("create org_members table: %v", err)
	}
	if _, err := db.NewCreateTable().Model((*model.User)(nil)).IfNotExists().Exec(context.Background()); err != nil {
		t.Fatalf("create users table: %v", err)
	}
	return db
}
