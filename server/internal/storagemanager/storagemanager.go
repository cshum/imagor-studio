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
	"fmt"
	"golang.org/x/crypto/hkdf"
	"io"
	"sync"

	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"github.com/cshum/imagor-studio/server/models"
	"github.com/volatiletech/sqlboiler/v4/boil"
	"github.com/volatiletech/sqlboiler/v4/queries/qm"
	"go.uber.org/zap"
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
	db       *sql.DB
	storages map[string]storage.Storage
	mu       sync.RWMutex
	logger   *zap.Logger
	gcm      cipher.AEAD
}

func New(db *sql.DB, logger *zap.Logger, secretKey string) (StorageManager, error) {
	// Derive a 32-byte key using HKDF
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
	configs, err := models.StorageConfigs().All(ctx, sm.db)
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

func (sm *storageManager) createStorageFromConfig(config *models.StorageConfig) (storage.Storage, error) {
	decryptedConfig, err := sm.decryptConfig(config.Config)
	if err != nil {
		return nil, fmt.Errorf("error decrypting config: %w", err)
	}

	var configMap map[string]interface{}
	if err := json.Unmarshal(decryptedConfig, &configMap); err != nil {
		return nil, fmt.Errorf("error unmarshaling config: %w", err)
	}

	switch config.Type {
	case "file":
		baseDir, ok := configMap["baseDir"].(string)
		if !ok {
			return nil, fmt.Errorf("invalid baseDir in file storage config")
		}
		return filestorage.New(baseDir)
	case "s3":
		bucket, _ := configMap["bucket"].(string)
		region, _ := configMap["region"].(string)
		endpoint, _ := configMap["endpoint"].(string)
		accessKeyID, _ := configMap["accessKeyId"].(string)
		secretAccessKey, _ := configMap["secretAccessKey"].(string)
		sessionToken, _ := configMap["sessionToken"].(string)
		baseDir, _ := configMap["baseDir"].(string)

		return s3storage.New(bucket,
			s3storage.WithRegion(region),
			s3storage.WithEndpoint(endpoint),
			s3storage.WithCredentials(accessKeyID, secretAccessKey, sessionToken),
			s3storage.WithBaseDir(baseDir),
		)
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", config.Type)
	}
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
	configs, err := models.StorageConfigs().All(ctx, sm.db)
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
	config, err := models.StorageConfigs(qm.Where("key=?", key)).One(ctx, sm.db)
	if err != nil {
		if err == sql.ErrNoRows {
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

	dbConfig := &models.StorageConfig{
		Name:   config.Name,
		Key:    config.Key,
		Type:   config.Type,
		Config: encryptedConfig,
	}

	err = dbConfig.Insert(ctx, sm.db, boil.Infer())
	if err != nil {
		return fmt.Errorf("error inserting storage config: %w", err)
	}

	s, err := sm.createStorageFromConfig(dbConfig)
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

	updateColumns := models.M{
		models.StorageConfigColumns.Name:   config.Name,
		models.StorageConfigColumns.Type:   config.Type,
		models.StorageConfigColumns.Config: encryptedConfig,
	}

	rowsAff, err := models.StorageConfigs(
		qm.Where("key=?", key),
	).UpdateAll(ctx, sm.db, updateColumns)
	if err != nil {
		return fmt.Errorf("error updating storage config: %w", err)
	}

	if rowsAff == 0 {
		return fmt.Errorf("storage config with key %s not found", key)
	}

	updatedConfig := &models.StorageConfig{
		Key:    key,
		Name:   config.Name,
		Type:   config.Type,
		Config: encryptedConfig,
	}
	s, err := sm.createStorageFromConfig(updatedConfig)
	if err != nil {
		return fmt.Errorf("error creating storage from updated config: %w", err)
	}
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.storages[key] = s

	return nil
}

func (sm *storageManager) DeleteConfig(ctx context.Context, key string) error {
	_, err := models.StorageConfigs(qm.Where("key=?", key)).DeleteAll(ctx, sm.db)
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

func (sm *storageManager) GetStorages() (storages []storage.Storage, _ error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	for _, s := range sm.storages {
		storages = append(storages, s)
	}
	return
}
