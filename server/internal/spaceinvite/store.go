package spaceinvite

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
)

type Invitation struct {
	ID              string
	OrgID           string
	SpaceKey        string
	Email           string
	Role            string
	Token           string
	InvitedByUserID string
	AcceptedAt      *time.Time
	ExpiresAt       time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Store interface {
	CreateOrRefreshPending(ctx context.Context, orgID, spaceKey, email, role, invitedByUserID string, expiresAt time.Time) (*Invitation, error)
	ListPendingBySpace(ctx context.Context, orgID, spaceKey string) ([]*Invitation, error)
	GetPendingByToken(ctx context.Context, token string) (*Invitation, error)
	MarkAccepted(ctx context.Context, id string, acceptedAt time.Time) error
	RenameSpaceKey(ctx context.Context, orgID, oldSpaceKey, newSpaceKey string) error
}

type store struct {
	db *bun.DB
}

func NewStore(db *bun.DB) Store {
	return &store{db: db}
}

func rowToInvitation(row *model.SpaceInvitation) *Invitation {
	if row == nil {
		return nil
	}
	return &Invitation{
		ID:              row.ID,
		OrgID:           row.OrgID,
		SpaceKey:        row.SpaceKey,
		Email:           row.Email,
		Role:            row.Role,
		Token:           row.Token,
		InvitedByUserID: row.InvitedByUserID,
		AcceptedAt:      row.AcceptedAt,
		ExpiresAt:       row.ExpiresAt,
		CreatedAt:       row.CreatedAt,
		UpdatedAt:       row.UpdatedAt,
	}
}

func (s *store) CreateOrRefreshPending(ctx context.Context, orgID, spaceKey, email, role, invitedByUserID string, expiresAt time.Time) (*Invitation, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if normalizedEmail == "" {
		return nil, fmt.Errorf("email is required")
	}

	now := time.Now().UTC()
	var result *Invitation
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var existing model.SpaceInvitation
		scanErr := tx.NewSelect().
			Model(&existing).
			Where("org_id = ?", orgID).
			Where("space_key = ?", spaceKey).
			Where("email = ?", normalizedEmail).
			Where("accepted_at IS NULL").
			Limit(1).
			Scan(ctx)
		if scanErr != nil && !errors.Is(scanErr, sql.ErrNoRows) {
			return fmt.Errorf("lookup pending invitation: %w", scanErr)
		}

		if scanErr == nil {
			existing.Role = role
			existing.InvitedByUserID = invitedByUserID
			existing.ExpiresAt = expiresAt
			existing.UpdatedAt = now
			if existing.Token == "" {
				token, tokenErr := generateToken()
				if tokenErr != nil {
					return tokenErr
				}
				existing.Token = token
			}
			if _, err := tx.NewUpdate().
				Model(&existing).
				Column("role", "invited_by_user_id", "expires_at", "updated_at", "token").
				WherePK().
				Exec(ctx); err != nil {
				return fmt.Errorf("refresh pending invitation: %w", err)
			}
			result = rowToInvitation(&existing)
			return nil
		}

		token, tokenErr := generateToken()
		if tokenErr != nil {
			return tokenErr
		}

		entry := &model.SpaceInvitation{
			ID:              uuid.GenerateUUID(),
			OrgID:           orgID,
			SpaceKey:        spaceKey,
			Email:           normalizedEmail,
			Role:            role,
			Token:           token,
			InvitedByUserID: invitedByUserID,
			ExpiresAt:       expiresAt,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		if _, err := tx.NewInsert().Model(entry).Exec(ctx); err != nil {
			return fmt.Errorf("create pending invitation: %w", err)
		}
		result = rowToInvitation(entry)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *store) ListPendingBySpace(ctx context.Context, orgID, spaceKey string) ([]*Invitation, error) {
	var rows []model.SpaceInvitation
	err := s.db.NewSelect().
		Model(&rows).
		Where("org_id = ?", orgID).
		Where("space_key = ?", spaceKey).
		Where("accepted_at IS NULL").
		Where("expires_at > ?", time.Now().UTC()).
		OrderExpr("created_at ASC").
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("list space invitations: %w", err)
	}

	result := make([]*Invitation, 0, len(rows))
	for i := range rows {
		result = append(result, rowToInvitation(&rows[i]))
	}
	return result, nil
}

func (s *store) GetPendingByToken(ctx context.Context, token string) (*Invitation, error) {
	var row model.SpaceInvitation
	err := s.db.NewSelect().
		Model(&row).
		Where("token = ?", token).
		Where("accepted_at IS NULL").
		Where("expires_at > ?", time.Now().UTC()).
		Limit(1).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get invitation by token: %w", err)
	}
	return rowToInvitation(&row), nil
}

func (s *store) MarkAccepted(ctx context.Context, id string, acceptedAt time.Time) error {
	_, err := s.db.NewUpdate().
		Model((*model.SpaceInvitation)(nil)).
		Set("accepted_at = ?", acceptedAt).
		Set("updated_at = ?", acceptedAt).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("mark invitation accepted: %w", err)
	}
	return nil
}

func (s *store) RenameSpaceKey(ctx context.Context, orgID, oldSpaceKey, newSpaceKey string) error {
	oldSpaceKey = strings.TrimSpace(oldSpaceKey)
	newSpaceKey = strings.TrimSpace(newSpaceKey)
	if oldSpaceKey == newSpaceKey {
		return nil
	}
	_, err := s.db.NewUpdate().
		Model((*model.SpaceInvitation)(nil)).
		Set("space_key = ?", newSpaceKey).
		Set("updated_at = ?", time.Now().UTC()).
		Where("org_id = ?", orgID).
		Where("space_key = ?", oldSpaceKey).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("rename invitation space key %s -> %s: %w", oldSpaceKey, newSpaceKey, err)
	}
	return nil
}

func generateToken() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate invitation token: %w", err)
	}
	return hex.EncodeToString(buf), nil
}
