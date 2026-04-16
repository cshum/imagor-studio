package userstore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type User struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"displayName"`
	Username    string    `json:"username"`
	Role        string    `json:"role"`
	IsActive    bool      `json:"isActive"`
	Email       *string   `json:"email,omitempty"`
	AvatarUrl   *string   `json:"avatarUrl,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Store interface {
	Create(ctx context.Context, displayName, username, hashedPassword, role string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
	GetByIDAdmin(ctx context.Context, id string) (*User, error)
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	GetByIDWithPassword(ctx context.Context, id string) (*model.User, error)
	UpdateLastLogin(ctx context.Context, id string) error
	UpdatePassword(ctx context.Context, id string, hashedPassword string) error
	UpdateDisplayName(ctx context.Context, id string, displayName string) error
	UpdateUsername(ctx context.Context, id string, username string) error
	SetActive(ctx context.Context, id string, active bool) error
	List(ctx context.Context, offset, limit int, search string) ([]*User, int, error)
	UpsertOAuth(ctx context.Context, provider, providerID, email, displayName, avatarURL string) (*User, error)
	UpdateRole(ctx context.Context, id string, role string) error
}

// oauthIdentity is the DB model for the oauth_identities table.
type oauthIdentity struct {
	bun.BaseModel `bun:"table:oauth_identities,alias:oi"`
	ID            string    `bun:"id,pk,type:text"`
	UserID        string    `bun:"user_id,notnull,type:text"`
	Provider      string    `bun:"provider,notnull,type:text"`
	ProviderID    string    `bun:"provider_id,notnull,type:text"`
	Email         string    `bun:"email,type:text"`
	CreatedAt     time.Time `bun:"created_at,notnull,default:current_timestamp"`
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

func (s *store) UpdateRole(ctx context.Context, id string, role string) error {
	role = strings.TrimSpace(role)
	if role == "" {
		return fmt.Errorf("role cannot be empty")
	}
	_, err := s.db.NewUpdate().
		Model((*model.User)(nil)).
		Set("role = ?", role).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error updating role: %w", err)
	}
	return nil
}

func modelUserToStore(user model.User) *User {
	return &User{
		ID:          user.ID,
		DisplayName: user.DisplayName,
		Username:    user.Username,
		Role:        user.Role,
		IsActive:    user.IsActive,
		Email:       user.Email,
		AvatarUrl:   user.AvatarUrl,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
	}
}

func (s *store) Create(ctx context.Context, displayName, username, hashedPassword, role string) (*User, error) {
	// Validate inputs
	displayName = strings.TrimSpace(displayName)
	username = strings.TrimSpace(username)
	hashedPassword = strings.TrimSpace(hashedPassword)
	role = strings.TrimSpace(role)

	if displayName == "" {
		return nil, fmt.Errorf("displayName cannot be empty")
	}
	if username == "" {
		return nil, fmt.Errorf("username cannot be empty")
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
		Username:       username,
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
		if strings.Contains(errStr, "username") && (strings.Contains(errStr, "unique") || strings.Contains(errStr, "constraint")) {
			return nil, fmt.Errorf("username already exists")
		}
		return nil, fmt.Errorf("error creating user: %w", err)
	}

	return modelUserToStore(*entry), nil
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

	return modelUserToStore(user), nil
}

func (s *store) GetByIDAdmin(ctx context.Context, id string) (*User, error) {
	var user model.User
	err := s.db.NewSelect().
		Model(&user).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting user by ID: %w", err)
	}

	return modelUserToStore(user), nil
}

func (s *store) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	var user model.User
	err := s.db.NewSelect().
		Model(&user).
		Where("username = ? AND is_active = true", username).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting user by username: %w", err)
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

func (s *store) UpdateUsername(ctx context.Context, id string, username string) error {
	username = strings.TrimSpace(username)
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	_, err := s.db.NewUpdate().
		Model((*model.User)(nil)).
		Set("username = ?", username).
		Set("updated_at = ?", time.Now()).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		// Check for unique constraint violations
		errStr := strings.ToLower(err.Error())
		if strings.Contains(errStr, "username") && (strings.Contains(errStr, "unique") || strings.Contains(errStr, "constraint")) {
			return fmt.Errorf("username already exists")
		}
		return fmt.Errorf("error updating username: %w", err)
	}
	return nil
}

func (s *store) List(ctx context.Context, offset, limit int, search string) ([]*User, int, error) {
	var users []model.User
	search = strings.TrimSpace(search)
	like := "%" + strings.ToLower(search) + "%"

	// Build count query
	countQ := s.db.NewSelect().Model((*model.User)(nil))
	if search != "" {
		countQ = countQ.Where("LOWER(display_name) LIKE ? OR LOWER(username) LIKE ?", like, like)
	}
	totalCount, err := countQ.Count(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("error counting users: %w", err)
	}

	// Build data query
	dataQ := s.db.NewSelect().
		Model(&users).
		OrderExpr("created_at DESC")
	if search != "" {
		dataQ = dataQ.Where("LOWER(display_name) LIKE ? OR LOWER(username) LIKE ?", like, like)
	}

	if offset > 0 {
		dataQ = dataQ.Offset(offset)
	}
	if limit > 0 {
		dataQ = dataQ.Limit(limit)
	} else if offset > 0 {
		dataQ = dataQ.Limit(1000000)
	}

	if err = dataQ.Scan(ctx); err != nil {
		return nil, 0, fmt.Errorf("error listing users: %w", err)
	}

	result := make([]*User, len(users))
	for i, user := range users {
		result[i] = modelUserToStore(user)
	}

	return result, totalCount, nil
}

