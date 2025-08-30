package registrystore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type Registry struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Store interface {
	List(ctx context.Context, ownerID string, prefix *string) ([]*Registry, error)
	Get(ctx context.Context, ownerID, key string) (*Registry, error)
	Set(ctx context.Context, ownerID, key, value string) (*Registry, error)
	Delete(ctx context.Context, ownerID, key string) error
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

func (s *store) List(ctx context.Context, ownerID string, prefix *string) ([]*Registry, error) {
	var entries []model.Registry
	query := s.db.NewSelect().
		Model(&entries).
		Where("owner_id = ?", ownerID)

	if prefix != nil && *prefix != "" {
		query = query.Where("key LIKE ?", *prefix+"%")
	}

	err := query.OrderExpr("key ASC").Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("error listing registry: %w", err)
	}

	var result []*Registry
	for _, entry := range entries {
		result = append(result, &Registry{
			Key:       entry.Key,
			Value:     entry.Value,
			CreatedAt: entry.CreatedAt,
			UpdatedAt: entry.UpdatedAt,
		})
	}

	return result, nil
}

func (s *store) Get(ctx context.Context, ownerID, key string) (*Registry, error) {
	var entry model.Registry
	err := s.db.NewSelect().
		Model(&entry).
		Where("owner_id = ? AND key = ?", ownerID, key).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting registry: %w", err)
	}

	return &Registry{
		Key:       entry.Key,
		Value:     entry.Value,
		CreatedAt: entry.CreatedAt,
		UpdatedAt: entry.UpdatedAt,
	}, nil
}

func (s *store) Set(ctx context.Context, ownerID, key, value string) (*Registry, error) {
	now := time.Now()
	entry := &model.Registry{
		ID:        uuid.GenerateUUID(),
		OwnerID:   ownerID,
		Key:       key,
		Value:     value,
		CreatedAt: now,
		UpdatedAt: now,
	}

	_, err := s.db.NewInsert().
		Model(entry).
		On("CONFLICT (owner_id, key) DO UPDATE").
		Set("value = EXCLUDED.value").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("error setting registry: %w", err)
	}

	return &Registry{
		Key:       entry.Key,
		Value:     entry.Value,
		CreatedAt: entry.CreatedAt,
		UpdatedAt: entry.UpdatedAt,
	}, nil
}

func (s *store) Delete(ctx context.Context, ownerID, key string) error {
	result, err := s.db.NewDelete().
		Model((*model.Registry)(nil)).
		Where("owner_id = ? AND key = ?", ownerID, key).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error deleting registry: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("registry with key %s not found for owner %s", key, ownerID)
	}

	return nil
}
