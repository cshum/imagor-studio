package invite

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

type Config struct {
	SESFromEmail string
	SESRegion    string
	AWSRegion    string
	AppURL       string
	AppAPIURL    string
	AppTitle     string
}

type Invitation struct {
	ID              string
	OrgID           string
	SpaceID         string
	Email           string
	Role            string
	Token           string
	InvitedByUserID string
	AcceptedAt      *time.Time
	ExpiresAt       time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type EmailParams struct {
	ToEmail     string
	OrgName     string
	SpaceName   string
	InviteToken string
	Role        string
}

type Store interface {
	CreateOrRefreshPending(ctx context.Context, orgID, spaceID, email, role, invitedByUserID string, expiresAt time.Time) (*Invitation, error)
	ListPendingBySpace(ctx context.Context, orgID, spaceID string) ([]*Invitation, error)
	GetPendingByToken(ctx context.Context, token string) (*Invitation, error)
	MarkAccepted(ctx context.Context, id string, acceptedAt time.Time) error
}

type Sender interface {
	SendSpaceInvitation(ctx context.Context, params EmailParams) error
}

type Runtime interface {
	CreateOrRefreshPending(ctx context.Context, orgID, spaceID, email, role, invitedByUserID string, expiresAt time.Time) (*Invitation, error)
	ListPendingBySpace(ctx context.Context, orgID, spaceID string) ([]*Invitation, error)
	GetPendingByToken(ctx context.Context, token string) (*Invitation, error)
	MarkAccepted(ctx context.Context, id string, acceptedAt time.Time) error
}

func GenerateToken() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate invitation token: %w", err)
	}
	return hex.EncodeToString(buf), nil
}
