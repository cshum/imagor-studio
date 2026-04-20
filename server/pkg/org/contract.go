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

type OrgStore interface {
	CreateWithMember(ctx context.Context, ownerID, name, slug string, trialEndsAt *time.Time) (*Org, error)
	GetByUserID(ctx context.Context, userID string) (*Org, error)
	GetBySlug(ctx context.Context, slug string) (*Org, error)
	ListMembers(ctx context.Context, orgID string) ([]*OrgMemberView, error)
	AddMember(ctx context.Context, orgID, userID, role string) error
	RemoveMember(ctx context.Context, orgID, userID string) error
	UpdateMemberRole(ctx context.Context, orgID, userID, role string) error
}
