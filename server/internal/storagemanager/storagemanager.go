package storagemanager

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"sync"

	"github.com/cshum/imagor-studio/server/ent"
	"github.com/cshum/imagor-studio/server/ent/storage"
	"github.com/cshum/imagor-studio/server/internal/storagestore"
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
	GetDefaultStorage() (storagestore.Storage, error)
	GetStorage(key string) (storagestore.Storage, error)
}

type storageManager struct {
	db       *ent.Client
	storages map[string]storagestore.Storage
	mu       sync.RWMutex
	logger   *zap.Logger
	gcm      cipher.AEAD
}

func New(db *ent.Client, logger *zap.Logger, secretKey string) (StorageManager, error) {
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
		storages: make(map[string]storagestore.Storage),
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
	configs, err := sm.db.Storage.Query().All(ctx)
	if err != nil {
		return fmt.Errorf("error fetching storage configs: %w", err)
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	for _, cfg := range configs {
		s, err := sm.createStorageFromConfig(cfg)
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
	configs, err := sm.db.Storage.Query().All(ctx)
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
	config, err := sm.db.Storage.Query().Where(storage.Key(key)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil // Return nil, nil when no config is found
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

	_, err = sm.db.Storage.Create().
		SetName(config.Name).
		SetKey(config.Key).
		SetType(config.Type).
		SetConfig(encryptedConfig).
		Save(ctx)

	if err != nil {
		return fmt.Errorf("error inserting storage config: %w", err)
	}

	s, err := sm.createStorageFromConfig(&ent.Storage{
		Name:   config.Name,
		Key:    config.Key,
		Type:   config.Type,
		Config: encryptedConfig,
	})
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

	updatedRows, err := sm.db.Storage.Update().
		Where(storage.Key(key)).
		SetName(config.Name).
		SetType(config.Type).
		SetConfig(encryptedConfig).
		Save(ctx)

	if err != nil {
		return fmt.Errorf("error updating storage config: %w", err)
	}

	if updatedRows == 0 {
		return fmt.Errorf("storage config with key %s not found", key)
	}

	s, err := sm.createStorageFromConfig(&ent.Storage{
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
	_, err := sm.db.Storage.Delete().Where(storage.Key(key)).Exec(ctx)
	if err != nil {
		return fmt.Errorf("error deleting storage config: %w", err)
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.storages, key)
	return nil
}

func (sm *storageManager) GetDefaultStorage() (storagestore.Storage, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	if len(sm.storages) == 1 {
		for _, s := range sm.storages {
			return s, nil
		}
	}
	return nil, fmt.Errorf("no default storage available: multiple storages are configured")
}

func (sm *storageManager) GetStorage(key string) (storagestore.Storage, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	s, ok := sm.storages[key]
	if !ok {
		return nil, fmt.Errorf("invalid storage key: %s", key)
	}
	return s, nil
}
