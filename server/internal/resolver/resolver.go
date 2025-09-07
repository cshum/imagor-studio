package resolver

import (
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/imageservice"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"go.uber.org/zap"
)

// ConfigProvider interface for configuration methods used by the resolver
type ConfigProvider interface {
	GetByRegistryKey(registryKey string) (effectiveValue string, exists bool)
}

// StorageProvider interface for getting storage dynamically
type StorageProvider interface {
	GetStorage() storage.Storage
	IsRestartRequired() bool
}

type Resolver struct {
	storageProvider StorageProvider
	registryStore   registrystore.Store
	userStore       userstore.Store
	imageService    imageservice.Service
	config          ConfigProvider
	logger          *zap.Logger
}

func NewResolver(storageProvider StorageProvider, registryStore registrystore.Store, userStore userstore.Store, imageService imageservice.Service, cfg ConfigProvider, logger *zap.Logger) *Resolver {
	return &Resolver{
		storageProvider: storageProvider,
		registryStore:   registryStore,
		userStore:       userStore,
		imageService:    imageService,
		config:          cfg,
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
