package storagemanager

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
)

type StorageConfig struct {
	Name   string          `json:"name"`
	Key    string          `json:"key"`
	Type   string          `json:"type"`
	Config json.RawMessage `json:"config"`
}

type StorageManager struct {
	configs    []StorageConfig
	storages   map[string]storage.Storage
	configFile string
	mu         sync.RWMutex
}

func New(configFile string) (*StorageManager, error) {
	sm := &StorageManager{
		configFile: configFile,
		storages:   make(map[string]storage.Storage),
	}

	err := sm.loadConfigs()
	if err != nil {
		return nil, err
	}

	err = sm.initializeStorages()
	if err != nil {
		return nil, err
	}

	return sm, nil
}

func (sm *StorageManager) loadConfigs() error {
	data, err := os.ReadFile(sm.configFile)
	if err != nil {
		if os.IsNotExist(err) {
			sm.configs = []StorageConfig{}
			return nil
		}
		return fmt.Errorf("error reading storage config file: %w", err)
	}

	err = json.Unmarshal(data, &sm.configs)
	if err != nil {
		return fmt.Errorf("error unmarshaling storage configs: %w", err)
	}

	return nil
}

func (sm *StorageManager) saveConfigs() error {
	data, err := json.MarshalIndent(sm.configs, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshaling storage configs: %w", err)
	}

	err = os.WriteFile(sm.configFile, data, 0644)
	if err != nil {
		return fmt.Errorf("error writing storage config file: %w", err)
	}

	return nil
}

func (sm *StorageManager) initializeStorages() error {
	for _, cfg := range sm.configs {
		s, err := sm.createStorageFromConfig(cfg)
		if err != nil {
			return fmt.Errorf("error creating s from config: %w", err)
		}
		sm.storages[cfg.Key] = s
	}
	return nil
}

func (sm *StorageManager) createStorageFromConfig(config StorageConfig) (storage.Storage, error) {
	switch config.Type {
	case "file":
		var fileConfig struct {
			BaseDir string `json:"baseDir"`
		}
		err := json.Unmarshal(config.Config, &fileConfig)
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
		err := json.Unmarshal(config.Config, &s3Config)
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

func (sm *StorageManager) GetConfigs() []StorageConfig {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.configs
}

func (sm *StorageManager) GetConfig(key string) (StorageConfig, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	for _, cfg := range sm.configs {
		if cfg.Key == key {
			return cfg, true
		}
	}
	return StorageConfig{}, false
}

func (sm *StorageManager) AddConfig(config StorageConfig) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sm.configs = append(sm.configs, config)
	err := sm.saveConfigs()
	if err != nil {
		return err
	}

	s, err := sm.createStorageFromConfig(config)
	if err != nil {
		return err
	}
	sm.storages[config.Key] = s

	return nil
}

func (sm *StorageManager) UpdateConfig(key string, config StorageConfig) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	for i, cfg := range sm.configs {
		if cfg.Key == key {
			sm.configs[i] = config
			err := sm.saveConfigs()
			if err != nil {
				return err
			}

			s, err := sm.createStorageFromConfig(config)
			if err != nil {
				return err
			}
			sm.storages[config.Key] = s

			return nil
		}
	}

	return fmt.Errorf("storage config with key %s not found", key)
}

func (sm *StorageManager) DeleteConfig(key string) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	for i, cfg := range sm.configs {
		if cfg.Key == key {
			sm.configs = append(sm.configs[:i], sm.configs[i+1:]...)
			err := sm.saveConfigs()
			if err != nil {
				return err
			}

			delete(sm.storages, key)
			return nil
		}
	}

	return fmt.Errorf("storage config with key %s not found", key)
}

// GetDefaultStorage returns the default storage if only one storage is configured.
// If multiple storages are configured, it returns an error.
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

// GetStorage returns a storage instance for the given key.
// If the key doesn't exist, it returns an error.
func (sm *StorageManager) GetStorage(key string) (storage.Storage, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	s, ok := sm.storages[key]
	if !ok {
		return nil, fmt.Errorf("invalid storage key: %s", key)
	}
	return s, nil
}

// ListStorages returns a slice of all storage storages
func (sm *StorageManager) ListStorages() (storages []storage.Storage) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	for _, s := range sm.storages {
		storages = append(storages, s)
	}
	return
}
