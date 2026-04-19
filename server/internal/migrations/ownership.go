package migrations

import "strings"

type Ownership string

const (
	OwnershipShared Ownership = "shared"
	OwnershipCloud  Ownership = "cloud"
)

func OwnershipForMigration(name string) Ownership {
	if isCloudMigration(name) {
		return OwnershipCloud
	}
	return OwnershipShared
}

func isCloudMigration(name string) bool {
	cloudPrefixes := []string{
		"20260413_create_organizations_table",
		"20260414_create_spaces_table",
		"20260415_add_org_fk_to_spaces",
		"20260419_create_space_members",
		"20260420_create_space_invitations",
	}
	for _, prefix := range cloudPrefixes {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}
	return false
}
