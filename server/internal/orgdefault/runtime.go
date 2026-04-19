package orgdefault

import (
	"github.com/cshum/imagor-studio/server/internal/cloud/orgstore"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/uptrace/bun"
)

func NewStore(db *bun.DB) cloudcontract.OrgStore {
	return orgstore.New(db)
}
