package storagemanager

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/cshum/imagor-studio/server/model"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/storageregistry"
	"github.com/cshum/imagor-studio/server/pkg/uuid"
	"io"
	"strings"
	"sync"

	"github.com/uptrace/bun"
	"go.uber.org/zap"
	"golang.org/x/crypto/hkdf"
)

type StorageConfig struct {
	Name   string          `json:"name"`
	Key    string          `json:"key"`
	Type   string          `json:"type"`
	Config json.RawMessage `json:"config"`
}

type StorageManager interface {
	GetConfigs(ctx context.Context, ownerID string) ([]*StorageConfig, error)
	GetConfig(ctx context.Context, ownerID string, key string) (*StorageConfig, error)
	AddConfig(ctx context.Context, ownerID string, config *StorageConfig) error
	UpdateConfig(ctx context.Context, ownerID string, key string, config *StorageConfig) error
	DeleteConfig(ctx context.Context, ownerID string, key string) error
	GetDefaultStorage(ownerID string) (storage.Storage, error)
	GetStorage(ownerID string, key string) (storage.Storage, error)
}

type storageManager struct {
	db       *bun.DB
	registry storageregistry.StorageRegistry
	storages map[string]storage.Storage // Key format: "ownerID:storageKey"
	mu       sync.RWMutex
	logger   *zap.Logger
	gcm      cipher.AEAD
}

// New creates a new storage manager with the default registry
func New(db *bun.DB, logger *zap.Logger, secretKey string) (StorageManager, error) {
	return NewWithRegistry(db, logger, secretKey, storageregistry.NewStorageRegistry())
}

