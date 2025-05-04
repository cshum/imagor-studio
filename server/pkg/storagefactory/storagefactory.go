package storagefactory

import (
	"encoding/json"
	"fmt"
	"github.com/cshum/imagor-studio/server/pkg/storage"
)

// StorageFactory interface for creating storage instances
type StorageFactory interface {
	CreateStorage(storageType string, config json.RawMessage) (storage.Storage, error)
	RegisterStorageType(storageType string, creator StorageCreator)
}

// StorageCreator is a function type for creating storage instances
type StorageCreator func(config json.RawMessage) (storage.Storage, error)

// storageFactory implements StorageFactory
type storageFactory struct {
	creators map[string]StorageCreator
}

// NewStorageFactory creates a new storage factory with default storage types
func NewStorageFactory() StorageFactory {
	factory := &storageFactory{
		creators: make(map[string]StorageCreator),
	}

	// Register default storage types
	factory.RegisterStorageType("file", createFileStorage)
	factory.RegisterStorageType("s3", createS3Storage)

	return factory
}

// RegisterStorageType allows registration of new storage types
func (f *storageFactory) RegisterStorageType(storageType string, creator StorageCreator) {
	f.creators[storageType] = creator
}

// CreateStorage creates a storage instance based on type and config
func (f *storageFactory) CreateStorage(storageType string, config json.RawMessage) (storage.Storage, error) {
	creator, exists := f.creators[storageType]
	if !exists {
		return nil, fmt.Errorf("unsupported storage type: %s", storageType)
	}

	return creator(config)
}
