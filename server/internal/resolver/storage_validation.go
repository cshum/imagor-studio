package resolver

import (
	"bytes"
	"context"
	"io"
	"path"
	"strings"
	"time"

	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor-studio/server/pkg/space"
	storagepkg "github.com/cshum/imagor-studio/server/pkg/storage"
	studiouuid "github.com/cshum/imagor-studio/server/pkg/uuid"
	"go.uber.org/zap"
)

func (r *Resolver) validateStorageConfigInput(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
	if r.storageConfigValidator != nil {
		return r.storageConfigValidator(ctx, input)
	}

	return validateStorageConfigInput(ctx, input, r.logger, r.registryStore)
}

func validateStorageConfigInput(ctx context.Context, input gql.StorageConfigInput, logger *zap.Logger, registryStore registrystore.Store) *gql.StorageTestResult {
	cfg := &config.Config{}

	switch input.Type {
	case gql.StorageTypeFile:
		if input.FileConfig == nil {
			return &gql.StorageTestResult{
				Success: false,
				Message: "File configuration is required for file storage type",
			}
		}
		cfg.StorageType = "file"
		cfg.FileStorageBaseDir = input.FileConfig.BaseDir
		cfg.FileStorageMkdirPermissions = 0755
		cfg.FileStorageWritePermissions = 0644

	case gql.StorageTypeS3:
		if input.S3Config == nil {
			return &gql.StorageTestResult{
				Success: false,
				Message: "S3 configuration is required for S3 storage type",
			}
		}
		cfg.StorageType = "s3"
		cfg.S3StorageBucket = input.S3Config.Bucket
		if input.S3Config.Region != nil {
			cfg.AWSRegion = *input.S3Config.Region
		}
		if input.S3Config.Endpoint != nil {
			cfg.S3Endpoint = *input.S3Config.Endpoint
		}
		if input.S3Config.AccessKeyID != nil {
			cfg.AWSAccessKeyID = *input.S3Config.AccessKeyID
		}
		if input.S3Config.SecretAccessKey != nil {
			cfg.AWSSecretAccessKey = *input.S3Config.SecretAccessKey
		}
		if input.S3Config.SessionToken != nil {
			cfg.AWSSessionToken = *input.S3Config.SessionToken
		}
		if input.S3Config.ForcePathStyle != nil {
			cfg.S3ForcePathStyle = *input.S3Config.ForcePathStyle
		}
		if input.S3Config.BaseDir != nil {
			cfg.S3StorageBaseDir = *input.S3Config.BaseDir
		}
	}

	testProvider := storageprovider.New(logger, registryStore, nil)
	testStorage, err := testProvider.NewStorageFromConfig(cfg)
	if err != nil {
		return storageTestFailure("Failed to create storage instance", err)
	}

	_, err = testStorage.List(ctx, "", storagepkg.ListOptions{Limit: 1})
	if err != nil {
		return storageTestFailure("Failed to access storage directory", err)
	}

	if input.Type == gql.StorageTypeS3 {
		return validateS3StorageCapabilities(ctx, testStorage)
	}

	return &gql.StorageTestResult{
		Success: true,
		Message: "Storage configuration test successful",
	}
}

func validateS3StorageCapabilities(ctx context.Context, stor storagepkg.Storage) *gql.StorageTestResult {
	const probeContentType = "text/plain"

	probeContent := []byte("ok")
	probeKey := path.Join("__imagor_probe__", studiouuid.GenerateUUID()+".txt")
	cleanupProbe := true
	defer func() {
		if cleanupProbe {
			_ = stor.Delete(ctx, probeKey)
		}
	}()

	if err := stor.Put(ctx, probeKey, bytes.NewReader(probeContent)); err != nil {
		return storageTestFailure("Failed to write probe object", err)
	}

	info, err := stor.Stat(ctx, probeKey)
	if err != nil {
		return storageTestFailure("Failed to stat probe object", err)
	}
	if info.Size != int64(len(probeContent)) {
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to verify probe object",
			Details: optionalDetails("unexpected probe object size"),
		}
	}

	reader, err := stor.Get(ctx, probeKey)
	if err != nil {
		return storageTestFailure("Failed to read probe object", err)
	}
	body, readErr := io.ReadAll(reader)
	closeErr := reader.Close()
	if readErr != nil {
		return storageTestFailure("Failed to read probe object", readErr)
	}
	if closeErr != nil {
		return storageTestFailure("Failed to close probe object reader", closeErr)
	}
	if !bytes.Equal(body, probeContent) {
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to verify probe object",
			Details: optionalDetails("probe object content mismatch"),
		}
	}

	presignable, ok := stor.(storagepkg.PresignableStorage)
	if !ok {
		return &gql.StorageTestResult{
			Success: false,
			Message: "Storage backend does not support presigned uploads",
		}
	}
	if _, err := presignable.PresignedPutURL(ctx, path.Join("__imagor_probe__", studiouuid.GenerateUUID()+".txt"), probeContentType, int64(len(probeContent)), time.Minute); err != nil {
		return storageTestFailure("Failed to generate presigned upload URL", err)
	}

	if err := stor.Delete(ctx, probeKey); err != nil {
		return storageTestFailure("Failed to delete probe object", err)
	}
	cleanupProbe = false

	return &gql.StorageTestResult{
		Success: true,
		Message: "Storage configuration test successful",
	}
}

func storageConfigInputFromSpace(sp *space.Space) gql.StorageConfigInput {
	forcePathStyle := sp.UsePathStyle

	return gql.StorageConfigInput{
		Type: gql.StorageTypeS3,
		S3Config: &gql.S3StorageInput{
			Bucket:          sp.Bucket,
			Region:          optionalStringPtr(sp.Region),
			Endpoint:        optionalStringPtr(sp.Endpoint),
			AccessKeyID:     optionalStringPtr(sp.AccessKeyID),
			SecretAccessKey: optionalStringPtr(sp.SecretKey),
			ForcePathStyle:  &forcePathStyle,
			BaseDir:         optionalStringPtr(sp.Prefix),
		},
	}
}

func storageTestFailure(message string, err error) *gql.StorageTestResult {
	details := optionalDetails(err.Error())
	return &gql.StorageTestResult{
		Success: false,
		Message: message,
		Details: details,
	}
}

func optionalDetails(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func optionalStringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