// UpsertOAuth finds or creates a user for a given OAuth provider identity.
//
// Logic:
//  1. Look up existing oauth_identity by (provider, providerID).
//  2. If found: update avatar_url on the user row, return user.
//  3. If not found: find existing user by email, or create a new one.
//  4. Insert a new oauth_identity row.
//  5. Return the user.
func (s *store) UpsertOAuth(ctx context.Context, provider, providerID, email, displayName, avatarURL string) (*User, error) {
	var result *User
	err := s.db.RunInTx(ctx, &sql.TxOptions{}, func(ctx context.Context, tx bun.Tx) error {
		now := time.Now()

		// 1. Look up existing oauth_identity.
		var identity oauthIdentity
		err := tx.NewSelect().
			Model(&identity).
			Where("provider = ? AND provider_id = ?", provider, providerID).
			Scan(ctx)

		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("error looking up oauth identity: %w", err)
		}

		if err == nil {
			// 2. Identity found — update avatar_url and return user.
			var avatarPtr *string
			if avatarURL != "" {
				avatarPtr = &avatarURL
			}
			_, updateErr := tx.NewUpdate().
				Model((*model.User)(nil)).
				Set("avatar_url = ?", avatarPtr).
				Set("updated_at = ?", now).
				Where("id = ?", identity.UserID).
				Exec(ctx)
			if updateErr != nil {
				s.logger.Warn("Failed to update avatar_url for existing OAuth user",
					zap.String("userID", identity.UserID), zap.Error(updateErr))
			}

			var user model.User
			if scanErr := tx.NewSelect().
				Model(&user).
				Where("id = ?", identity.UserID).
				Scan(ctx); scanErr != nil {
				return fmt.Errorf("error loading OAuth user: %w", scanErr)
			}
			result = modelUserToStore(user)
			return nil
		}

		// 3. No existing identity — find user by email or create new user.
		var userEntry model.User
		userFound := false

		if email != "" {
			findErr := tx.NewSelect().
				Model(&userEntry).
				Where("email = ?", email).
				Scan(ctx)
			if findErr != nil && !errors.Is(findErr, sql.ErrNoRows) {
				return fmt.Errorf("error looking up user by email: %w", findErr)
			}
			if findErr == nil {
				userFound = true
			}
		}

		if !userFound {
			// Generate a username from the email local part, falling back to a UUID prefix.
			baseUsername := "user"
			if email != "" {
				parts := strings.Split(email, "@")
				if parts[0] != "" {
					baseUsername = parts[0]
				}
			}
			// Sanitize: keep only alphanumeric and hyphens/underscores.
			var sanitized strings.Builder
			for _, r := range baseUsername {
				if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
					sanitized.WriteRune(r)
				}
			}
			baseUsername = strings.ToLower(sanitized.String())
			if baseUsername == "" {
				baseUsername = "user"
			}

			// Ensure uniqueness — append a random suffix if the username exists.
			username := baseUsername
			for {
				var existing model.User
				checkErr := tx.NewSelect().
					Model(&existing).
					Where("username = ?", username).
					Scan(ctx)
				if errors.Is(checkErr, sql.ErrNoRows) {
					break // username is free
				}
				if checkErr != nil {
					return fmt.Errorf("error checking username uniqueness: %w", checkErr)
				}
				// Collision — append random suffix.
				suffix := uuid.GenerateUUID()[:8]
				username = baseUsername + "-" + suffix
			}

			if displayName == "" {
				displayName = username
			}

			var avatarPtr *string
			if avatarURL != "" {
				avatarPtr = &avatarURL
			}
			var emailPtr *string
			if email != "" {
				emailPtr = &email
			}

			userEntry = model.User{
				ID:             uuid.GenerateUUID(),
				DisplayName:    displayName,
				Username:       username,
				HashedPassword: "oauth",
				Role:           "user",
				IsActive:       true,
				Email:          emailPtr,
				AvatarUrl:      avatarPtr,
				CreatedAt:      now,
				UpdatedAt:      now,
			}

			if _, insertErr := tx.NewInsert().Model(&userEntry).Exec(ctx); insertErr != nil {
				return fmt.Errorf("error creating OAuth user: %w", insertErr)
			}
		}

		// 4. Insert oauth_identity row.
		newIdentity := &oauthIdentity{
			ID:         uuid.GenerateUUID(),
			UserID:     userEntry.ID,
			Provider:   provider,
			ProviderID: providerID,
			Email:      email,
			CreatedAt:  now,
		}
		if _, insertErr := tx.NewInsert().Model(newIdentity).Exec(ctx); insertErr != nil {
			return fmt.Errorf("error inserting oauth identity: %w", insertErr)
		}

		// 5. Return user.
		result = modelUserToStore(userEntry)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
