package storageprovider

import (
	"testing"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestNew(t *testing.T) {
	logger := zap.NewNop()

	provider := New(logger)

	assert.NotNil(t, provider)
	assert.Equal(t, logger, provider.logger)
}

func TestProvider_NewFileStorage(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger)

	cfg := &config.Config{
		FileBaseDir:          "./test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
	}

	storage, err := provider.NewFileStorage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewS3Storage(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger)

	cfg := &config.Config{
		S3Bucket:          "test-bucket",
		S3Region:          "us-east-1",
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
	}

	storage, err := provider.NewS3Storage(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewS3Storage_MissingBucket(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger)

	cfg := &config.Config{
		S3Bucket: "", // Missing bucket
	}

	storage, err := provider.NewS3Storage(cfg)

	assert.Error(t, err)
	assert.Nil(t, storage)
	assert.Contains(t, err.Error(), "s3-bucket is required")
}

func TestProvider_NewStorageFromConfig_File(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger)

	cfg := &config.Config{
		StorageType:          "file",
		FileBaseDir:          "./test-storage",
		FileMkdirPermissions: 0755,
		FileWritePermissions: 0644,
	}

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewStorageFromConfig_S3(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger)

	cfg := &config.Config{
		StorageType:       "s3",
		S3Bucket:          "test-bucket",
		S3Region:          "us-east-1",
		S3AccessKeyID:     "test-key",
		S3SecretAccessKey: "test-secret",
	}

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.NoError(t, err)
	assert.NotNil(t, storage)
}

func TestProvider_NewStorageFromConfig_UnsupportedType(t *testing.T) {
	logger := zap.NewNop()
	provider := New(logger)

	cfg := &config.Config{
		StorageType: "unsupported",
	}

	storage, err := provider.NewStorageFromConfig(cfg)

	assert.Error(t, err)
	assert.Nil(t, storage)
	assert.Contains(t, err.Error(), "unsupported storage type")
}
