package noop

import (
	"context"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/userstore"
)

// UserStore implements userstore.Store interface with no-op behavior
type UserStore struct{}

// Ensure it implements the interface
var _ userstore.Store = (*UserStore)(nil)

// NewUserStore creates a new no-op user store
func NewUserStore() *UserStore {
	return &UserStore{}
}

func (n *UserStore) Create(ctx context.Context, displayName, username, hashedPassword, role string) (*userstore.User, error) {
	return nil, ErrEmbeddedMode
}

func (n *UserStore) GetByID(ctx context.Context, id string) (*userstore.User, error) {
	return nil, ErrEmbeddedMode
}

func (n *UserStore) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	return nil, ErrEmbeddedMode
}

func (n *UserStore) GetByIDWithPassword(ctx context.Context, id string) (*model.User, error) {
	return nil, ErrEmbeddedMode
}

func (n *UserStore) UpdateLastLogin(ctx context.Context, id string) error {
	return ErrEmbeddedMode
}

func (n *UserStore) UpdatePassword(ctx context.Context, id string, hashedPassword string) error {
	return ErrEmbeddedMode
}

func (n *UserStore) UpdateDisplayName(ctx context.Context, id string, displayName string) error {
	return ErrEmbeddedMode
}

func (n *UserStore) UpdateUsername(ctx context.Context, id string, username string) error {
	return ErrEmbeddedMode
}

func (n *UserStore) SetActive(ctx context.Context, id string, active bool) error {
	return ErrEmbeddedMode
}

func (n *UserStore) List(ctx context.Context, offset, limit int) ([]*userstore.User, int, error) {
	return nil, 0, ErrEmbeddedMode
}
