package graphql

import (
	"github.com/cshum/imagor-studio/server/internal/storagemanager"
	"github.com/cshum/imagor-studio/server/internal/storagestore"
	"go.uber.org/zap"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	storageManager storagemanager.StorageManager
	logger         *zap.Logger
}

func NewResolver(storageManager storagemanager.StorageManager, logger *zap.Logger) *Resolver {
	return &Resolver{
		storageManager: storageManager,
		logger:         logger,
	}
}

func (r *Resolver) getStorage(storageKey *string) (storagestore.Storage, error) {
	if storageKey == nil {
		return r.storageManager.GetDefaultStorage()
	}
	return r.storageManager.GetStorage(*storageKey)
}
