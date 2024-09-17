package graphql

import (
	"fmt"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"go.uber.org/zap"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	storages map[string]storage.Storage
	logger   *zap.Logger
}

func NewResolver(storages map[string]storage.Storage, logger *zap.Logger) *Resolver {
	return &Resolver{
		storages: storages,
		logger:   logger,
	}
}

func (r *Resolver) getStorage(storageKey *string) (storage.Storage, error) {
	if len(r.storages) == 1 && storageKey == nil {
		for _, s := range r.storages {
			return s, nil
		}
	}

	if storageKey == nil {
		return nil, fmt.Errorf("storageKey is required when multiple storages are configured")
	}

	s, ok := r.storages[*storageKey]
	if !ok {
		return nil, fmt.Errorf("invalid storage key: %s", *storageKey)
	}

	return s, nil
}
