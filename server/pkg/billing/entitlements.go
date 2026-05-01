package billing

import "github.com/cshum/imagor-studio/server/pkg/org"

const PlanFree = org.PlanFree

// PlanEntitlements defines the billing and quota surface shared across SaaS runtime code.
type PlanEntitlements struct {
	MaxSpaces        int
	StorageLimitGB   int64
	TransformsLimit  int64
	MaxCustomDomains int
}

var planEntitlements = map[string]PlanEntitlements{
	PlanFree: {
		MaxSpaces:        0,
		StorageLimitGB:   0,
		TransformsLimit:  0,
		MaxCustomDomains: 0,
	},
	// Trial is an intentional cloud onboarding lifecycle state.
	org.PlanTrial: {
		MaxSpaces:        1,
		StorageLimitGB:   1,
		TransformsLimit:  1000,
		MaxCustomDomains: 0,
	},
	org.PlanStarter: {
		MaxSpaces:        1,
		StorageLimitGB:   20,
		TransformsLimit:  25000,
		MaxCustomDomains: 0,
	},
	org.PlanPro: {
		MaxSpaces:        3,
		StorageLimitGB:   100,
		TransformsLimit:  150000,
		MaxCustomDomains: 3,
	},
	org.PlanTeam: {
		MaxSpaces:        20,
		StorageLimitGB:   1000,
		TransformsLimit:  1500000,
		MaxCustomDomains: 20,
	},
}

// EntitlementsForPlan returns billing entitlements for a plan name.
// Unknown plans fall back to the blocked/lapsed state.
func EntitlementsForPlan(plan string) PlanEntitlements {
	if entitlements, ok := planEntitlements[plan]; ok {
		return entitlements
	}
	return planEntitlements[PlanFree]
}
