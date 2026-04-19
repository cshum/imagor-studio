package noop

import (
	"context"
	"time"

	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
)

type SpaceInviteStore struct{}

var _ cloudcontract.SpaceInviteStore = (*SpaceInviteStore)(nil)

func NewSpaceInviteStore() *SpaceInviteStore { return &SpaceInviteStore{} }

func NewSelfHostedSpaceInviteStore() *SpaceInviteStore { return &SpaceInviteStore{} }

func (n *SpaceInviteStore) CreateOrRefreshPending(_ context.Context, _, _, _, _, _ string, _ time.Time) (*cloudcontract.Invitation, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceInviteStore) ListPendingBySpace(_ context.Context, _, _ string) ([]*cloudcontract.Invitation, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceInviteStore) GetPendingByToken(_ context.Context, _ string) (*cloudcontract.Invitation, error) {
	return nil, ErrCloudDisabled
}

func (n *SpaceInviteStore) MarkAccepted(_ context.Context, _ string, _ time.Time) error {
	return ErrCloudDisabled
}

func (n *SpaceInviteStore) RenameSpaceKey(_ context.Context, _, _, _ string) error {
	return ErrCloudDisabled
}

type InviteSender struct{}

var _ cloudcontract.InviteSender = (*InviteSender)(nil)

func NewInviteSender() *InviteSender { return &InviteSender{} }

func NewSelfHostedInviteSender() *InviteSender { return &InviteSender{} }

func (n *InviteSender) SendSpaceInvitation(_ context.Context, _ cloudcontract.EmailParams) error {
	return ErrCloudDisabled
}
