package resolver

import (
	"context"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/userstore"
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
	IsRestartRequired() bool
	ReloadFromRegistry() error
}

// ImagorProvider interface for imagor operations
type ImagorProvider interface {
	GetConfig() *imagorprovider.ImagorConfig
	GetInstance() *imagor.Imagor
	IsRestartRequired() bool
	ReloadFromRegistry() error
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
}

func NewResolver(storageProvider StorageProvider, registryStore registrystore.Store, userStore userstore.Store, imagorProvider ImagorProvider, cfg ConfigProvider, licenseService LicenseChecker, logger *zap.Logger) *Resolver {
	return &Resolver{
		storageProvider: storageProvider,
		registryStore:   registryStore,
		userStore:       userStore,
		imagorProvider:  imagorProvider,
		config:          cfg,
		licenseService:  licenseService,
		logger:          logger,
	}
}

// getStorage returns the current storage instance from the provider
func (r *Resolver) getStorage() storage.Storage {
	return r.storageProvider.GetStorage()
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() gql.MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() gql.QueryResolver { return &queryResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
