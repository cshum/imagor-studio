package models

import "github.com/uptrace/bun"

type Storage struct {
	bun.BaseModel `bun:"table:storages,alias:s"`

	ID      string `bun:"id,pk,type:text"`
	OwnerID string `bun:"owner_id,notnull,type:text"`
	Key     string `bun:"key,notnull"`
	Name    string `bun:"name,notnull"`
	Type    string `bun:"type,notnull"`
	Config  string `bun:"config,notnull"`
}
