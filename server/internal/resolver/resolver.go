package resolver

import (
	"context"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor/imagorpath"
	"go.uber.org/zap"
)

// ConfigProvider interface for configuration methods used by the resolver
type ConfigProvider interface {
	GetByRegistryKey(registryKey string) (effectiveValue string, exists bool)
	IsEmbeddedMode() bool
}

// StorageProvider interface for getting storage dynamically
type StorageProvider interface {
	GetStorage() storage.Storage
	ReloadFromRegistry() error
}

// ImagorProvider interface for imagor operations
type ImagorProvider interface {
	Config() *imagorprovider.ImagorConfig
	Imagor() *imagor.Imagor
	GenerateURL(imagePath string, params imagorpath.Params) (string, error)
}

// LicenseChecker is the interface used by the resolver for license status checks.
// *license.Service satisfies this interface.
type LicenseChecker interface {
	GetLicenseStatus(ctx context.Context, includeDetails bool) (*license.LicenseStatus, error)
}

type Resolver struct {
	storageProvider StorageProvider
	registryStore   registrystore.Store
	userStore       userstore.Store
	imagorProvider  ImagorProvider
	config          ConfigProvider
	licenseService  LicenseChecker
	logger          *zap.Logger

	// Multi-tenant stores — nil in self-hosted / embedded mode.
	// Only set when InternalAPISecret is configured (multi-tenant deployment).
	orgStore   org.OrgStore
	spaceStore space.SpaceStore

	spaceInviteStore space.SpaceInviteStore
	inviteSender     space.InviteSender
}

func NewResolver(
	storageProvider StorageProvider,
	registryStore registrystore.Store,
	userStore userstore.Store,
	imagorProvider ImagorProvider,
	cfg ConfigProvider,
	licenseService LicenseChecker,
	logger *zap.Logger,
	orgStore org.OrgStore,
	spaceStore space.SpaceStore,
	spaceInviteStore space.SpaceInviteStore,
	inviteSender space.InviteSender,
) *Resolver {
	return &Resolver{
		storageProvider:  storageProvider,
		registryStore:    registryStore,
		userStore:        userStore,
		imagorProvider:   imagorProvider,
		config:           cfg,
		licenseService:   licenseService,
		logger:           logger,
		orgStore:         orgStore,
		spaceStore:       spaceStore,
		spaceInviteStore: spaceInviteStore,
		inviteSender:     inviteSender,
	}
}

// getStorage returns the current storage instance from the provider
func (r *Resolver) getStorage() storage.Storage {
	return r.storageProvider.GetStorage()
}

func (r *Resolver) cloudEnabled() bool {
	return management.CloudEnabled(r.orgStore, r.spaceStore)
}

func (r *Resolver) inviteEnabled() bool {
	return management.InviteEnabled(r.orgStore, r.spaceStore, r.spaceInviteStore, r.inviteSender)
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() gql.MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() gql.QueryResolver { return &queryResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
