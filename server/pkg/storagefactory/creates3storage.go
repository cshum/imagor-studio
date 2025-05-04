package storagefactory

import (
	"encoding/json"
	"fmt"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/storage/s3storage"
)

// S3StorageConfig defines configuration for S3 storage
type S3StorageConfig struct {
	Bucket          string `json:"bucket"`
	Region          string `json:"region"`
	Endpoint        string `json:"endpoint"`
	AccessKeyID     string `json:"accessKeyId"`
	SecretAccessKey string `json:"secretAccessKey"`
	SessionToken    string `json:"sessionToken"`
	BaseDir         string `json:"baseDir"`
}

func createS3Storage(config json.RawMessage) (storage.Storage, error) {
	var cfg S3StorageConfig
	if err := json.Unmarshal(config, &cfg); err != nil {
		return nil, fmt.Errorf("error unmarshaling S3 storage config: %w", err)
	}

	return s3storage.New(cfg.Bucket,
		s3storage.WithRegion(cfg.Region),
		s3storage.WithEndpoint(cfg.Endpoint),
		s3storage.WithCredentials(cfg.AccessKeyID, cfg.SecretAccessKey, cfg.SessionToken),
		s3storage.WithBaseDir(cfg.BaseDir),
	)
}
