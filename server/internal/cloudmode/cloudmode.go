package cloudmode

import (
	"github.com/cshum/imagor-studio/server/internal/cloudapi"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
)

func OrgEnabled(store org.OrgStore) bool {
	if store == nil {
		return false
	}
	return !cloudapi.IsDisabled(store)
}

func SpaceEnabled(store space.SpaceStore) bool {
	if store == nil {
		return false
	}
	return !cloudapi.IsDisabled(store)
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
	return inviteStore != nil && ((CloudEnabled(orgStore, spaceStore) && inviteSender != nil) || (OrgEnabled(orgStore) && SpaceEnabled(spaceStore)))
}
