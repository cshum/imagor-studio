package cloudmode

import (
	"github.com/cshum/imagor-studio/server/internal/cloudapi"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
)

func OrgEnabled(store cloudcontract.OrgStore) bool {
	if store == nil {
		return false
	}
	return !cloudapi.IsDisabled(store)
}

func SpaceEnabled(store cloudcontract.SpaceStore) bool {
	if store == nil {
		return false
	}
	return !cloudapi.IsDisabled(store)
}

func CloudEnabled(orgStore cloudcontract.OrgStore, spaceStore cloudcontract.SpaceStore) bool {
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

func InviteEnabled(orgStore cloudcontract.OrgStore, spaceStore cloudcontract.SpaceStore, inviteStore cloudcontract.SpaceInviteStore, inviteSender cloudcontract.InviteSender) bool {
	return inviteStore != nil && ((CloudEnabled(orgStore, spaceStore) && inviteSender != nil) || (OrgEnabled(orgStore) && SpaceEnabled(spaceStore)))
}
