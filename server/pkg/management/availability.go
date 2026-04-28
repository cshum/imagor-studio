package management

import (
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
)

type disabled interface {
	CloudDisabled() bool
}

func isDisabled(v any) bool {
	d, ok := v.(disabled)
	return ok && d.CloudDisabled()
}

func OrgEnabled(store org.OrgStore) bool {
	if store == nil {
		return false
	}
	return !isDisabled(store)
}

func SpaceEnabled(store space.SpaceStore) bool {
	if store == nil {
		return false
	}
	return !isDisabled(store)
}

func CloudEnabled(orgStore org.OrgStore, spaceStore space.SpaceStore) bool {
	if orgStore == nil && spaceStore == nil {
		return false
	}
	if orgStore == nil {
		return SpaceEnabled(spaceStore)
	}
	if spaceStore == nil {
		return OrgEnabled(orgStore)
	}
	return OrgEnabled(orgStore) && SpaceEnabled(spaceStore)
}

func InviteEnabled(orgStore org.OrgStore, spaceStore space.SpaceStore, inviteStore space.SpaceInviteStore, inviteSender space.InviteSender) bool {
	return inviteStore != nil && inviteSender != nil && CloudEnabled(orgStore, spaceStore)
}
