package noop

import (
	"context"
	"time"

	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
)

// OrgStore implements cloudcontract.OrgStore with no-op behavior for processing-mode nodes.
type OrgStore struct{}

var _ cloudcontract.OrgStore = (*OrgStore)(nil)

// NewOrgStore creates a new no-op org store.
func NewOrgStore() *OrgStore { return &OrgStore{} }

// NewSelfHostedOrgStore creates a no-op org store for self-hosted builds where cloud org features are disabled.
func NewSelfHostedOrgStore() *OrgStore { return &OrgStore{} }

func (n *OrgStore) CloudDisabled() bool { return true }

func (n *OrgStore) CreateWithMember(_ context.Context, _, _, _ string, _ *time.Time) (*cloudcontract.Org, error) {
	return nil, ErrCloudDisabled
}

func (n *OrgStore) GetByUserID(_ context.Context, _ string) (*cloudcontract.Org, error) {
	return nil, ErrCloudDisabled
}

func (n *OrgStore) GetBySlug(_ context.Context, _ string) (*cloudcontract.Org, error) {
	return nil, ErrCloudDisabled
}

func (n *OrgStore) ListMembers(_ context.Context, _ string) ([]*cloudcontract.OrgMemberView, error) {
	return nil, ErrCloudDisabled
}

func (n *OrgStore) AddMember(_ context.Context, _, _, _ string) error {
	return ErrCloudDisabled
}

func (n *OrgStore) RemoveMember(_ context.Context, _, _ string) error {
	return ErrCloudDisabled
}

func (n *OrgStore) UpdateMemberRole(_ context.Context, _, _, _ string) error {
	return ErrCloudDisabled
}
