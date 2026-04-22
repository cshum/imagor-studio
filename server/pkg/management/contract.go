package management

import (
	"net/http"

	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/encryption"
	sharedinvite "github.com/cshum/imagor-studio/server/pkg/invite"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/cshum/imagor-studio/server/pkg/space"
	shareduser "github.com/cshum/imagor-studio/server/pkg/user"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type CloudStoresConfig struct {
	InternalAPISecret string
}

type CloudConfig struct {
	InternalAPISecret      string
	GoogleClientID         string
	GoogleClientSecret     string
	SESRegion              string
	SESFromEmail           string
	AppAPIURL              string
	ProcessingURLTemplate  string
	PlatformS3Bucket       string
	PlatformS3Region       string
	PlatformS3Endpoint     string
	PlatformS3AccessKeyID  string
	PlatformS3SecretKey    string
	PlatformS3UsePathStyle bool
	PlatformS3Prefix       string
	PlatformConfigVersion  int64
}

type InviteSenderConfig = sharedinvite.Config

type OAuthConfig struct {
	GoogleClientID     string
	GoogleClientSecret string
	AppURL             string
	AppAPIURL          string
}

type CloudHTTPServices struct {
	TokenManager      *auth.TokenManager
	UserStore         shareduser.OAuthStore
	OrgStore          org.OrgStore
	SpaceStore        space.SpaceStore
	SpaceInviteStore  space.SpaceInviteStore
	CloudConfig       CloudConfig
	GlobalImagor      ImagorSigningConfig
	InternalAPISecret string
	Logger            *zap.Logger
}

type ImagorSigningConfig struct {
	Secret         string
	SignerType     string
	SignerTruncate int
}
type CloudStoresFactory func(cfg CloudStoresConfig, db *bun.DB, encryptionService *encryption.Service, logger *zap.Logger) (org.OrgStore, space.SpaceStore, space.SpaceInviteStore, error)

type InviteSenderFactory func(cfg InviteSenderConfig) (space.InviteSender, error)

type CloudConfigLoader func(args []string) (CloudConfig, error)

type AuthRoutesRegistrar func(mux *http.ServeMux, cfg OAuthConfig, services CloudHTTPServices)

type InternalRoutesRegistrar func(mux *http.ServeMux, services CloudHTTPServices)

type ProcessingOriginResolverFactory func(cfg CloudConfig, spaceStore space.SpaceStore) space.ProcessingOriginResolver

type TemplatePreviewRenderClientFactory func(cfg CloudConfig) processing.TemplatePreviewRenderClient

type CloudFactories struct {
	ConfigLoader             CloudConfigLoader
	Stores                   CloudStoresFactory
	InviteSender             InviteSenderFactory
	AuthRoutes               AuthRoutesRegistrar
	InternalRoutes           InternalRoutesRegistrar
	ProcessingOriginResolver ProcessingOriginResolverFactory
	TemplatePreviewRenderer  TemplatePreviewRenderClientFactory
}
