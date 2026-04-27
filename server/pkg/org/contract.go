package org

import (
	"context"
	"time"
)

type Org struct {
	ID      string
	OwnerID string
	Name    string
	Slug    string

	Plan       string
	PlanStatus string

	StripeCustomerID     string
	StripeSubscriptionID string
	BillingEmail         string
	TrialEndsAt          *time.Time

	CreatedAt time.Time
	UpdatedAt time.Time
}

type OrgMemberView struct {
	OrgID       string
	UserID      string
	Username    string
	DisplayName string
	Role        string
	CreatedAt   time.Time
}

type BillingStateUpdate struct {
	Plan                      *string
	PlanStatus                *string
	StripeCustomerID          *string
	StripeSubscriptionID      *string
	BillingEmail              *string
	TrialEndsAt               *time.Time
	ClearStripeCustomerID     bool
	ClearStripeSubscriptionID bool
	ClearBillingEmail         bool
	ClearTrialEndsAt          bool
}

type OrgStore interface {
	CreateWithMember(ctx context.Context, ownerID, name, slug string, trialEndsAt *time.Time) (*Org, error)
	GetByID(ctx context.Context, id string) (*Org, error)
	GetByUserID(ctx context.Context, userID string) (*Org, error)
	GetBySlug(ctx context.Context, slug string) (*Org, error)
	GetByStripeCustomerID(ctx context.Context, stripeCustomerID string) (*Org, error)
	UpdateBillingState(ctx context.Context, orgID string, update BillingStateUpdate) (*Org, error)
	ListMembers(ctx context.Context, orgID string) ([]*OrgMemberView, error)
	AddMember(ctx context.Context, orgID, userID, role string) error
	RemoveMember(ctx context.Context, orgID, userID string) error
	UpdateMemberRole(ctx context.Context, orgID, userID, role string) error
}
