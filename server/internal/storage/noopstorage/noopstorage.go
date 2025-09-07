package noopstorage

import (
	"context"
	"fmt"
	"io"

	"github.com/cshum/imagor-studio/server/internal/storage"
)

// NoOpStorage implements the storage.Storage interface with no-operation responses
// This is used when no storage is configured, allowing the server to start without errors
type NoOpStorage struct{}

// New creates a new NoOpStorage instance
func New() *NoOpStorage {
	return &NoOpStorage{}
}

// List returns an empty result since no storage is configured
func (s *NoOpStorage) List(ctx context.Context, key string, options storage.ListOptions) (storage.ListResult, error) {
	return storage.ListResult{
		Items:      []storage.FileInfo{},
		TotalCount: 0,
	}, nil
}

// Get returns an error indicating storage is not configured
func (s *NoOpStorage) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	return nil, fmt.Errorf("storage not configured - please configure storage in admin settings")
}

// Put returns an error indicating storage is not configured
func (s *NoOpStorage) Put(ctx context.Context, key string, content io.Reader) error {
	return fmt.Errorf("storage not configured - please configure storage in admin settings")
}

// Delete returns an error indicating storage is not configured
func (s *NoOpStorage) Delete(ctx context.Context, key string) error {
	return fmt.Errorf("storage not configured - please configure storage in admin settings")
}

// CreateFolder returns an error indicating storage is not configured
func (s *NoOpStorage) CreateFolder(ctx context.Context, folder string) error {
	return fmt.Errorf("storage not configured - please configure storage in admin settings")
}

// Stat returns an error indicating storage is not configured
func (s *NoOpStorage) Stat(ctx context.Context, key string) (storage.FileInfo, error) {
	return storage.FileInfo{}, fmt.Errorf("storage not configured - please configure storage in admin settings")
}
