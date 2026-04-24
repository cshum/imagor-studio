package noop

import (
	"context"
	"time"

	"github.com/cshum/imagor-studio/server/pkg/space"
)

// SpaceStore implements space.SpaceStore with no-op behavior for processing-mode nodes.
// Processing nodes derive all space state from SpaceConfigStore (delta sync),
// not from the database.
type SpaceStore struct{}

var _ space.SpaceStore = (*SpaceStore)(nil)

// NewSpaceStore creates a new no-op space store.
func NewSpaceStore() *SpaceStore { return &SpaceStore{} }

// NewSelfHostedSpaceStore creates a no-op space store for self-hosted builds where cloud space features are disabled.
func NewSelfHostedSpaceStore() *SpaceStore { return &SpaceStore{} }

func (n *SpaceStore) CloudDisabled() bool { return true }

func (n *SpaceStore) Create(_ context.Context, _ *space.Space) error {
	return ErrCloudDisabled
}

func (n *SpaceStore) Upsert(_ context.Context, _ *space.Space) error {
	return ErrCloudDisabled
}

func (n *SpaceStore) RenameKey(_ context.Context, _, _ string) error {
	return ErrCloudDisabled
}

func (n *SpaceStore) SoftDelete(_ context.Context, _ string) error {
	return ErrCloudDisabled
}

func (n *SpaceStore) GetByKey(_ context.Context, _ string) (*space.Space, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceStore) GetByID(_ context.Context, _ string) (*space.Space, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceStore) List(_ context.Context) ([]*space.Space, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceStore) ListByOrgID(_ context.Context, _ string) ([]*space.Space, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceStore) ListByMemberUserID(_ context.Context, _ string) ([]*space.Space, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceStore) Delta(_ context.Context, _ time.Time) (*space.DeltaResult, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceStore) KeyExists(_ context.Context, _ string) (bool, error) {
	return false, ErrCloudDisabled
}

func (n *SpaceStore) ListMembers(_ context.Context, _ string) ([]*space.SpaceMemberView, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceStore) AddMember(_ context.Context, _, _, _ string) error {
	return ErrCloudDisabled
}

func (n *SpaceStore) RemoveMember(_ context.Context, _, _ string) error {
	return ErrCloudDisabled
}

func (n *SpaceStore) UpdateMemberRole(_ context.Context, _, _, _ string) error {
	return ErrCloudDisabled
}

func (n *SpaceStore) HasMember(_ context.Context, _, _ string) (bool, error) {
	return false, ErrCloudDisabled
}
