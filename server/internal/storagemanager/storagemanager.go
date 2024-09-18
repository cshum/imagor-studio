package storagemanager

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/cshum/imagor-studio/server/models"
	"sync"

	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"github.com/volatiletech/sqlboiler/v4/boil"
	"github.com/volatiletech/sqlboiler/v4/queries/qm"
	"go.uber.org/zap"
)

type StorageManager struct {
	db       *sql.DB
	storages map[string]storage.Storage
	mu       sync.RWMutex
	logger   *zap.Logger
}

func New(db *sql.DB, logger *zap.Logger) (*StorageManager, error) {
	sm := &StorageManager{
		db:       db,
		storages: make(map[string]storage.Storage),
		logger:   logger,
	}
	if err := sm.initializeStorages(); err != nil {
		return nil, err
	}
	return sm, nil
}

func (sm *StorageManager) initializeStorages() error {
	ctx := context.Background()
	configs, err := models.StorageConfigs().All(ctx, sm.db)
	if err != nil {
		return fmt.Errorf("error fetching storage configs: %w", err)
	}

	sm.mu.RLock()
	defer sm.mu.RUnlock()
	for _, cfg := range configs {
		s, err := sm.createStorageFromConfig(cfg)
		if err != nil {
			return fmt.Errorf("error creating storage from config: %w", err)
		}
		sm.storages[cfg.Key] = s
	}
	return nil
}

func (sm *StorageManager) createStorageFromConfig(config *models.StorageConfig) (storage.Storage, error) {
	decryptedConfig, err := sm.decryptConfig(config.Config)
	if err != nil {
		return nil, fmt.Errorf("error decrypting config: %w", err)
	}

	switch config.Type {
	case "file":
		var fileConfig struct {
			BaseDir string `json:"baseDir"`
		}
		err := json.Unmarshal([]byte(decryptedConfig), &fileConfig)
		if err != nil {
			return nil, fmt.Errorf("error unmarshaling file storage config: %w", err)
		}
		return filestorage.New(fileConfig.BaseDir)
	case "s3":
		var s3Config struct {
			Bucket          string `json:"bucket"`
			Region          string `json:"region"`
			Endpoint        string `json:"endpoint"`
			AccessKeyID     string `json:"accessKeyId"`
			SecretAccessKey string `json:"secretAccessKey"`
			SessionToken    string `json:"sessionToken"`
			BaseDir         string `json:"baseDir"`
		}
		err := json.Unmarshal([]byte(decryptedConfig), &s3Config)
		if err != nil {
			return nil, fmt.Errorf("error unmarshaling S3 storage config: %w", err)
		}
		return s3storage.New(s3Config.Bucket,
			s3storage.WithRegion(s3Config.Region),
			s3storage.WithEndpoint(s3Config.Endpoint),
			s3storage.WithCredentials(s3Config.AccessKeyID, s3Config.SecretAccessKey, s3Config.SessionToken),
			s3storage.WithBaseDir(s3Config.BaseDir),
		)
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", config.Type)
	}
}

func (sm *StorageManager) encryptConfig(config string) (string, error) {
	// In a real-world scenario, you would use a proper encryption/decryption method here.
	// You should replace this with a proper encryption method (e.g., AES) in production.
	return config, nil
}

func (sm *StorageManager) decryptConfig(encryptedConfig string) (string, error) {
	// In a real-world scenario, you would use a proper encryption/decryption method here.
	// You should replace this with a proper encryption method (e.g., AES) in production.
	return encryptedConfig, nil
}

func (sm *StorageManager) GetConfigs(ctx context.Context) ([]*models.StorageConfig, error) {
	return models.StorageConfigs().All(ctx, sm.db)
}

func (sm *StorageManager) GetConfig(ctx context.Context, key string) (*models.StorageConfig, error) {
	return models.StorageConfigs(qm.Where("key=?", key)).One(ctx, sm.db)
}

func (sm *StorageManager) AddConfig(ctx context.Context, config *models.StorageConfig) error {
	encryptedConfig, err := sm.encryptConfig(config.Config)
	if err != nil {
		return fmt.Errorf("error encrypting config: %w", err)
	}
	config.Config = encryptedConfig

	err = config.Insert(ctx, sm.db, boil.Infer())
	if err != nil {
		return fmt.Errorf("error inserting storage config: %w", err)
	}

	s, err := sm.createStorageFromConfig(config)
	if err != nil {
		return err
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.storages[config.Key] = s

	return nil
}

func (sm *StorageManager) UpdateConfig(ctx context.Context, key string, config *models.StorageConfig) error {
	// Encrypt the new config
	encryptedConfig, err := sm.encryptConfig(config.Config)
	if err != nil {
		return fmt.Errorf("error encrypting config: %w", err)
	}

	// Prepare the update data
	updateColumns := models.M{
		models.StorageConfigColumns.Name:   config.Name,
		models.StorageConfigColumns.Type:   config.Type,
		models.StorageConfigColumns.Config: encryptedConfig,
	}

	// Perform the update
	rowsAff, err := models.StorageConfigs(
		qm.Where("key=?", key),
	).UpdateAll(ctx, sm.db, updateColumns)
	if err != nil {
		return fmt.Errorf("error updating storage config: %w", err)
	}

	if rowsAff == 0 {
		return fmt.Errorf("storage config with key %s not found", key)
	}

	// Create and store the new storage instance
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

func (sm *StorageManager) DeleteConfig(ctx context.Context, key string) error {
	_, err := models.StorageConfigs(qm.Where("key=?", key)).DeleteAll(ctx, sm.db)
	if err != nil {
		return fmt.Errorf("error deleting storage config: %w", err)
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.storages, key)
	return nil
}

func (sm *StorageManager) GetDefaultStorage() (storage.Storage, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	if len(sm.storages) == 1 {
		for _, s := range sm.storages {
			return s, nil
		}
	}
	return nil, fmt.Errorf("no default storage available: multiple storages are configured")
}

func (sm *StorageManager) GetStorage(key string) (storage.Storage, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	s, ok := sm.storages[key]
	if !ok {
		return nil, fmt.Errorf("invalid storage key: %s", key)
	}
	return s, nil
}

func (sm *StorageManager) GetStorages() (storages []storage.Storage, _ error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	for _, s := range sm.storages {
		storages = append(storages, s)
	}
	return
}
