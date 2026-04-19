package managementdefault

import (
	"github.com/cshum/imagor-studio/server/internal/cloud/orgstore"
	"github.com/cshum/imagor-studio/server/internal/cloud/spaceinvite"
	"github.com/cshum/imagor-studio/server/internal/cloud/spacestore"
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/encryption"
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
	spaceInviteStore := spaceinvite.NewStore(db)
	logger.Info("cloud mode: org and space stores initialized")
	return orgStore, spaceStore, spaceInviteStore
}

func InitializeInviteSender(cfg *config.Config) (cloudcontract.InviteSender, error) {
	if cfg.SESFromEmail == "" {
		return nil, nil
	}
	sesRegion := cfg.SESRegion
	if sesRegion == "" {
		sesRegion = cfg.AWSRegion
	}
	return spaceinvite.NewSESEmailSender(sesRegion, cfg.SESFromEmail, cfg.AppUrl, cfg.AppApiUrl)
}
