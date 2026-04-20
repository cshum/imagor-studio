package management

import (
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/pkg/encryption"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type Config = config.Config

type CloudStoresFactory func(cfg *Config, db *bun.DB, encryptionService *encryption.Service, logger *zap.Logger) (org.OrgStore, space.SpaceStore, space.SpaceInviteStore, error)

type InviteSenderFactory func(cfg *Config) (space.InviteSender, error)
