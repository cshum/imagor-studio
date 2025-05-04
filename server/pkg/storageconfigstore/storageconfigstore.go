package storageconfigstore

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

type Config struct {
	Name   string          `json:"name"`
	Key    string          `json:"key"`
	Type   string          `json:"type"`
	Config json.RawMessage `json:"config"`
}

type Store interface {
	List(ctx context.Context, ownerID string) ([]*Config, error)
	Get(ctx context.Context, ownerID string, key string) (*Config, error)
	Create(ctx context.Context, ownerID string, config *Config) error
	Update(ctx context.Context, ownerID string, key string, config *Config) error
	Delete(ctx context.Context, ownerID string, key string) error
	DefaultStorage(ownerID string) (storage.Storage, error)
	Storage(ownerID string, key string) (storage.Storage, error)
}

type store struct {
	db       *bun.DB
	registry storageregistry.StorageRegistry
	storages map[string]storage.Storage // Key format: "ownerID:storageKey"
	mu       sync.RWMutex
	logger   *zap.Logger
	gcm      cipher.AEAD
}

// New creates a new storage config store with the default registry
func New(db *bun.DB, logger *zap.Logger, secretKey string) (Store, error) {
	return NewWithRegistry(db, logger, secretKey, storageregistry.NewStorageRegistry())
}

// NewWithRegistry creates a new storage config store with a custom registry
func NewWithRegistry(db *bun.DB, logger *zap.Logger, secretKey string, registry storageregistry.StorageRegistry) (Store, error) {
	derivedKey := make([]byte, 32)
	r := hkdf.New(sha256.New, []byte(secretKey), nil, []byte("imagor-studio"))
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

	sm := &store{
		db:       db,
		registry: registry,
		storages: make(map[string]storage.Storage),
		logger:   logger,
		gcm:      gcm,
	}
	if err := sm.initializeStorages(); err != nil {
		return nil, err
	}
	return sm, nil
}

func (st *store) storageKey(ownerID string, storageKey string) string {
	return fmt.Sprintf("%s:%s", ownerID, storageKey)
}

func (st *store) initializeStorages() error {
	ctx := context.Background()
	var storageConfigs []model.Storage
	err := st.db.NewSelect().Model(&storageConfigs).Scan(ctx)
	if err != nil {
		return fmt.Errorf("error fetching storage configs: %w", err)
	}

	st.mu.Lock()
	defer st.mu.Unlock()
	for _, cfg := range storageConfigs {
		s, err := st.createStorageFromModel(&cfg)
		if err != nil {
			return fmt.Errorf("error creating storage from config: %w", err)
		}
		st.storages[st.storageKey(cfg.OwnerID, cfg.Key)] = s
	}
	return nil
}

func (st *store) createStorageFromModel(storageModel *model.Storage) (storage.Storage, error) {
	decryptedConfig, err := st.decryptConfig(storageModel.Config)
	if err != nil {
		return nil, fmt.Errorf("error decrypting storageModel: %w", err)
	}

	return st.registry.CreateStorage(storageModel.Type, decryptedConfig)
}

func (st *store) encryptConfig(config json.RawMessage) (string, error) {
	nonce := make([]byte, st.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := st.gcm.Seal(nonce, nonce, config, nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (st *store) decryptConfig(encryptedConfig string) (json.RawMessage, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64: %w", err)
	}

	if len(ciphertext) < st.gcm.NonceSize() {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:st.gcm.NonceSize()], ciphertext[st.gcm.NonceSize():]
	plaintext, err := st.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	return plaintext, nil
}

func (st *store) List(ctx context.Context, ownerID string) ([]*Config, error) {
	var configs []model.Storage
	err := st.db.NewSelect().
		Model(&configs).
		Where("owner_id = ?", ownerID).
		Scan(ctx)
	if err != nil {
		return nil, fmt.Errorf("error fetching storage configs: %w", err)
	}

	var outputs []*Config
	for _, cfg := range configs {
		decryptedConfig, err := st.decryptConfig(cfg.Config)
		if err != nil {
			return nil, fmt.Errorf("error decrypting config: %w", err)
		}

		outputs = append(outputs, &Config{
			Name:   cfg.Name,
			Key:    cfg.Key,
			Type:   cfg.Type,
			Config: decryptedConfig,
		})
	}

	return outputs, nil
}

func (st *store) Get(ctx context.Context, ownerID string, key string) (*Config, error) {
	var config model.Storage
	err := st.db.NewSelect().
		Model(&config).
		Where("owner_id = ? AND key = ?", ownerID, key).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error fetching storage config: %w", err)
	}

	decryptedConfig, err := st.decryptConfig(config.Config)
	if err != nil {
		return nil, fmt.Errorf("error decrypting config: %w", err)
	}

	return &Config{
		Name:   config.Name,
		Key:    config.Key,
		Type:   config.Type,
		Config: decryptedConfig,
	}, nil
}

func (st *store) Create(ctx context.Context, ownerID string, config *Config) error {
	if config == nil {
		return fmt.Errorf("missing config")
	}
	encryptedConfig, err := st.encryptConfig(config.Config)
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

	_, err = st.db.NewInsert().Model(storageModel).Exec(ctx)
	if err != nil {
		return fmt.Errorf("error inserting storage config: %w", err)
	}

	s, err := st.createStorageFromModel(storageModel)
	if err != nil {
		return err
	}

	st.mu.Lock()
	defer st.mu.Unlock()
	st.storages[st.storageKey(ownerID, config.Key)] = s

	return nil
}

func (st *store) Update(ctx context.Context, ownerID string, key string, config *Config) error {
	if config == nil {
		return fmt.Errorf("missing config")
	}
	encryptedConfig, err := st.encryptConfig(config.Config)
	if err != nil {
		return fmt.Errorf("error encrypting config: %w", err)
	}

	result, err := st.db.NewUpdate().
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

	s, err := st.createStorageFromModel(&model.Storage{
		OwnerID: ownerID,
		Key:     key,
		Name:    config.Name,
		Type:    config.Type,
		Config:  encryptedConfig,
	})
	if err != nil {
		return fmt.Errorf("error creating storage from updated config: %w", err)
	}

	st.mu.Lock()
	defer st.mu.Unlock()
	st.storages[st.storageKey(ownerID, key)] = s

	return nil
}

func (st *store) Delete(ctx context.Context, ownerID string, key string) error {
	_, err := st.db.NewDelete().
		Model((*model.Storage)(nil)).
		Where("owner_id = ? AND key = ?", ownerID, key).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("error deleting storage config: %w", err)
	}

	st.mu.Lock()
	defer st.mu.Unlock()
	delete(st.storages, st.storageKey(ownerID, key))
	return nil
}

func (st *store) DefaultStorage(ownerID string) (storage.Storage, error) {
	st.mu.RLock()
	defer st.mu.RUnlock()

	var ownerStorages []storage.Storage
	for key, s := range st.storages {
		if sKey := fmt.Sprintf("%s:", ownerID); strings.HasPrefix(key, sKey) {
			ownerStorages = append(ownerStorages, s)
		}
	}

	if len(ownerStorages) == 1 {
		return ownerStorages[0], nil
	}
	return nil, fmt.Errorf("no default storage available for owner %s: multiple or no storages are configured", ownerID)
}

func (st *store) Storage(ownerID string, key string) (storage.Storage, error) {
	st.mu.RLock()
	defer st.mu.RUnlock()

	s, ok := st.storages[st.storageKey(ownerID, key)]
	if !ok {
		return nil, fmt.Errorf("invalid storage key %s for owner %s", key, ownerID)
	}
	return s, nil
}
