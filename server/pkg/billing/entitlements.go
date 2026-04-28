package billing

import "github.com/cshum/imagor-studio/server/pkg/org"

const PlanFree = org.PlanFree

// PlanEntitlements defines the billing and quota surface shared across SaaS runtime code.
type PlanEntitlements struct {
	MaxSpaces        int
	StorageLimitGB   int64
	TransformsLimit  int64
	BYOBAllowed      bool
	MaxCustomDomains int
}

var planEntitlements = map[string]PlanEntitlements{
	PlanFree: {
		MaxSpaces:        0,
		StorageLimitGB:   0,
		TransformsLimit:  0,
		BYOBAllowed:      false,
		MaxCustomDomains: 0,
	},
	// Trial is an intentional cloud onboarding lifecycle state.
	org.PlanTrial: {
		MaxSpaces:        1,
		StorageLimitGB:   1,
		TransformsLimit:  1000,
		BYOBAllowed:      false,
		MaxCustomDomains: 0,
	},
	org.PlanStarter: {
		MaxSpaces:        1,
		StorageLimitGB:   20,
		TransformsLimit:  25000,
		BYOBAllowed:      true,
		MaxCustomDomains: 0,
	},
	org.PlanPro: {
		MaxSpaces:        3,
		StorageLimitGB:   100,
		TransformsLimit:  150000,
		BYOBAllowed:      true,
		MaxCustomDomains: 3,
	},
	org.PlanTeam: {
		MaxSpaces:        20,
		StorageLimitGB:   1000,
		TransformsLimit:  1500000,
		BYOBAllowed:      true,
		MaxCustomDomains: 25,
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
