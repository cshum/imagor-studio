package models

import "github.com/uptrace/bun"

type Storage struct {
	bun.BaseModel `bun:"table:storages,alias:s"`

	ID     int64  `bun:"id,pk,autoincrement"`
	Key    string `bun:"key,unique"`
	Name   string `bun:"name"`
	Type   string `bun:"type"`
	Config string `bun:"config"`
}
