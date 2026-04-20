package management

import (
	"github.com/cshum/imagor-studio/server/pkg/encryption"
	sharedinvite "github.com/cshum/imagor-studio/server/pkg/invite"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type CloudStoresConfig struct {
	InternalAPISecret string
}

type InviteSenderConfig = sharedinvite.Config

type CloudStoresFactory func(cfg CloudStoresConfig, db *bun.DB, encryptionService *encryption.Service, logger *zap.Logger) (org.OrgStore, space.SpaceStore, space.SpaceInviteStore, error)

type InviteSenderFactory func(cfg InviteSenderConfig) (space.InviteSender, error)
