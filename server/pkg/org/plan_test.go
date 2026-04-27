package org

import "testing"

func TestGetLimits_UsesNormalizedPublishedPlans(t *testing.T) {
	tests := []struct {
		name        string
		plan        string
		wantSpaces  int
		wantStorage int
	}{
		{name: "starter", plan: PlanStarter, wantSpaces: 1, wantStorage: 20},
		{name: "pro", plan: PlanPro, wantSpaces: 3, wantStorage: 100},
		{name: "team", plan: PlanTeam, wantSpaces: 10, wantStorage: 500},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limits := GetLimits(tt.plan)
			if limits.MaxSpaces != tt.wantSpaces {
				t.Fatalf("MaxSpaces = %d, want %d", limits.MaxSpaces, tt.wantSpaces)
			}
			if limits.MaxStorageGB != tt.wantStorage {
				t.Fatalf("MaxStorageGB = %d, want %d", limits.MaxStorageGB, tt.wantStorage)
			}
		})
	}
}

func TestGetLimits_UnknownPlanFallsBackToFree(t *testing.T) {
	limits := GetLimits("unknown")
	if limits != PlanLimits[PlanFree] {
		t.Fatalf("fallback limits = %+v, want %+v", limits, PlanLimits[PlanFree])
	}
}
