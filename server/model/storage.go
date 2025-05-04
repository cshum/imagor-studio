package model

import (
	"github.com/uptrace/bun"
	"time"
)

type Storage struct {
	bun.BaseModel `bun:"table:storages,alias:s"`

	ID        string    `bun:"id,pk,type:text"`
	OwnerID   string    `bun:"owner_id,notnull,type:text"`
	Key       string    `bun:"key,notnull"`
	Name      string    `bun:"name,notnull"`
	Type      string    `bun:"type,notnull"`
	Config    string    `bun:"config,notnull"`
	CreatedAt time.Time `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,notnull,default:current_timestamp"`
}
