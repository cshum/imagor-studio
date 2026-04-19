package cloudmode

import (
	"github.com/cshum/imagor-studio/server/internal/noop"
	"github.com/cshum/imagor-studio/server/internal/orgstore"
	"github.com/cshum/imagor-studio/server/internal/spaceinvite"
	"github.com/cshum/imagor-studio/server/internal/spacestore"
)

func OrgEnabled(store orgstore.Store) bool {
	if store == nil {
		return false
	}
	_, ok := store.(*noop.OrgStore)
	return !ok
}

func SpaceEnabled(store spacestore.Store) bool {
	if store == nil {
		return false
	}
	_, ok := store.(*noop.SpaceStore)
	return !ok
}

func CloudEnabled(orgStore orgstore.Store, spaceStore spacestore.Store) bool {
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

func InviteEnabled(orgStore orgstore.Store, spaceStore spacestore.Store, inviteStore spaceinvite.Store, inviteSender spaceinvite.EmailSender) bool {
	return inviteStore != nil && ((CloudEnabled(orgStore, spaceStore) && inviteSender != nil) || (OrgEnabled(orgStore) && SpaceEnabled(spaceStore)))
}
