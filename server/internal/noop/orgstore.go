package noop

import (
	"context"
	"time"

	"github.com/cshum/imagor-studio/server/internal/orgstore"
)

// OrgStore implements orgstore.Store with no-op behavior for processing-mode nodes.
type OrgStore struct{}

var _ orgstore.Store = (*OrgStore)(nil)

// NewOrgStore creates a new no-op org store.
func NewOrgStore() *OrgStore { return &OrgStore{} }

func (n *OrgStore) CreateWithMember(_ context.Context, _, _, _ string, _ *time.Time) (*orgstore.Org, error) {
	return nil, ErrEmbeddedMode
}

func (n *OrgStore) GetByUserID(_ context.Context, _ string) (*orgstore.Org, error) {
	return nil, ErrEmbeddedMode
}

func (n *OrgStore) GetBySlug(_ context.Context, _ string) (*orgstore.Org, error) {
	return nil, ErrEmbeddedMode
}
