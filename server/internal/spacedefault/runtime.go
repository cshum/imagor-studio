package spacedefault

import (
	"github.com/cshum/imagor-studio/server/internal/cloud/spacestore"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/uptrace/bun"
)

func NewStore(db *bun.DB, encryptionService *encryption.Service) cloudcontract.SpaceStore {
	return spacestore.New(db, encryptionService)
}
