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
		{name: "cloud org fk", migration: "20260415_add_org_fk_to_spaces.go", want: OwnershipCloud},
		{name: "cloud invites", migration: "20260420_create_space_invitations.go", want: OwnershipCloud},
		{name: "cloud invite space id", migration: "20260425_migrate_space_invitations_to_space_id.go", want: OwnershipCloud},
		{name: "cloud members", migration: "20260419_create_space_members.go", want: OwnershipCloud},
		{name: "shared oauth identities", migration: "20260417_create_oauth_identities.go", want: OwnershipShared},
		{name: "shared pending email fields", migration: "20260421_add_pending_email_fields_to_users.go", want: OwnershipShared},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := OwnershipForMigration(tt.migration); got != tt.want {
				t.Fatalf("OwnershipForMigration(%q) = %q, want %q", tt.migration, got, tt.want)
			}
		})
	}
}
