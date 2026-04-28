package org

// Published SaaS plans.
const (
	PlanStarter = "starter"
	PlanPro     = "pro"
	PlanTeam    = "team"
)

// Internal lifecycle states.
const (
	PlanFree  = "free"
	PlanTrial = "trial"
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
}

// PlanLimits maps plan names to coarse space/storage quotas.
// Billing-sensitive entitlements such as transforms, BYOB, and custom domains
// live in server/pkg/billing/entitlements.go.
var PlanLimits = map[string]Limits{
	PlanFree:    {MaxSpaces: 0, MaxStorageGB: 0},
	PlanTrial:   {MaxSpaces: 1, MaxStorageGB: 1},
	PlanStarter: {MaxSpaces: 1, MaxStorageGB: 20},
	PlanPro:     {MaxSpaces: 3, MaxStorageGB: 100},
	PlanTeam:    {MaxSpaces: 20, MaxStorageGB: 1000},
}

// GetLimits returns limits for a plan, defaulting to the blocked/lapsed state.
func GetLimits(plan string) Limits {
	if limits, ok := PlanLimits[plan]; ok {
		return limits
	}
	return PlanLimits[PlanFree]
}
