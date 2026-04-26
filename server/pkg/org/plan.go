package org

// No free tier — all orgs start on a 14-day trial.
const (
	PlanTrial      = "trial"
	PlanEarlyBird  = "early_bird"
	PlanStarter    = "starter"
	PlanPro        = "pro"
	PlanEnterprise = "enterprise"
)

// PlanStatus mirrors the subscription lifecycle.
const (
	PlanStatusTrialing = "trialing"
	PlanStatusActive   = "active"
	PlanStatusPastDue  = "past_due"
	PlanStatusCanceled = "canceled"
)

// Limits holds resource limits for a plan. -1 means unlimited.
type Limits struct {
	MaxSpaces    int
	MaxStorageGB int
	MaxMembers   int
}

// PlanLimits maps plan names to resource quotas.
var PlanLimits = map[string]Limits{
	PlanTrial:      {MaxSpaces: 1, MaxStorageGB: 1, MaxMembers: 1},
	PlanEarlyBird:  {MaxSpaces: 3, MaxStorageGB: 10, MaxMembers: 3},
	PlanStarter:    {MaxSpaces: 5, MaxStorageGB: 25, MaxMembers: 5},
	PlanPro:        {MaxSpaces: 20, MaxStorageGB: 100, MaxMembers: 20},
	PlanEnterprise: {MaxSpaces: -1, MaxStorageGB: -1, MaxMembers: -1},
}

// GetLimits returns limits for a plan, defaulting to trial limits.
func GetLimits(plan string) Limits {
	if limits, ok := PlanLimits[plan]; ok {
		return limits
	}
	return PlanLimits[PlanTrial]
}
