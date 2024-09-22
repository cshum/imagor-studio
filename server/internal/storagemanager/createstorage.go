package storagemanager

import (
	"encoding/json"
	"fmt"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
	"github.com/cshum/imagor-studio/server/models"
)

type FileStorageConfig struct {
	BaseDir string `json:"baseDir"`
}

type S3StorageConfig struct {
	Bucket          string `json:"bucket"`
	Region          string `json:"region"`
	Endpoint        string `json:"endpoint"`
	AccessKeyID     string `json:"accessKeyId"`
	SecretAccessKey string `json:"secretAccessKey"`
	SessionToken    string `json:"sessionToken"`
	BaseDir         string `json:"baseDir"`
}

func (sm *storageManager) createStorageFromConfig(config *models.Storage) (storage.Storage, error) {
	decryptedConfig, err := sm.decryptConfig(config.Config)
	if err != nil {
		return nil, fmt.Errorf("error decrypting config: %w", err)
	}

	switch config.Type {
	case "file":
		return sm.createFileStorage(decryptedConfig)
	case "s3":
		return sm.createS3Storage(decryptedConfig)
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", config.Type)
	}
}

func (sm *storageManager) createFileStorage(decryptedConfig []byte) (storage.Storage, error) {
	var cfg FileStorageConfig
	if err := json.Unmarshal(decryptedConfig, &cfg); err != nil {
		return nil, fmt.Errorf("error unmarshaling file storage config: %w", err)
	}
	return filestorage.New(cfg.BaseDir)
}

func (sm *storageManager) createS3Storage(decryptedConfig []byte) (storage.Storage, error) {
	var cfg S3StorageConfig
	if err := json.Unmarshal(decryptedConfig, &cfg); err != nil {
		return nil, fmt.Errorf("error unmarshaling S3 storage config: %w", err)
	}
	return s3storage.New(cfg.Bucket,
		s3storage.WithRegion(cfg.Region),
		s3storage.WithEndpoint(cfg.Endpoint),
		s3storage.WithCredentials(cfg.AccessKeyID, cfg.SecretAccessKey, cfg.SessionToken),
		s3storage.WithBaseDir(cfg.BaseDir),
	)
}
