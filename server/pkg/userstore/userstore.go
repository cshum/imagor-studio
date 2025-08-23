package userstore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/model"
	"github.com/cshum/imagor-studio/server/pkg/uuid"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type User struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"displayName"`
	Email       string    `json:"email"`
	Role        string    `json:"role"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Store interface {
	Create(ctx context.Context, displayName, email, hashedPassword, role string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetByIDWithPassword(ctx context.Context, id string) (*model.User, error)
	UpdateLastLogin(ctx context.Context, id string) error
	UpdatePassword(ctx context.Context, id string, hashedPassword string) error
	UpdateDisplayName(ctx context.Context, id string, displayName string) error
	UpdateEmail(ctx context.Context, id string, email string) error
	SetActive(ctx context.Context, id string, active bool) error
	List(ctx context.Context, offset, limit int) ([]*User, int, error)
}

type store struct {
	db     *bun.DB
	logger *zap.Logger
}

func New(db *bun.DB, logger *zap.Logger) Store {
	return &store{
		db:     db,
		logger: logger,
	}
}

func (s *store) Create(ctx context.Context, displayName, email, hashedPassword, role string) (*User, error) {
	// Validate inputs
	displayName = strings.TrimSpace(displayName)
	email = strings.TrimSpace(email)
	hashedPassword = strings.TrimSpace(hashedPassword)
	role = strings.TrimSpace(role)

	if displayName == "" {
		return nil, fmt.Errorf("displayName cannot be empty")
	}
	if email == "" {
		return nil, fmt.Errorf("email cannot be empty")
	}
	if hashedPassword == "" {
		return nil, fmt.Errorf("hashed password cannot be empty")
	}
	if role == "" {
		return nil, fmt.Errorf("role cannot be empty")
	}

	now := time.Now()
	entry := &model.User{
		ID:             uuid.GenerateUUID(),
		DisplayName:    displayName,
		Email:          email,
		HashedPassword: hashedPassword,
		Role:           role,
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	_, err := s.db.NewInsert().
		Model(entry).
		Exec(ctx)
	if err != nil {
		// Check for unique constraint violations
		errStr := strings.ToLower(err.Error())
		if strings.Contains(errStr, "email") && (strings.Contains(errStr, "unique") || strings.Contains(errStr, "constraint")) {
			return nil, fmt.Errorf("email already exists")
		}
		return nil, fmt.Errorf("error creating user: %w", err)
	}

	return &User{
		ID:          entry.ID,
		DisplayName: entry.DisplayName,
		Email:       entry.Email,
		Role:        entry.Role,
		IsActive:    entry.IsActive,
		CreatedAt:   entry.CreatedAt,
		UpdatedAt:   entry.UpdatedAt,
	}, nil
}

func (s *store) GetByID(ctx context.Context, id string) (*User, error) {
	var user model.User
	err := s.db.NewSelect().
		Model(&user).
		Where("id = ? AND is_active = true", id).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting user by ID: %w", err)
	}

	return &User{
		ID:          user.ID,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		Role:        user.Role,
		IsActive:    user.IsActive,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
	}, nil
}

func (s *store) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	err := s.db.NewSelect().
		Model(&user).
		Where("email = ? AND is_active = true", email).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting user by email: %w", err)
	}

	return &user, nil
}

func (s *store) GetByIDWithPassword(ctx context.Context, id string) (*model.User, error) {
	var user model.User
	err := s.db.NewSelect().
		Model(&user).
		Where("id = ? AND is_active = true", id).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting user by ID with password: %w", err)
	}
	return &user, nil
}

func (s *store) UpdateLastLogin(ctx context.Context, id string) error {
	_, err := s.db.NewUpdate().
		Model((*model.User)(nil)).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error updating last login: %w", err)
	}
	return nil
}

func (s *store) UpdatePassword(ctx context.Context, id string, hashedPassword string) error {
	_, err := s.db.NewUpdate().
		Model((*model.User)(nil)).
		Set("hashed_password = ?", hashedPassword).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error updating password: %w", err)
	}
	return nil
}

func (s *store) SetActive(ctx context.Context, id string, active bool) error {
	_, err := s.db.NewUpdate().
		Model((*model.User)(nil)).
		Set("is_active = ?", active).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error updating user active status: %w", err)
	}
	return nil
}

func (s *store) UpdateDisplayName(ctx context.Context, id string, displayName string) error {
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		return fmt.Errorf("displayName cannot be empty")
	}
	_, err := s.db.NewUpdate().
		Model((*model.User)(nil)).
		Set("display_name = ?", displayName).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error updating displayName: %w", err)
	}
	return nil
}

func (s *store) UpdateEmail(ctx context.Context, id string, email string) error {
	email = strings.TrimSpace(email)
	if email == "" {
		return fmt.Errorf("email cannot be empty")
	}

	_, err := s.db.NewUpdate().
		Model((*model.User)(nil)).
		Set("email = ?", email).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		// Check for unique constraint violations
		errStr := strings.ToLower(err.Error())
		if strings.Contains(errStr, "email") && (strings.Contains(errStr, "unique") || strings.Contains(errStr, "constraint")) {
			return fmt.Errorf("email already exists")
		}
		return fmt.Errorf("error updating email: %w", err)
	}
	return nil
}

func (s *store) List(ctx context.Context, offset, limit int) ([]*User, int, error) {
	var users []model.User

	// Get total count
	totalCount, err := s.db.NewSelect().
		Model((*model.User)(nil)).
		Where("is_active = true").
		Count(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("error counting users: %w", err)
	}

	// Get paginated results
	err = s.db.NewSelect().
		Model(&users).
		Where("is_active = true").
		OrderExpr("created_at DESC").
		Offset(offset).
		Limit(limit).
		Scan(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("error listing users: %w", err)
	}

	result := make([]*User, len(users))
	for i, user := range users {
		result[i] = &User{
			ID:          user.ID,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Role:        user.Role,
			IsActive:    user.IsActive,
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		}
	}

	return result, totalCount, nil
}
