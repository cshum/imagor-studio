package space

import (
	"context"
	"time"
)

type Space struct {
	ID                   string
	OrgID                string
	Key                  string
	Name                 string
	StorageMode          string
	StorageType          string
	Bucket               string
	Prefix               string
	Region               string
	Endpoint             string
	AccessKeyID          string
	SecretKey            string
	UsePathStyle         bool
	CustomDomain         string
	CustomDomainVerified bool
	Suspended            bool
	IsShared             bool
	SignerAlgorithm      string
	SignerTruncate       int
	ImagorSecret         string
	ImagorCORSOrigins    string
	UpdatedAt            time.Time
	DeletedAt            *time.Time
}

type DeltaResult struct {
	Upserted   []*Space
	Deleted    []string
	ServerTime time.Time
}

type SpaceMemberView struct {
	SpaceID     string
	UserID      string
	Username    string
	DisplayName string
	Email       *string
	AvatarURL   *string
	Role        string
	CreatedAt   time.Time
}

type SpaceStore interface {
	Create(ctx context.Context, s *Space) error
	RenameKey(ctx context.Context, oldKey, newKey string) error
	Upsert(ctx context.Context, s *Space) error
	SoftDelete(ctx context.Context, key string) error
	Get(ctx context.Context, key string) (*Space, error)
	List(ctx context.Context) ([]*Space, error)
	ListByOrgID(ctx context.Context, orgID string) ([]*Space, error)
	ListByMemberUserID(ctx context.Context, userID string) ([]*Space, error)
	Delta(ctx context.Context, since time.Time) (*DeltaResult, error)
	KeyExists(ctx context.Context, key string) (bool, error)
	ListMembers(ctx context.Context, spaceID string) ([]*SpaceMemberView, error)
	AddMember(ctx context.Context, spaceID, userID, role string) error
	RemoveMember(ctx context.Context, spaceID, userID string) error
	UpdateMemberRole(ctx context.Context, spaceID, userID, role string) error
	HasMember(ctx context.Context, spaceID, userID string) (bool, error)
}

type Invitation struct {
	ID              string
	OrgID           string
	SpaceKey        string
	Email           string
	Role            string
	Token           string
	InvitedByUserID string
	AcceptedAt      *time.Time
	ExpiresAt       time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type SpaceInviteStore interface {
	CreateOrRefreshPending(ctx context.Context, orgID, spaceKey, email, role, invitedByUserID string, expiresAt time.Time) (*Invitation, error)
	ListPendingBySpace(ctx context.Context, orgID, spaceKey string) ([]*Invitation, error)
	GetPendingByToken(ctx context.Context, token string) (*Invitation, error)
	MarkAccepted(ctx context.Context, id string, acceptedAt time.Time) error
	RenameSpaceKey(ctx context.Context, orgID, oldSpaceKey, newSpaceKey string) error
}

type EmailParams struct {
	ToEmail     string
	OrgName     string
	SpaceName   string
	InviteToken string
	Role        string
}

type InviteSender interface {
	SendSpaceInvitation(ctx context.Context, params EmailParams) error
}
