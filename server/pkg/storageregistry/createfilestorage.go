package storageregistry

import (
	"encoding/json"
	"fmt"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/storage/filestorage"
	"os"
)

// FileStorageConfig defines configuration for file storage
type FileStorageConfig struct {
	BaseDir          string      `json:"baseDir"`
	MkdirPermissions os.FileMode `json:"mkdirPermissions"`
	WritePermissions os.FileMode `json:"writePermissions"`
}

func createFileStorage(config json.RawMessage) (storage.Storage, error) {
	var cfg FileStorageConfig
	if err := json.Unmarshal(config, &cfg); err != nil {
		return nil, fmt.Errorf("error unmarshaling file storage config: %w", err)
	}

	return filestorage.New(cfg.BaseDir,
		filestorage.WithMkdirPermission(cfg.MkdirPermissions),
		filestorage.WithWritePermission(cfg.WritePermissions),
	)
}
