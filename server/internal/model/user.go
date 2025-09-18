package model

import (
	"time"

	"github.com/uptrace/bun"
)

type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	ID             string    `bun:"id,pk,type:text"`
	DisplayName    string    `bun:"display_name,notnull"`
	Username       string    `bun:"username,notnull,unique"`
	HashedPassword string    `bun:"hashed_password,notnull"`
	Role           string    `bun:"role,notnull,default:'user'"`
	IsActive       bool      `bun:"is_active,notnull,default:true"`
	CreatedAt      time.Time `bun:"created_at,notnull,default:current_timestamp"`
	UpdatedAt      time.Time `bun:"updated_at,notnull,default:current_timestamp"`
}
