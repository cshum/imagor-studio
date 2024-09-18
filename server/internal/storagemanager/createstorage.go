package storagemanager

import (
	"encoding/json"
	"fmt"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storage/filestorage"
	"github.com/cshum/imagor-studio/server/internal/storage/s3storage"
)

func CreateStorageFromConfig(config StorageConfig) (storage.Storage, error) {
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
