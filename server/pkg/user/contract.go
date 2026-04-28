package user

import (
	"context"
	"time"
)

type User struct {
	ID            string    `json:"id"`
	DisplayName   string    `json:"displayName"`
	Username      string    `json:"username"`
	Role          string    `json:"role"`
	IsActive      bool      `json:"isActive"`
	Email         *string   `json:"email,omitempty"`
	PendingEmail  *string   `json:"pendingEmail,omitempty"`
	EmailVerified bool      `json:"emailVerified"`
	HasPassword   bool      `json:"hasPassword"`
	AvatarUrl     *string   `json:"avatarUrl,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type AuthProvider struct {
	Provider  string    `json:"provider"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

type PasswordSignupStore interface {
	CreateWithEmail(ctx context.Context, displayName, username, hashedPassword, role, email string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
	SetActive(ctx context.Context, id string, active bool) error
	SetEmailVerified(ctx context.Context, id string, verified bool) error
}

type OAuthStore interface {
	UpsertOAuth(ctx context.Context, provider, providerID, email, displayName, avatarURL string) (*User, error)
	UpdateRole(ctx context.Context, id string, role string) error
}
