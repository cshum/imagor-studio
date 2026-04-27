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
	"github.com/cshum/imagor-studio/server/pkg/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type testOrganizationRow struct {
	bun.BaseModel `bun:"table:organizations,alias:o"`

	ID                   string     `bun:"id,pk,type:text"`
	OwnerID              string     `bun:"owner_id,notnull,type:text"`
	Name                 string     `bun:"name,notnull"`
	Slug                 string     `bun:"slug,notnull,unique"`
	Plan                 string     `bun:"plan,notnull,default:'trial'"`
	PlanStatus           string     `bun:"plan_status,notnull,default:'trialing'"`
	StripeCustomerID     *string    `bun:"stripe_customer_id,unique"`
	StripeSubscriptionID *string    `bun:"stripe_subscription_id,unique"`
	BillingEmail         *string    `bun:"billing_email"`
	TrialEndsAt          *time.Time `bun:"trial_ends_at"`
	CreatedAt            time.Time  `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt            time.Time  `bun:"updated_at,notnull,default:current_timestamp"`
}

type testOrgMemberRow struct {
	bun.BaseModel `bun:"table:org_members,alias:om"`

	OrgID     string    `bun:"org_id,pk,type:text"`
	UserID    string    `bun:"user_id,pk,type:text"`
	Role      string    `bun:"role,notnull,default:'owner'"`
	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
}

type testOrgStore struct{ db *bun.DB }

func newTestOrgStore(db *bun.DB) org.OrgStore {
	return &testOrgStore{db: db}
}

func (s *testOrgStore) CreateWithMember(ctx context.Context, ownerID, name, slug string, trialEndsAt *time.Time) (*org.Org, error) {
	now := time.Now().UTC()
	organization := &testOrganizationRow{ID: uuid.GenerateUUID(), OwnerID: ownerID, Name: name, Slug: slug, Plan: org.PlanTrial, PlanStatus: org.PlanStatusTrialing, TrialEndsAt: trialEndsAt, CreatedAt: now, UpdatedAt: now}
	member := &testOrgMemberRow{OrgID: organization.ID, UserID: ownerID, Role: "owner", CreatedAt: now}
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

func (s *testOrgStore) GetByID(ctx context.Context, id string) (*org.Org, error) {
	var organization testOrganizationRow
	if err := s.db.NewSelect().Model(&organization).Where("id = ?", id).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get organization by id %s: %w", id, err)
	}
	return mapTestOrg(&organization), nil
}

func (s *testOrgStore) GetByUserID(ctx context.Context, userID string) (*org.Org, error) {
	var member testOrgMemberRow
	if err := s.db.NewSelect().Model(&member).Where("user_id = ?", userID).Limit(1).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get org_member for user %s: %w", userID, err)
	}
	var organization testOrganizationRow
	if err := s.db.NewSelect().Model(&organization).Where("id = ?", member.OrgID).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get organization %s: %w", member.OrgID, err)
	}
	return mapTestOrg(&organization), nil
}

func (s *testOrgStore) GetBySlug(ctx context.Context, slug string) (*org.Org, error) {
	var organization testOrganizationRow
	if err := s.db.NewSelect().Model(&organization).Where("slug = ?", slug).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get organization by slug %s: %w", slug, err)
	}
	return mapTestOrg(&organization), nil
}

func (s *testOrgStore) UpdateBillingState(ctx context.Context, orgID string, update org.BillingStateUpdate) (*org.Org, error) {
	query := s.db.NewUpdate().Model((*testOrganizationRow)(nil)).Where("id = ?", orgID).Set("updated_at = ?", time.Now().UTC())
	if update.Plan != nil {
		query = query.Set("plan = ?", *update.Plan)
	}
	if update.PlanStatus != nil {
		query = query.Set("plan_status = ?", *update.PlanStatus)
	}
	if update.ClearStripeCustomerID {
		query = query.Set("stripe_customer_id = NULL")
	} else if update.StripeCustomerID != nil {
		query = query.Set("stripe_customer_id = ?", *update.StripeCustomerID)
	}
	if update.ClearStripeSubscriptionID {
		query = query.Set("stripe_subscription_id = NULL")
	} else if update.StripeSubscriptionID != nil {
		query = query.Set("stripe_subscription_id = ?", *update.StripeSubscriptionID)
	}
	if update.ClearBillingEmail {
		query = query.Set("billing_email = NULL")
	} else if update.BillingEmail != nil {
		query = query.Set("billing_email = ?", *update.BillingEmail)
	}
	if update.ClearTrialEndsAt {
		query = query.Set("trial_ends_at = NULL")
	} else if update.TrialEndsAt != nil {
		query = query.Set("trial_ends_at = ?", *update.TrialEndsAt)
	}
	if _, err := query.Exec(ctx); err != nil {
		return nil, fmt.Errorf("update organization billing state: %w", err)
	}
	return s.GetByID(ctx, orgID)
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
	member := &testOrgMemberRow{OrgID: orgID, UserID: userID, Role: role, CreatedAt: time.Now().UTC()}
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

func mapTestOrg(row *testOrganizationRow) *org.Org {
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

func newOrgTestDB(t *testing.T) *bun.DB {
	t.Helper()
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	if err != nil {
		t.Fatalf("open in-memory sqlite: %v", err)
	}
	t.Cleanup(func() { _ = sqldb.Close() })
	db := bun.NewDB(sqldb, sqlitedialect.New())
	if _, err := db.NewCreateTable().Model((*testOrganizationRow)(nil)).IfNotExists().Exec(context.Background()); err != nil {
		t.Fatalf("create organizations table: %v", err)
	}
	if _, err := db.NewCreateTable().Model((*testOrgMemberRow)(nil)).IfNotExists().Exec(context.Background()); err != nil {
		t.Fatalf("create org_members table: %v", err)
	}
	if _, err := db.NewCreateTable().Model((*model.User)(nil)).IfNotExists().Exec(context.Background()); err != nil {
		t.Fatalf("create users table: %v", err)
	}
	return db
}
