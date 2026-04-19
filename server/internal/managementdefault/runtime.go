package managementdefault

import (
	"github.com/cshum/imagor-studio/server/internal/cloud/orgstore"
	"github.com/cshum/imagor-studio/server/internal/cloud/spacestore"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/invitedefault"
	"github.com/cshum/imagor-studio/server/internal/noop"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

func InitializeCloudStores(mode string, cfg *config.Config, db *bun.DB, encryptionService *encryption.Service, logger *zap.Logger) (cloudcontract.OrgStore, cloudcontract.SpaceStore, cloudcontract.SpaceInviteStore) {
	if mode != "cloud" || cfg.InternalAPISecret == "" {
		return noop.NewSelfHostedOrgStore(), noop.NewSelfHostedSpaceStore(), nil
	}
	orgStore := orgstore.New(db)
	spaceStore := spacestore.New(db, encryptionService)
	spaceInviteStore := invitedefault.NewStore(db)
	logger.Info("cloud mode: org and space stores initialized")
	return orgStore, spaceStore, spaceInviteStore
}

func InitializeInviteSender(cfg *config.Config) (cloudcontract.InviteSender, error) {
	return invitedefault.NewSender(cfg)
}
