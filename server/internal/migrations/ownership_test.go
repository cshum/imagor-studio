package migrations

import "testing"

func TestOwnershipForMigration(t *testing.T) {
	tests := []struct {
		name      string
		migration string
		want      Ownership
	}{
		{name: "shared users", migration: "20250816_create_users_table.go", want: OwnershipShared},
		{name: "cloud orgs", migration: "20260413_create_organizations_table.go", want: OwnershipCloud},
		{name: "cloud spaces", migration: "20260414_create_spaces_table.go", want: OwnershipCloud},
		{name: "cloud invites", migration: "20260420_create_space_invitations.go", want: OwnershipCloud},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := OwnershipForMigration(tt.migration); got != tt.want {
				t.Fatalf("OwnershipForMigration(%q) = %q, want %q", tt.migration, got, tt.want)
			}
		})
	}
}
