package storageregistry

import (
	"encoding/json"
	"fmt"
	"github.com/cshum/imagor-studio/server/pkg/storage"
)

// StorageRegistry interface for creating storage instances
type StorageRegistry interface {
	CreateStorage(storageType string, config json.RawMessage) (storage.Storage, error)
	RegisterStorageType(storageType string, creator StorageCreator)
}

// StorageCreator is a function type for creating storage instances
type StorageCreator func(config json.RawMessage) (storage.Storage, error)

// storageRegistry implements StorageRegistry
type storageRegistry struct {
	creators map[string]StorageCreator
}

// NewStorageRegistry creates a new storage factory with default storage types
func NewStorageRegistry() StorageRegistry {
	factory := &storageRegistry{
		creators: make(map[string]StorageCreator),
	}

	// Register default storage types
	factory.RegisterStorageType("file", createFileStorage)
	factory.RegisterStorageType("s3", createS3Storage)

	return factory
}

// RegisterStorageType allows registration of new storage types
func (f *storageRegistry) RegisterStorageType(storageType string, creator StorageCreator) {
	f.creators[storageType] = creator
}

// CreateStorage creates a storage instance based on type and config
func (f *storageRegistry) CreateStorage(storageType string, config json.RawMessage) (storage.Storage, error) {
	creator, exists := f.creators[storageType]
	if !exists {
		return nil, fmt.Errorf("unsupported storage type: %s", storageType)
	}

	return creator(config)
}
