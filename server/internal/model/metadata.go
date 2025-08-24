package model

import (
	"time"

	"github.com/uptrace/bun"
)

type Metadata struct {
	bun.BaseModel `bun:"table:metadata,alias:m"`

	ID        string    `bun:"id,pk,type:text"`
	OwnerID   string    `bun:"owner_id,notnull,type:text"`
	Key       string    `bun:"key,notnull"`
	Value     string    `bun:"value,notnull"`
	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp"`
}
