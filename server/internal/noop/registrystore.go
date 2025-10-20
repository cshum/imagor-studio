package noop

import (
	"context"

	"github.com/cshum/imagor-studio/server/internal/registrystore"
)

// RegistryStore implements registrystore.Store interface with no-op behavior
type RegistryStore struct{}

// Ensure it implements the interface
var _ registrystore.Store = (*RegistryStore)(nil)

// NewRegistryStore creates a new no-op registry store
func NewRegistryStore() *RegistryStore {
	return &RegistryStore{}
}

func (n *RegistryStore) List(ctx context.Context, ownerID string, prefix *string) ([]*registrystore.Registry, error) {
	return nil, ErrEmbeddedMode
}

func (n *RegistryStore) Get(ctx context.Context, ownerID, key string) (*registrystore.Registry, error) {
	return nil, ErrEmbeddedMode
}

func (n *RegistryStore) GetMulti(ctx context.Context, ownerID string, keys []string) ([]*registrystore.Registry, error) {
	return nil, ErrEmbeddedMode
}

func (n *RegistryStore) Set(ctx context.Context, ownerID, key, value string, isEncrypted bool) (*registrystore.Registry, error) {
	return nil, ErrEmbeddedMode
}

func (n *RegistryStore) SetMulti(ctx context.Context, ownerID string, entries []*registrystore.Registry) ([]*registrystore.Registry, error) {
	return nil, ErrEmbeddedMode
}

func (n *RegistryStore) Delete(ctx context.Context, ownerID, key string) error {
	return ErrEmbeddedMode
}

func (n *RegistryStore) DeleteMulti(ctx context.Context, ownerID string, keys []string) error {
	return ErrEmbeddedMode
}
