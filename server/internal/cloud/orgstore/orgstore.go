// Package orgstore manages the organizations and org_members tables.
//
// Phase 1: one organization per user (personal org, auto-created on signup).
// Phase 2: team invitations will add more rows to org_members; the Store
// interface is designed to support that without breaking changes.
package orgstore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
)

// Org is the application-level representation of an organization.
type Org = cloudcontract.Org

// OrgMemberView is the application-level view of an org_member row,
// augmented with the member's username and display name (joined from the users table).
type OrgMemberView = cloudcontract.OrgMemberView

// Store exposes org management operations to other packages.
type Store interface {
	// CreateWithMember atomically creates an organization and its first member row.
	// The caller supplies the owner's userID and desired slug/name.
	// Returns the created Org (with generated ID, timestamps).
	CreateWithMember(ctx context.Context, ownerID, name, slug string, trialEndsAt *time.Time) (*Org, error)

	// GetByUserID returns the organization a user belongs to, or nil if none.
	// Phase 1: one org per user.  Phase 2: returns the "primary" org.
	GetByUserID(ctx context.Context, userID string) (*Org, error)

	// GetBySlug returns the organization with the given slug, or nil if not found.
	GetBySlug(ctx context.Context, slug string) (*Org, error)

	// -- Phase 2: member management --

	// ListMembers returns all members of an org with their usernames (LEFT JOIN users).
	ListMembers(ctx context.Context, orgID string) ([]*OrgMemberView, error)

	// AddMember inserts a new member row for an existing org.
	// Returns an error if the user is already a member (duplicate PK).
	AddMember(ctx context.Context, orgID, userID, role string) error

	// RemoveMember deletes the membership for userID in orgID.
	// Returns an error if userID is the last owner.
	RemoveMember(ctx context.Context, orgID, userID string) error

	// UpdateMemberRole changes the role for userID in orgID.
	// Returns an error if the change would leave the org with no owner.
	UpdateMemberRole(ctx context.Context, orgID, userID, role string) error
}

type store struct {
	db *bun.DB
}

// New creates a new orgstore backed by db.
func New(db *bun.DB) Store {
	return &store{db: db}
}

// ---------- helpers ----------------------------------------------------------

func rowToApp(row *model.Organization) *Org {
	o := &Org{
		ID:          row.ID,
		OwnerID:     row.OwnerID,
		Name:        row.Name,
		Slug:        row.Slug,
		Plan:        row.Plan,
		PlanStatus:  row.PlanStatus,
		TrialEndsAt: row.TrialEndsAt,
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
	if row.StripeCustomerID != nil {
		o.StripeCustomerID = *row.StripeCustomerID
	}
	if row.StripeSubscriptionID != nil {
		o.StripeSubscriptionID = *row.StripeSubscriptionID
	}
	if row.BillingEmail != nil {
		o.BillingEmail = *row.BillingEmail
	}
	return o
}

// ---------- Store implementation ---------------------------------------------

func (s *store) CreateWithMember(ctx context.Context, ownerID, name, slug string, trialEndsAt *time.Time) (*Org, error) {
	now := time.Now().UTC()
	orgID := uuid.GenerateUUID()

	org := &model.Organization{
		ID:          orgID,
		OwnerID:     ownerID,
		Name:        name,
		Slug:        slug,
		Plan:        model.PlanTrial,
		PlanStatus:  model.PlanStatusTrialing,
		TrialEndsAt: trialEndsAt,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	member := &model.OrgMember{
		OrgID:     orgID,
		UserID:    ownerID,
		Role:      "owner",
		CreatedAt: now,
	}

	if err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewInsert().Model(org).Exec(ctx); err != nil {
			return fmt.Errorf("insert organization: %w", err)
		}
		if _, err := tx.NewInsert().Model(member).Exec(ctx); err != nil {
			return fmt.Errorf("insert org_member: %w", err)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return rowToApp(org), nil
}

func (s *store) GetByUserID(ctx context.Context, userID string) (*Org, error) {
	var member model.OrgMember
	if err := s.db.NewSelect().
		Model(&member).
		Where("user_id = ?", userID).
		Limit(1).
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get org_member for user %s: %w", userID, err)
	}

	var org model.Organization
	if err := s.db.NewSelect().
		Model(&org).
		Where("id = ?", member.OrgID).
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get organization %s: %w", member.OrgID, err)
	}

	return rowToApp(&org), nil
}

func (s *store) GetBySlug(ctx context.Context, slug string) (*Org, error) {
	var org model.Organization
	if err := s.db.NewSelect().
		Model(&org).
		Where("slug = ?", slug).
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get organization by slug %s: %w", slug, err)
	}
	return rowToApp(&org), nil
}

