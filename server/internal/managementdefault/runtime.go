package managementdefault

import (
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/noop"
	"github.com/cshum/imagor-studio/server/internal/orgdefault"
	"github.com/cshum/imagor-studio/server/internal/spacedefault"
	"github.com/cshum/imagor-studio/server/pkg/encryption"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

func InitializeCloudStores(mode string, cfg *config.Config, db *bun.DB, encryptionService *encryption.Service, logger *zap.Logger) (cloudcontract.OrgStore, cloudcontract.SpaceStore, cloudcontract.SpaceInviteStore) {
	if mode != "cloud" || cfg.InternalAPISecret == "" {
		return noop.NewSelfHostedOrgStore(), noop.NewSelfHostedSpaceStore(), noop.NewSelfHostedSpaceInviteStore()
	}
	orgStore := orgdefault.NewStore(db)
	spaceStore := spacedefault.NewStore(db, encryptionService)
	logger.Info("cloud mode: org and space stores initialized; invitations unavailable in public runtime")
	return orgStore, spaceStore, nil
}

func InitializeInviteSender(cfg *config.Config) (cloudcontract.InviteSender, error) {
	if cfg.InternalAPISecret == "" {
		return noop.NewSelfHostedInviteSender(), nil
	}
	return nil, nil
}
