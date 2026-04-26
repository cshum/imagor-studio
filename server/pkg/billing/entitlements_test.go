package billing

import (
	"testing"

	"github.com/cshum/imagor-studio/server/pkg/org"
)

func TestEntitlementsForPlan_UsesPublishedPlans(t *testing.T) {
	tests := []struct {
		name              string
		plan              string
		wantSpaces        int
		wantStorage       int64
		wantTransforms    int64
		wantBYOB          bool
		wantCustomDomains int
	}{
		{name: "starter", plan: org.PlanStarter, wantSpaces: 1, wantStorage: 20, wantTransforms: 25000, wantBYOB: true, wantCustomDomains: 0},
		{name: "pro", plan: org.PlanPro, wantSpaces: 3, wantStorage: 100, wantTransforms: 150000, wantBYOB: true, wantCustomDomains: 3},
		{name: "team", plan: org.PlanTeam, wantSpaces: 10, wantStorage: 500, wantTransforms: 750000, wantBYOB: true, wantCustomDomains: 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entitlements := EntitlementsForPlan(tt.plan)
			if entitlements.MaxSpaces != tt.wantSpaces {
				t.Fatalf("MaxSpaces = %d, want %d", entitlements.MaxSpaces, tt.wantSpaces)
			}
			if entitlements.StorageLimitGB != tt.wantStorage {
				t.Fatalf("StorageLimitGB = %d, want %d", entitlements.StorageLimitGB, tt.wantStorage)
			}
			if entitlements.TransformsLimit != tt.wantTransforms {
				t.Fatalf("TransformsLimit = %d, want %d", entitlements.TransformsLimit, tt.wantTransforms)
			}
			if entitlements.BYOBAllowed != tt.wantBYOB {
				t.Fatalf("BYOBAllowed = %t, want %t", entitlements.BYOBAllowed, tt.wantBYOB)
			}
			if entitlements.MaxCustomDomains != tt.wantCustomDomains {
				t.Fatalf("MaxCustomDomains = %d, want %d", entitlements.MaxCustomDomains, tt.wantCustomDomains)
			}
		})
	}
}

func TestEntitlementsForPlan_UnknownFallsBackToFree(t *testing.T) {
	entitlements := EntitlementsForPlan("unknown")
	if entitlements != planEntitlements[PlanFree] {
		t.Fatalf("fallback entitlements = %+v, want %+v", entitlements, planEntitlements[PlanFree])
	}
}