// ---------- Phase 2: member management --------------------------------------

func (s *store) ListMembers(ctx context.Context, orgID string) ([]*OrgMemberView, error) {
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
	result := make([]*OrgMemberView, 0, len(rows))
	for _, r := range rows {
		result = append(result, &OrgMemberView{
			OrgID:       r.OrgID,
			UserID:      r.UserID,
			Username:    r.Username,
			DisplayName: r.DisplayName,
			Role:        r.Role,
			CreatedAt:   r.CreatedAt,
		})
	}
	return result, nil
}

func (s *store) AddMember(ctx context.Context, orgID, userID, role string) error {
	member := &model.OrgMember{
		OrgID:     orgID,
		UserID:    userID,
		Role:      role,
		CreatedAt: time.Now().UTC(),
	}
	if _, err := s.db.NewInsert().Model(member).Exec(ctx); err != nil {
		return fmt.Errorf("add org member: %w", err)
	}
	return nil
}

func (s *store) RemoveMember(ctx context.Context, orgID, userID string) error {
	// Fetch the target member's current role.
	var targetMember model.OrgMember
	if err := s.db.NewSelect().
		Model(&targetMember).
		Where("org_id = ? AND user_id = ?", orgID, userID).
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("member not found")
		}
		return fmt.Errorf("get member: %w", err)
	}
	// If this user is an owner, ensure at least one other owner remains.
	if targetMember.Role == "owner" {
		var ownerCount int
		if err := s.db.NewSelect().
			TableExpr("org_members").
			ColumnExpr("COUNT(*)").
			Where("org_id = ? AND role = 'owner'", orgID).
			Scan(ctx, &ownerCount); err != nil {
			return fmt.Errorf("count owners: %w", err)
		}
		if ownerCount <= 1 {
			return fmt.Errorf("cannot remove the last owner")
		}
	}
	if _, err := s.db.NewDelete().
		TableExpr("org_members").
		Where("org_id = ? AND user_id = ?", orgID, userID).
		Exec(ctx); err != nil {
		return fmt.Errorf("remove org member: %w", err)
	}
	return nil
}

func (s *store) UpdateMemberRole(ctx context.Context, orgID, userID, role string) error {
	// Fetch current role.
	var currentMember model.OrgMember
	if err := s.db.NewSelect().
		Model(&currentMember).
		Where("org_id = ? AND user_id = ?", orgID, userID).
		Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("member not found")
		}
		return fmt.Errorf("get current role: %w", err)
	}
	// If demoting an owner, ensure at least one other owner remains.
	if currentMember.Role == "owner" && role != "owner" {
		var ownerCount int
		if err := s.db.NewSelect().
			TableExpr("org_members").
			ColumnExpr("COUNT(*)").
			Where("org_id = ? AND role = 'owner'", orgID).
			Scan(ctx, &ownerCount); err != nil {
			return fmt.Errorf("count owners: %w", err)
		}
		if ownerCount <= 1 {
			return fmt.Errorf("cannot demote the last owner")
		}
	}
	if _, err := s.db.NewUpdate().
		TableExpr("org_members").
		Set("role = ?", role).
		Where("org_id = ? AND user_id = ?", orgID, userID).
		Exec(ctx); err != nil {
		return fmt.Errorf("update member role: %w", err)
	}
	return nil
}
