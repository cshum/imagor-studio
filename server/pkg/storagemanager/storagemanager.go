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
	"github.com/cshum/imagor-studio/server/models"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"io"
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
	GetConfigs(ctx context.Context) ([]StorageConfig, error)
	GetConfig(ctx context.Context, key string) (*StorageConfig, error)
	AddConfig(ctx context.Context, config StorageConfig) error
	UpdateConfig(ctx context.Context, key string, config StorageConfig) error
	DeleteConfig(ctx context.Context, key string) error
	GetDefaultStorage() (storage.Storage, error)
	GetStorage(key string) (storage.Storage, error)
}

type storageManager struct {
	db       *bun.DB
	storages map[string]storage.Storage
	mu       sync.RWMutex
	logger   *zap.Logger
	gcm      cipher.AEAD
}

func New(db *bun.DB, logger *zap.Logger, secretKey string) (StorageManager, error) {
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
		storages: make(map[string]storage.Storage),
		logger:   logger,
		gcm:      gcm,
	}
	if err := sm.initializeStorages(); err != nil {
		return nil, err
	}
	return sm, nil
}

func (sm *storageManager) initializeStorages() error {
	ctx := context.Background()
	var storageConfigs []models.Storage
	err := sm.db.NewSelect().Model(&storageConfigs).Scan(ctx)
	if err != nil {
		return fmt.Errorf("error fetching storage storageConfigs: %w", err)
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	for _, cfg := range storageConfigs {
		s, err := sm.createStorage(&cfg)
		if err != nil {
			return fmt.Errorf("error creating storage from config: %w", err)
		}
		sm.storages[cfg.Key] = s
	}
	return nil
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

func (sm *storageManager) GetConfigs(ctx context.Context) ([]StorageConfig, error) {
	var configs []models.Storage
	err := sm.db.NewSelect().Model(&configs).Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("error fetching storage configs: %w", err)
	}

	var outputs []StorageConfig
	for _, cfg := range configs {
		decryptedConfig, err := sm.decryptConfig(cfg.Config)
		if err != nil {
			return nil, fmt.Errorf("error decrypting config: %w", err)
		}

		outputs = append(outputs, StorageConfig{
			Name:   cfg.Name,
			Key:    cfg.Key,
			Type:   cfg.Type,
			Config: decryptedConfig,
		})
	}

	return outputs, nil
}

func (sm *storageManager) GetConfig(ctx context.Context, key string) (*StorageConfig, error) {
	var config models.Storage
	err := sm.db.NewSelect().Model(&config).Where("key = ?", key).Scan(ctx)
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

func (sm *storageManager) AddConfig(ctx context.Context, config StorageConfig) error {
	encryptedConfig, err := sm.encryptConfig(config.Config)
	if err != nil {
		return fmt.Errorf("error encrypting config: %w", err)
	}

	storageModel := &models.Storage{
		Name:   config.Name,
		Key:    config.Key,
		Type:   config.Type,
		Config: encryptedConfig,
	}

	_, err = sm.db.NewInsert().Model(storageModel).Exec(ctx)
	if err != nil {
		return fmt.Errorf("error inserting storageModel config: %w", err)
	}

	s, err := sm.createStorage(storageModel)
	if err != nil {
		return err
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.storages[config.Key] = s

	return nil
}

func (sm *storageManager) UpdateConfig(ctx context.Context, key string, config StorageConfig) error {
	encryptedConfig, err := sm.encryptConfig(config.Config)
	if err != nil {
		return fmt.Errorf("error encrypting config: %w", err)
	}

	result, err := sm.db.NewUpdate().
		Model((*models.Storage)(nil)).
		Set("name = ?", config.Name).
		Set("type = ?", config.Type).
		Set("config = ?", encryptedConfig).
		Where("key = ?", key).
		Exec(ctx)

	if err != nil {
		return fmt.Errorf("error updating storage config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("storage config with key %s not found", key)
	}

	s, err := sm.createStorage(&models.Storage{
		Key:    key,
		Name:   config.Name,
		Type:   config.Type,
		Config: encryptedConfig,
	})
	if err != nil {
		return fmt.Errorf("error creating storage from updated config: %w", err)
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.storages[key] = s

	return nil
}

func (sm *storageManager) DeleteConfig(ctx context.Context, key string) error {
	_, err := sm.db.NewDelete().Model((*models.Storage)(nil)).Where("key = ?", key).Exec(ctx)
	if err != nil {
		return fmt.Errorf("error deleting storage config: %w", err)
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.storages, key)
	return nil
}

func (sm *storageManager) GetDefaultStorage() (storage.Storage, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	if len(sm.storages) == 1 {
		for _, s := range sm.storages {
			return s, nil
		}
	}
	return nil, fmt.Errorf("no default storage available: multiple storages are configured")
}

func (sm *storageManager) GetStorage(key string) (storage.Storage, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	s, ok := sm.storages[key]
	if !ok {
		return nil, fmt.Errorf("invalid storage key: %s", key)
	}
	return s, nil
}
