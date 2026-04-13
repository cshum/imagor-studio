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

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
)

// Org is the application-level representation of an organization.
type Org struct {
	ID      string
	OwnerID string
	Name    string
	Slug    string

	// Plan & status — no free tier.
	Plan       string
	PlanStatus string

	// Billing — empty until Stripe subscription created.
	StripeCustomerID     string
	StripeSubscriptionID string
	BillingEmail         string
	TrialEndsAt          *time.Time

	CreatedAt time.Time
	UpdatedAt time.Time
}

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
