package model

import (
	"time"

	"github.com/uptrace/bun"
)

// ---------- Plan constants ---------------------------------------------------

// No free tier — all orgs start on a 14-day trial.
const (
	PlanTrial      = "trial"
	PlanEarlyBird  = "early_bird" // launch offer
	PlanStarter    = "starter"
	PlanPro        = "pro"
	PlanEnterprise = "enterprise"
)

// PlanStatus mirrors the Stripe subscription lifecycle.
const (
	PlanStatusTrialing = "trialing"
	PlanStatusActive   = "active"
	PlanStatusPastDue  = "past_due"
	PlanStatusCanceled = "canceled"
)

// ---------- Plan limits ------------------------------------------------------

// OrgLimits holds the resource limits for a plan.
// -1 means unlimited.
type OrgLimits struct {
	MaxSpaces    int
	MaxStorageGB int
	MaxMembers   int
}

// PlanLimits maps plan names to their resource quotas.
// Limits are enforced at the application layer, not by DB constraints.
var PlanLimits = map[string]OrgLimits{
	PlanTrial:      {MaxSpaces: 1, MaxStorageGB: 1, MaxMembers: 1},
	PlanEarlyBird:  {MaxSpaces: 3, MaxStorageGB: 10, MaxMembers: 3},
	PlanStarter:    {MaxSpaces: 5, MaxStorageGB: 25, MaxMembers: 5},
	PlanPro:        {MaxSpaces: 20, MaxStorageGB: 100, MaxMembers: 20},
	PlanEnterprise: {MaxSpaces: -1, MaxStorageGB: -1, MaxMembers: -1},
}

// GetLimits returns the OrgLimits for plan.
// Unknown plan names fall back to trial limits.
func GetLimits(plan string) OrgLimits {
	if l, ok := PlanLimits[plan]; ok {
		return l
	}
	return PlanLimits[PlanTrial]
}

// ---------- DB models --------------------------------------------------------

// Organization is the database model for a SaaS organization (tenant).
// Billing fields (stripe_*, billing_email, trial_ends_at) are nullable and
// populated only when a Stripe subscription is created.
type Organization struct {
	bun.BaseModel `bun:"table:organizations,alias:o"`

	ID      string `bun:"id,pk,type:text"`
	OwnerID string `bun:"owner_id,notnull,type:text"`
	Name    string `bun:"name,notnull"`
	// Slug is used in URLs / default subdomain.  Immutable after creation.
	Slug string `bun:"slug,notnull,unique"`

	// Plan & status — no free tier.
	Plan       string `bun:"plan,notnull,default:'trial'"`
	PlanStatus string `bun:"plan_status,notnull,default:'trialing'"`

	// Billing — NULL until Stripe subscription created.
	StripeCustomerID     *string    `bun:"stripe_customer_id,unique"`
	StripeSubscriptionID *string    `bun:"stripe_subscription_id,unique"`
	BillingEmail         *string    `bun:"billing_email"`
	TrialEndsAt          *time.Time `bun:"trial_ends_at"`

	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp"`
}

// OrgMember is the database model for a user–org relationship.
// Composite PK: (org_id, user_id).
// Role values: "owner" | "admin" | "member"
type OrgMember struct {
	bun.BaseModel `bun:"table:org_members,alias:om"`

	OrgID     string    `bun:"org_id,pk,type:text"`
	UserID    string    `bun:"user_id,pk,type:text"`
	Role      string    `bun:"role,notnull,default:'owner'"`
	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
}
