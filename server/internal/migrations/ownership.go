package migrations

type Ownership string

const (
	OwnershipShared Ownership = "shared"
	OwnershipCloud  Ownership = "cloud"
)

func OwnershipForMigration(name string) Ownership {
	if _, ok := cloudMigrations[name]; ok {
		return OwnershipCloud
	}
	return OwnershipShared
}

var cloudMigrations = map[string]struct{}{
	"20260413_create_organizations_table.go":            {},
	"20260414_create_spaces_table.go":                   {},
	"20260415_add_org_fk_to_spaces.go":                  {},
	"20260419_create_space_members.go":                  {},
	"20260420_create_space_invitations.go":              {},
	"20260425_migrate_space_invitations_to_space_id.go": {},
}