// NewWithRegistry creates a new storage manager with a custom registry
func NewWithRegistry(db *bun.DB, logger *zap.Logger, secretKey string, factory storageregistry.StorageRegistry) (StorageManager, error) {
	derivedKey := make([]byte, 32)
	r := hkdf.New(sha256.New, []byte(secretKey), nil, []byte("imagor-studio-storage-manager"))
	if _, err := io.ReadFull(r, derivedKey); err != nil {
		return nil, fmt.Errorf("failed to derive key: %w", err)
	}

	block, err := aes.NewCipher(derivedKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	sm := &storageManager{
		db:       db,
		registry: factory,
		storages: make(map[string]storage.Storage),
		logger:   logger,
		gcm:      gcm,
	}
	if err := sm.initializeStorages(); err != nil {
		return nil, err
	}
	return sm, nil
}

func (sm *storageManager) storageKey(ownerID string, storageKey string) string {
	return fmt.Sprintf("%s:%s", ownerID, storageKey)
}

func (sm *storageManager) initializeStorages() error {
	ctx := context.Background()
	var storageConfigs []model.Storage
	err := sm.db.NewSelect().Model(&storageConfigs).Scan(ctx)
	if err != nil {
		return fmt.Errorf("error fetching storage configs: %w", err)
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	for _, cfg := range storageConfigs {
		s, err := sm.createStorageFromModel(&cfg)
		if err != nil {
			return fmt.Errorf("error creating storage from config: %w", err)
		}
		sm.storages[sm.storageKey(cfg.OwnerID, cfg.Key)] = s
	}
	return nil
}

func (sm *storageManager) createStorageFromModel(storageModel *model.Storage) (storage.Storage, error) {
	decryptedConfig, err := sm.decryptConfig(storageModel.Config)
	if err != nil {
		return nil, fmt.Errorf("error decrypting storageModel: %w", err)
	}

	return sm.registry.CreateStorage(storageModel.Type, decryptedConfig)
}

func (sm *storageManager) encryptConfig(config json.RawMessage) (string, error) {
	nonce := make([]byte, sm.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := sm.gcm.Seal(nonce, nonce, config, nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (sm *storageManager) decryptConfig(encryptedConfig string) (json.RawMessage, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64: %w", err)
	}

	if len(ciphertext) < sm.gcm.NonceSize() {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:sm.gcm.NonceSize()], ciphertext[sm.gcm.NonceSize():]
	plaintext, err := sm.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	return plaintext, nil
}

func (sm *storageManager) GetConfigs(ctx context.Context, ownerID string) ([]*StorageConfig, error) {
	var configs []model.Storage
	err := sm.db.NewSelect().
		Model(&configs).
		Where("owner_id = ?", ownerID).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("error fetching storage configs: %w", err)
	}

	var outputs []*StorageConfig
	for _, cfg := range configs {
		decryptedConfig, err := sm.decryptConfig(cfg.Config)
		if err != nil {
			return nil, fmt.Errorf("error decrypting config: %w", err)
		}

		outputs = append(outputs, &StorageConfig{
			Name:   cfg.Name,
			Key:    cfg.Key,
			Type:   cfg.Type,
			Config: decryptedConfig,
		})
	}

	return outputs, nil
}

func (sm *storageManager) GetConfig(ctx context.Context, ownerID string, key string) (*StorageConfig, error) {
	var config model.Storage
	err := sm.db.NewSelect().
		Model(&config).
		Where("owner_id = ? AND key = ?", ownerID, key).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error fetching storage config: %w", err)
	}

	decryptedConfig, err := sm.decryptConfig(config.Config)
	if err != nil {
		return nil, fmt.Errorf("error decrypting config: %w", err)
	}

	return &StorageConfig{
		Name:   config.Name,
		Key:    config.Key,
		Type:   config.Type,
		Config: decryptedConfig,
	}, nil
}

func (sm *storageManager) AddConfig(ctx context.Context, ownerID string, config *StorageConfig) error {
	if config == nil {
		return fmt.Errorf("missing config")
	}
	encryptedConfig, err := sm.encryptConfig(config.Config)
	if err != nil {
		return fmt.Errorf("error encrypting config: %w", err)
	}

	storageModel := &model.Storage{
		ID:      uuid.GenerateUUID(), // Generate UUID for new record
		OwnerID: ownerID,
		Name:    config.Name,
		Key:     config.Key,
		Type:    config.Type,
		Config:  encryptedConfig,
	}

	_, err = sm.db.NewInsert().Model(storageModel).Exec(ctx)
	if err != nil {
		return fmt.Errorf("error inserting storage config: %w", err)
	}

	s, err := sm.createStorageFromModel(storageModel)
	if err != nil {
		return err
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.storages[sm.storageKey(ownerID, config.Key)] = s

	return nil
}

func (sm *storageManager) UpdateConfig(ctx context.Context, ownerID string, key string, config *StorageConfig) error {
	if config == nil {
		return fmt.Errorf("missing config")
	}
	encryptedConfig, err := sm.encryptConfig(config.Config)
	if err != nil {
		return fmt.Errorf("error encrypting config: %w", err)
	}

	result, err := sm.db.NewUpdate().
		Model((*model.Storage)(nil)).
		Set("name = ?", config.Name).
		Set("type = ?", config.Type).
		Set("config = ?", encryptedConfig).
		Where("owner_id = ? AND key = ?", ownerID, key).
		Exec(ctx)

	if err != nil {
		return fmt.Errorf("error updating storage config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("storage config with key %s not found for owner %s", key, ownerID)
	}

	s, err := sm.createStorageFromModel(&model.Storage{
		OwnerID: ownerID,
		Key:     key,
		Name:    config.Name,
		Type:    config.Type,
		Config:  encryptedConfig,
	})
	if err != nil {
		return fmt.Errorf("error creating storage from updated config: %w", err)
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.storages[sm.storageKey(ownerID, key)] = s

	return nil
}

func (sm *storageManager) DeleteConfig(ctx context.Context, ownerID string, key string) error {
	_, err := sm.db.NewDelete().
		Model((*model.Storage)(nil)).
		Where("owner_id = ? AND key = ?", ownerID, key).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error deleting storage config: %w", err)
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.storages, sm.storageKey(ownerID, key))
	return nil
}

func (sm *storageManager) GetDefaultStorage(ownerID string) (storage.Storage, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	var ownerStorages []storage.Storage
	for key, s := range sm.storages {
		if sKey := fmt.Sprintf("%s:", ownerID); strings.HasPrefix(key, sKey) {
			ownerStorages = append(ownerStorages, s)
		}
	}

	if len(ownerStorages) == 1 {
		return ownerStorages[0], nil
	}
	return nil, fmt.Errorf("no default storage available for owner %s: multiple or no storages are configured", ownerID)
}

func (sm *storageManager) GetStorage(ownerID string, key string) (storage.Storage, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	s, ok := sm.storages[sm.storageKey(ownerID, key)]
	if !ok {
		return nil, fmt.Errorf("invalid storage key %s for owner %s", key, ownerID)
	}
	return s, nil
}
