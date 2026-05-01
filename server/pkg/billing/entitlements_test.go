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
		wantCustomDomains int
	}{
		{name: "starter", plan: org.PlanStarter, wantSpaces: 1, wantStorage: 20, wantTransforms: 25000, wantCustomDomains: 0},
		{name: "pro", plan: org.PlanPro, wantSpaces: 3, wantStorage: 100, wantTransforms: 150000, wantCustomDomains: 3},
		{name: "team", plan: org.PlanTeam, wantSpaces: 20, wantStorage: 1000, wantTransforms: 1500000, wantCustomDomains: 20},
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
