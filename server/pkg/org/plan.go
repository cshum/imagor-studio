package org

// Active SaaS plans plus legacy/internal states.
const (
	PlanTrial      = "trial"
	PlanEarlyBird  = "early_bird"
	PlanStarter    = "starter"
	PlanPro        = "pro"
	PlanTeam       = "team"
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
}

// PlanLimits maps plan names to resource quotas.
var PlanLimits = map[string]Limits{
	PlanTrial:      {MaxSpaces: 1, MaxStorageGB: 1},
	PlanEarlyBird:  {MaxSpaces: 3, MaxStorageGB: 10},
	PlanStarter:    {MaxSpaces: 1, MaxStorageGB: 20},
	PlanPro:        {MaxSpaces: 3, MaxStorageGB: 100},
	PlanTeam:       {MaxSpaces: 10, MaxStorageGB: 500},
	PlanEnterprise: {MaxSpaces: -1, MaxStorageGB: -1},
}

// GetLimits returns limits for a plan, defaulting to trial limits.
func GetLimits(plan string) Limits {
	if limits, ok := PlanLimits[plan]; ok {
		return limits
	}
	return PlanLimits[PlanTrial]
}
