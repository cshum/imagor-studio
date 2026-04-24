package model

import (
	"time"

	"github.com/uptrace/bun"
)

type SpaceInvitation struct {
	bun.BaseModel `bun:"table:space_invitations,alias:si"`

	ID              string     `bun:"id,pk,type:text"`
	OrgID           string     `bun:"org_id,notnull,type:text"`
	SpaceID         string     `bun:"space_id,notnull,type:text"`
	Email           string     `bun:"email,notnull,type:text"`
	Role            string     `bun:"role,notnull,type:text"`
	Token           string     `bun:"token,notnull,type:text,unique"`
	InvitedByUserID string     `bun:"invited_by_user_id,notnull,type:text"`
	AcceptedAt      *time.Time `bun:"accepted_at,type:timestamptz"`
	ExpiresAt       time.Time  `bun:"expires_at,notnull"`
	CreatedAt       time.Time  `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt       time.Time  `bun:"updated_at,notnull,default:current_timestamp"`
}
