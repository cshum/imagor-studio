package registrystore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/cshum/imagor-studio/server/internal/encryption"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type Registry struct {
	Key         string    `json:"key"`
	Value       string    `json:"value"`
	IsEncrypted bool      `json:"isEncrypted"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type RegistryEntry struct {
	Key         string `json:"key"`
	Value       string `json:"value"`
	IsEncrypted bool   `json:"isEncrypted"`
}

type Store interface {
	List(ctx context.Context, ownerID string, prefix *string) ([]*Registry, error)
	Get(ctx context.Context, ownerID, key string) (*Registry, error)
	Set(ctx context.Context, ownerID, key, value string, isEncrypted bool) (*Registry, error)
	SetMulti(ctx context.Context, ownerID string, entries []RegistryEntry) ([]*Registry, error)
	Delete(ctx context.Context, ownerID, key string) error
}

type store struct {
	db         *bun.DB
	logger     *zap.Logger
	encryption *encryption.Service
}

func New(db *bun.DB, logger *zap.Logger, encryptionService *encryption.Service) Store {
	return &store{
		db:         db,
		logger:     logger,
		encryption: encryptionService,
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
		value := entry.Value

		// Decrypt if encrypted
		if entry.IsEncrypted && s.encryption != nil {
			var decryptErr error
			if encryption.IsJWTSecret(entry.Key) {
				value, decryptErr = s.encryption.DecryptWithMaster(entry.Value)
			} else {
				value, decryptErr = s.encryption.DecryptWithJWT(entry.Value)
			}
			if decryptErr != nil {
				s.logger.Error("Failed to decrypt registry value",
					zap.String("key", entry.Key),
					zap.Error(decryptErr))
				// Continue with encrypted value rather than failing
			}
		}

		result = append(result, &Registry{
			Key:         entry.Key,
			Value:       value,
			IsEncrypted: entry.IsEncrypted,
			CreatedAt:   entry.CreatedAt,
			UpdatedAt:   entry.UpdatedAt,
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

	value := entry.Value

	// Decrypt if encrypted
	if entry.IsEncrypted && s.encryption != nil {
		var decryptErr error
		if encryption.IsJWTSecret(entry.Key) {
			value, decryptErr = s.encryption.DecryptWithMaster(entry.Value)
		} else {
			value, decryptErr = s.encryption.DecryptWithJWT(entry.Value)
		}
		if decryptErr != nil {
			return nil, fmt.Errorf("failed to decrypt registry value for key %s: %w", key, decryptErr)
		}
	}

	return &Registry{
		Key:         entry.Key,
		Value:       value,
		IsEncrypted: entry.IsEncrypted,
		CreatedAt:   entry.CreatedAt,
		UpdatedAt:   entry.UpdatedAt,
	}, nil
}

// setWithinTx is a private method that handles the core logic for setting registry entries within a transaction
func (s *store) setWithinTx(ctx context.Context, tx bun.Tx, ownerID string, entries []RegistryEntry, now time.Time) ([]*Registry, error) {
	var result []*Registry

	for _, entry := range entries {
		// Validate JWT secret must always be encrypted
		if encryption.IsJWTSecret(entry.Key) && !entry.IsEncrypted {
			return nil, fmt.Errorf("JWT secret must always be encrypted")
		}

		finalValue := entry.Value

		// Encrypt if needed
		if entry.IsEncrypted && s.encryption != nil {
			var encryptErr error
			if encryption.IsJWTSecret(entry.Key) {
				finalValue, encryptErr = s.encryption.EncryptWithMaster(entry.Value)
			} else {
				finalValue, encryptErr = s.encryption.EncryptWithJWT(entry.Value)
			}
			if encryptErr != nil {
				return nil, fmt.Errorf("failed to encrypt registry value for key %s: %w", entry.Key, encryptErr)
			}
		}

		modelEntry := &model.Registry{
			ID:          uuid.GenerateUUID(),
			OwnerID:     ownerID,
			Key:         entry.Key,
			Value:       finalValue,
			IsEncrypted: entry.IsEncrypted,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		// Database-level enforcement: prevent changing encryption state of existing entries
		// For new entries, insert normally. For existing entries, only allow update if encryption state matches
		_, err := tx.NewInsert().
			Model(modelEntry).
			On("CONFLICT (owner_id, key) DO UPDATE").
			Set("value = EXCLUDED.value").
			Set("updated_at = EXCLUDED.updated_at").
			Where("r.is_encrypted = EXCLUDED.is_encrypted").
			Exec(ctx)
		if err != nil {
			return nil, fmt.Errorf("error setting registry for key %s: %w", entry.Key, err)
		}

		// Return the data we know without SELECT query
		result = append(result, &Registry{
			Key:         entry.Key,
			Value:       entry.Value, // Return original unencrypted value
			IsEncrypted: entry.IsEncrypted,
			CreatedAt:   now,
			UpdatedAt:   now,
		})
	}

	return result, nil
}

func (s *store) Set(ctx context.Context, ownerID, key, value string, isEncrypted bool) (*Registry, error) {
	now := time.Now()
	entries := []RegistryEntry{{Key: key, Value: value, IsEncrypted: isEncrypted}}

	var result []*Registry
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var txErr error
		result, txErr = s.setWithinTx(ctx, tx, ownerID, entries, now)
		return txErr
	})

	if err != nil {
		return nil, err
	}

	return result[0], nil
}

func (s *store) SetMulti(ctx context.Context, ownerID string, entries []RegistryEntry) ([]*Registry, error) {
	if len(entries) == 0 {
		return []*Registry{}, nil
	}

	now := time.Now()
	var result []*Registry

	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var txErr error
		result, txErr = s.setWithinTx(ctx, tx, ownerID, entries, now)
		return txErr
	})

	if err != nil {
		return nil, err
	}

	return result, nil
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
