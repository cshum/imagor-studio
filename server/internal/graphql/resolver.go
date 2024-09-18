package graphql

import (
	"fmt"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storagemanager"
	"go.uber.org/zap"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	storageManager *storagemanager.StorageManager
	logger         *zap.Logger
}

func NewResolver(storageManager *storagemanager.StorageManager, logger *zap.Logger) *Resolver {
	return &Resolver{
		storageManager: storageManager,
		logger:         logger,
	}
}

func (r *Resolver) getStorage(storageKey *string) (storage.Storage, error) {
	storages := r.storageManager.GetAllStorages()

	if len(storages) == 1 && storageKey == nil {
		for _, s := range storages {
			return s, nil
		}
	}

	if storageKey == nil {
		return nil, fmt.Errorf("storageKey is required when multiple storages are configured")
	}

	s, ok := r.storageManager.GetStorage(*storageKey)
	if !ok {
		return nil, fmt.Errorf("invalid storage key: %s", *storageKey)
	}

	return s, nil
}
