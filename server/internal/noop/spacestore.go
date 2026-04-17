package noop

import (
	"context"
	"time"

	"github.com/cshum/imagor-studio/server/internal/spacestore"
)

// SpaceStore implements spacestore.Store with no-op behavior for processing-mode nodes.
// Processing nodes derive all space state from SpaceConfigStore (delta sync),
// not from the database.
type SpaceStore struct{}

var _ spacestore.Store = (*SpaceStore)(nil)

// NewSpaceStore creates a new no-op space store.
func NewSpaceStore() *SpaceStore { return &SpaceStore{} }

func (n *SpaceStore) Create(_ context.Context, _ *spacestore.Space) error {
	return ErrEmbeddedMode
}

func (n *SpaceStore) Upsert(_ context.Context, _ *spacestore.Space) error {
	return ErrEmbeddedMode
}

func (n *SpaceStore) SoftDelete(_ context.Context, _ string) error {
	return ErrEmbeddedMode
}

func (n *SpaceStore) Get(_ context.Context, _ string) (*spacestore.Space, error) {
	return nil, ErrEmbeddedMode
}

func (n *SpaceStore) List(_ context.Context) ([]*spacestore.Space, error) {
	return nil, ErrEmbeddedMode
}

func (n *SpaceStore) ListByOrgID(_ context.Context, _ string) ([]*spacestore.Space, error) {
	return nil, ErrEmbeddedMode
}

func (n *SpaceStore) Delta(_ context.Context, _ time.Time) (*spacestore.DeltaResult, error) {
	return nil, ErrEmbeddedMode
}

func (n *SpaceStore) KeyExists(_ context.Context, _ string) (bool, error) {
	return false, ErrEmbeddedMode
}

func (n *SpaceStore) ListMembers(_ context.Context, _ string) ([]*spacestore.SpaceMemberView, error) {
	return nil, ErrEmbeddedMode
}

func (n *SpaceStore) AddMember(_ context.Context, _, _, _ string) error {
	return ErrEmbeddedMode
}

func (n *SpaceStore) RemoveMember(_ context.Context, _, _ string) error {
	return ErrEmbeddedMode
}

func (n *SpaceStore) UpdateMemberRole(_ context.Context, _, _, _ string) error {
	return ErrEmbeddedMode
}

func (n *SpaceStore) HasMember(_ context.Context, _, _ string) (bool, error) {
	return false, ErrEmbeddedMode
}
