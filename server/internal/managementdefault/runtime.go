package managementdefault

import (
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/noop"
	"github.com/cshum/imagor-studio/server/pkg/encryption"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

func InitializeCloudStores(mode string, cfg *config.Config, db *bun.DB, encryptionService *encryption.Service, logger *zap.Logger) (org.OrgStore, space.SpaceStore, space.SpaceInviteStore) {
	_ = db
	_ = encryptionService
	if mode == "cloud" && cfg.InternalAPISecret != "" {
		logger.Info("cloud mode requested in public runtime; using disabled org and space stores")
	}
	return noop.NewSelfHostedOrgStore(), noop.NewSelfHostedSpaceStore(), noop.NewSelfHostedSpaceInviteStore()
}

func InitializeInviteSender(cfg *config.Config) (space.InviteSender, error) {
	if cfg.InternalAPISecret == "" {
		return noop.NewSelfHostedInviteSender(), nil
	}
	return nil, nil
}
