package model

import (
	"time"

	"github.com/uptrace/bun"
)

type Registry struct {
	bun.BaseModel `bun:"table:registry,alias:r"`

	ID          string    `bun:"id,pk,type:text"`
	OwnerID     string    `bun:"owner_id,notnull,type:text"`
	Key         string    `bun:"key,notnull"`
	Value       string    `bun:"value,notnull"`
	IsEncrypted bool      `bun:"is_encrypted,notnull,default:false"`
	CreatedAt   time.Time `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt   time.Time `bun:"updated_at,notnull,default:current_timestamp"`
}
