package resolver

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"go.uber.org/zap"
)

const maxSinglePutUploadBytes int64 = 5 * 1024 * 1024 * 1024

func supportsPresignedUpload(stor storage.Storage) bool {
	_, ok := stor.(storage.PresignableStorage)
	return ok
}

func (r *Resolver) effectiveSpaceStorageConfig(sp *space.Space) *space.Space {
	effective := *sp
	effective.StorageMode = space.NormalizeStorageMode(sp.StorageMode)
	if effective.StorageMode != space.StorageModePlatform || strings.TrimSpace(r.cloudConfig.PlatformS3Bucket) == "" {
		return &effective
	}
	effective.StorageType = "s3"
	effective.Bucket = strings.TrimSpace(r.cloudConfig.PlatformS3Bucket)
	effective.Region = strings.TrimSpace(r.cloudConfig.PlatformS3Region)
	effective.Endpoint = strings.TrimSpace(r.cloudConfig.PlatformS3Endpoint)
	effective.AccessKeyID = strings.TrimSpace(r.cloudConfig.PlatformS3AccessKeyID)
	effective.SecretKey = strings.TrimSpace(r.cloudConfig.PlatformS3SecretKey)
	effective.UsePathStyle = r.cloudConfig.PlatformS3UsePathStyle

	prefix := strings.TrimSpace(r.cloudConfig.PlatformS3Prefix)
	if prefix == "" {
		prefix = "spaces/{spaceID}"
	}
	prefix = strings.ReplaceAll(prefix, "{spaceID}", sp.ID)
	prefix = strings.Trim(prefix, "/")
	if prefix == "" {
		effective.Prefix = ""
	} else {
		effective.Prefix = prefix + "/"
	}

	return &effective
}

func (r *Resolver) getAccessibleSpace(ctx context.Context, spaceKey *string) (*space.Space, error) {
	if spaceKey == nil || *spaceKey == "" || !r.cloudEnabled() {
		return nil, nil
	}

	sp, err := r.spaceStore.Get(ctx, *spaceKey)
	if err != nil {
		return nil, fmt.Errorf("failed to look up space %q: %w", *spaceKey, err)
	}
	if sp == nil {
		return nil, &gqlerror.Error{
			Message:    fmt.Sprintf("space %q not found", *spaceKey),
			Extensions: map[string]interface{}{"code": "NOT_FOUND"},
		}
	}

	allowed, err := r.canReadSpace(ctx, sp)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, &gqlerror.Error{
			Message:    "forbidden: you do not have access to this space",
			Extensions: map[string]interface{}{"code": "FORBIDDEN"},
		}
	}

	return sp, nil
}

func (r *Resolver) storageFromSpaceConfig(sp *space.Space) (storage.Storage, error) {
	effective := r.effectiveSpaceStorageConfig(sp)
	p := storageprovider.New(r.logger, nil, nil)
	return p.NewStorageFromSpaceConfig(
		effective.StorageType,
		effective.Bucket, effective.Prefix,
		effective.Region, effective.Endpoint,
		effective.AccessKeyID, effective.SecretKey,
		effective.UsePathStyle,
	)
}

func (r *queryResolver) getEffectiveVideoThumbnailPosition(ctx context.Context, spaceConfig *space.Space) string {
	defaultValue := "first_frame"
	if r.config != nil {
		configValue, isOverridden := r.config.GetByRegistryKey("config.app_video_thumbnail_position")
		if isOverridden {
			return configValue
		}
		if configValue != "" {
			defaultValue = configValue
		}
	}

	if spaceConfig != nil && r.registryStore != nil {
		entries, err := r.registryStore.GetMulti(
			ctx,
			registrystore.SpaceOwnerID(spaceConfig.ID),
			[]string{"config.app_video_thumbnail_position"},
		)
		if err == nil && len(entries) > 0 && entries[0] != nil {
			return entries[0].Value
		}
	}

	result := registryutil.GetEffectiveValue(ctx, r.registryStore, r.config, "config.app_video_thumbnail_position")
	if result.Exists && result.Value != "" {
		return result.Value
	}

	return defaultValue
}

// getSpaceStorage returns the storage instance for the given optional spaceKey.
//
// When spaceKey is nil/empty or cloud space mode is disabled,
// the call falls back transparently to the system storage so all existing
// single-tenant code paths continue to work unchanged.
//
// When spaceKey is set the caller's org membership is verified (JWT claim or
// DB fallback) and an ephemeral S3 storage instance is built from the space's
// credentials (no registry round-trip).
func (r *Resolver) getSpaceStorage(ctx context.Context, spaceKey *string) (storage.Storage, error) {
	// In multi-tenant mode (spaceStore active) the root gallery has no system-level
	// storage — all file operations must target a named space via spaceKey.
	if r.cloudEnabled() && (spaceKey == nil || *spaceKey == "") {
		return nil, &gqlerror.Error{
			Message:    "a spaceKey is required in multi-tenant mode",
			Extensions: map[string]interface{}{"code": "NOT_AVAILABLE"},
		}
	}
	if spaceKey == nil || *spaceKey == "" || !r.cloudEnabled() {
		return r.getStorage(), nil
	}

	sp, err := r.getAccessibleSpace(ctx, spaceKey)
	if err != nil {
		return nil, err
	}
	return r.storageFromSpaceConfig(sp)
}

// getPreviewPath returns the preview image path for a template file.
// Returns empty string if the path is not a template file.
func getPreviewPath(templatePath string) string {
	if !strings.HasSuffix(templatePath, ".imagor.json") {
		return ""
	}
	return strings.TrimSuffix(templatePath, ".imagor.json") + ".imagor.preview"
}

// UploadFile is the resolver for the uploadFile field.
func (r *mutationResolver) UploadFile(ctx context.Context, path string, spaceKey *string, content graphql.Upload) (bool, error) {
	// Check write permissions and path access
	if err := RequireWritePermission(ctx, path); err != nil {
		return false, err
	}
	stor, err := r.getSpaceStorage(ctx, spaceKey)
	if err != nil {
		return false, err
	}
	r.logger.Debug("Uploading file", zap.String("path", path), zap.String("filename", content.Filename))

	if err := stor.Put(ctx, path, content.File); err != nil {
		r.logger.Error("Failed to upload file", zap.Error(err))
		return false, fmt.Errorf("failed to upload file: %w", err)
	}

	return true, nil
}

// RequestUpload is the resolver for the requestUpload field.
func (r *mutationResolver) RequestUpload(ctx context.Context, path string, spaceKey *string, contentType string, sizeBytes int) (*gql.PresignedUpload, error) {
	if err := RequireWritePermission(ctx, path); err != nil {
		return nil, err
	}

	if sizeBytes <= 0 {
		return nil, &gqlerror.Error{
			Message:    "invalid sizeBytes: must be greater than 0",
			Extensions: map[string]interface{}{"code": "BAD_USER_INPUT"},
		}
	}

	if int64(sizeBytes) > maxSinglePutUploadBytes {
		return nil, &gqlerror.Error{
			Message:    fmt.Sprintf("file too large for single upload: max %d bytes", maxSinglePutUploadBytes),
			Extensions: map[string]interface{}{"code": "BAD_USER_INPUT"},
		}
	}

	stor, err := r.getSpaceStorage(ctx, spaceKey)
	if err != nil {
		return nil, err
	}

	presignable, ok := stor.(storage.PresignableStorage)
	if !ok {
		return nil, &gqlerror.Error{
			Message:    "current storage backend does not support presigned uploads",
			Extensions: map[string]interface{}{"code": "NOT_AVAILABLE"},
		}
	}

	trimmedContentType := strings.TrimSpace(contentType)
	if trimmedContentType == "" {
		trimmedContentType = "application/octet-stream"
	}

	ttl := 5 * time.Minute
	uploadURL, err := presignable.PresignedPutURL(ctx, path, trimmedContentType, int64(sizeBytes), ttl)
	if err != nil {
		r.logger.Error("Failed to generate presigned upload URL", zap.Error(err), zap.String("path", path))
		return nil, fmt.Errorf("failed to generate upload URL: %w", err)
	}

	return &gql.PresignedUpload{
		UploadURL: uploadURL,
		ExpiresAt: time.Now().UTC().Add(ttl).Format(time.RFC3339),
	}, nil
}

// DeleteFile is the resolver for the deleteFile field.
func (r *mutationResolver) DeleteFile(ctx context.Context, path string, spaceKey *string) (bool, error) {
	// Check write permissions and path access
	if err := RequireWritePermission(ctx, path); err != nil {
		return false, err
	}
	stor, err := r.getSpaceStorage(ctx, spaceKey)
	if err != nil {
		return false, err
	}

	r.logger.Debug("Deleting file", zap.String("path", path))

	// Delete the main file
	if err := stor.Delete(ctx, path); err != nil {
		r.logger.Error("Failed to delete file", zap.Error(err))
		return false, fmt.Errorf("failed to delete file: %w", err)
	}

	// If it's a template file, also delete the preview image
	if previewPath := getPreviewPath(path); previewPath != "" {
		// Check if preview exists before attempting to delete
		if _, err := stor.Stat(ctx, previewPath); err == nil {
			r.logger.Debug("Deleting template preview", zap.String("path", previewPath))
			if err := stor.Delete(ctx, previewPath); err != nil {
				// Log warning but don't fail the operation
				r.logger.Warn("Failed to delete template preview", zap.String("path", previewPath), zap.Error(err))
			}
		}
	}

	return true, nil
}

// CreateFolder is the resolver for the createFolder field.
func (r *mutationResolver) CreateFolder(ctx context.Context, path string, spaceKey *string) (bool, error) {
	// Check write permissions and path access
	if err := RequireWritePermission(ctx, path); err != nil {
		return false, err
	}
	stor, err := r.getSpaceStorage(ctx, spaceKey)
	if err != nil {
		return false, err
	}

	r.logger.Debug("Creating folder", zap.String("path", path))

	if err := stor.CreateFolder(ctx, path); err != nil {
		r.logger.Error("Failed to create folder", zap.Error(err))
		return false, fmt.Errorf("failed to create folder: %w", err)
	}

	return true, nil
}

// CopyFile is the resolver for the copyFile field.
func (r *mutationResolver) CopyFile(ctx context.Context, sourcePath string, destPath string, spaceKey *string) (bool, error) {
	// Check write permissions for both source and destination paths
	if err := RequireWritePermission(ctx, sourcePath); err != nil {
		return false, err
	}
	if err := RequireWritePermission(ctx, destPath); err != nil {
		return false, err
	}
	stor, err := r.getSpaceStorage(ctx, spaceKey)
	if err != nil {
		return false, err
	}

	r.logger.Debug("Copying file", zap.String("sourcePath", sourcePath), zap.String("destPath", destPath))

	if err := stor.Copy(ctx, sourcePath, destPath); err != nil {
		r.logger.Error("Failed to copy file", zap.Error(err))

		// Check if error is due to file already existing
		if errors.Is(err, os.ErrExist) {
			return false, &gqlerror.Error{
				Message: "failed to copy file: file already exists",
				Extensions: map[string]interface{}{
					"code": apperror.ErrCodeFileAlreadyExists,
				},
			}
		}

		return false, fmt.Errorf("failed to copy file: %w", err)
	}

	return true, nil
}

// MoveFile is the resolver for the moveFile field.
func (r *mutationResolver) MoveFile(ctx context.Context, sourcePath string, destPath string, spaceKey *string) (bool, error) {
	// Check write permissions for both source and destination paths
	if err := RequireWritePermission(ctx, sourcePath); err != nil {
		return false, err
	}
	if err := RequireWritePermission(ctx, destPath); err != nil {
		return false, err
	}
	stor, err := r.getSpaceStorage(ctx, spaceKey)
	if err != nil {
		return false, err
	}

	r.logger.Debug("Moving file", zap.String("sourcePath", sourcePath), zap.String("destPath", destPath))

	// Move the main file
	if err := stor.Move(ctx, sourcePath, destPath); err != nil {
		r.logger.Error("Failed to move file", zap.Error(err))

		// Check if error is due to file already existing
		if errors.Is(err, os.ErrExist) {
			return false, &gqlerror.Error{
				Message: "failed to move file: file already exists",
				Extensions: map[string]interface{}{
					"code": apperror.ErrCodeFileAlreadyExists,
				},
			}
		}

		return false, fmt.Errorf("failed to move file: %w", err)
	}

	// If it's a template file, also move the preview image
	if sourcePreviewPath := getPreviewPath(sourcePath); sourcePreviewPath != "" {
		// Check if preview exists before attempting to move
		if _, err := stor.Stat(ctx, sourcePreviewPath); err == nil {
			destPreviewPath := getPreviewPath(destPath)
			r.logger.Debug("Moving template preview",
				zap.String("source", sourcePreviewPath),
				zap.String("dest", destPreviewPath))

			if err := stor.Move(ctx, sourcePreviewPath, destPreviewPath); err != nil {
				// Log warning but don't fail the operation
				r.logger.Warn("Failed to move template preview",
					zap.String("source", sourcePreviewPath),
					zap.String("dest", destPreviewPath),
					zap.Error(err))
			}
		}
	}

	return true, nil
}

// ListFiles is the resolver for the listFiles field.
func (r *queryResolver) ListFiles(ctx context.Context, path string, spaceKey *string, offset *int, limit *int, onlyFiles *bool, onlyFolders *bool, extensions *string, showHidden *bool, sortBy *gql.SortOption, sortOrder *gql.SortOrder) (*gql.FileList, error) {
	// Check read permissions and path access
	if err := RequireReadPermission(ctx, path); err != nil {
		return nil, err
	}
	spaceConfig, err := r.getAccessibleSpace(ctx, spaceKey)
	if err != nil {
		return nil, err
	}

	var stor storage.Storage
	if spaceConfig != nil {
		stor, err = r.storageFromSpaceConfig(spaceConfig)
	} else {
		stor, err = r.getSpaceStorage(ctx, spaceKey)
	}
	if err != nil {
		return nil, err
	}

	// Handle optional offset parameter - default to 0 if not provided
	offsetValue := 0
	if offset != nil {
		offsetValue = *offset
	}

	// Handle optional limit parameter - default to 0 (unlimited) if not provided
	limitValue := 0
	if limit != nil {
		limitValue = *limit
	}

	r.logger.Debug("Listing files",
		zap.String("path", path),
		zap.Int("offset", offsetValue),
		zap.Int("limit", limitValue),
		zap.Any("sortBy", sortBy),
		zap.Any("sortOrder", sortOrder),
	)

	options := storage.ListOptions{
		Offset:      offsetValue,
		Limit:       limitValue,
		OnlyFiles:   onlyFiles != nil && *onlyFiles,
		OnlyFolders: onlyFolders != nil && *onlyFolders,
		Extensions:  parseExtensions(extensions),
		ShowHidden:  showHidden != nil && *showHidden,
	}

	if sortBy != nil {
		switch *sortBy {
		case gql.SortOptionName:
			options.SortBy = storage.SortByName
		case gql.SortOptionSize:
			options.SortBy = storage.SortBySize
		case gql.SortOptionModifiedTime:
			options.SortBy = storage.SortByModifiedTime
		default:
			return nil, fmt.Errorf("invalid sortBy option: %s", *sortBy)
		}
	}

	if sortOrder != nil {
		switch *sortOrder {
		case gql.SortOrderAsc:
			options.SortOrder = storage.SortOrderAsc
		case gql.SortOrderDesc:
			options.SortOrder = storage.SortOrderDesc
		default:
			return nil, fmt.Errorf("invalid sortOrder option: %s", *sortOrder)
		}
	}

	result, err := stor.List(ctx, path, options)
	if err != nil {
		r.logger.Error("Failed to list files", zap.Error(err))
		return nil, fmt.Errorf("failed to list files: %w", err)
	}

	videoThumbnailPos := r.getEffectiveVideoThumbnailPosition(ctx, spaceConfig)

	files := make([]*gql.FileItem, len(result.Items))
	for i, item := range result.Items {
		fileItem := &gql.FileItem{
			Name:         item.Name,
			Path:         item.Path,
			Size:         int(item.Size),
			IsDirectory:  item.IsDir,
			ModifiedTime: item.ModifiedTime.Format(time.RFC3339),
		}

		// Generate thumbnail URLs for image files
		if !item.IsDir {
			thumbnailUrls := r.generateThumbnailUrlsForResolvedSpace(ctx, item.Path, videoThumbnailPos, spaceKey, spaceConfig)
			fileItem.ThumbnailUrls = thumbnailUrls
		}

		files[i] = fileItem
	}

	return &gql.FileList{
		Items:      files,
		TotalCount: result.TotalCount,
	}, nil
}

// StatFile is the resolver for the statFile field.
func (r *queryResolver) StatFile(ctx context.Context, path string, spaceKey *string) (*gql.FileStat, error) {
	// Check read permissions and path access
	if err := RequireReadPermission(ctx, path); err != nil {
		return nil, err
	}
	spaceConfig, err := r.getAccessibleSpace(ctx, spaceKey)
	if err != nil {
		return nil, err
	}

	var stor storage.Storage
	if spaceConfig != nil {
		stor, err = r.storageFromSpaceConfig(spaceConfig)
	} else {
		stor, err = r.getSpaceStorage(ctx, spaceKey)
	}
	if err != nil {
		return nil, err
	}

	r.logger.Debug("Getting file stats", zap.String("path", path))

	fileInfo, err := stor.Stat(ctx, path)
	if err != nil {
		r.logger.Error("Failed to get file stats", zap.Error(err))
		return nil, fmt.Errorf("failed to get file stats: %w", err)
	}

	videoThumbnailPos := r.getEffectiveVideoThumbnailPosition(ctx, spaceConfig)

	fileStat := &gql.FileStat{
		Name:         fileInfo.Name,
		Path:         fileInfo.Path,
		Size:         int(fileInfo.Size),
		IsDirectory:  fileInfo.IsDir,
		ModifiedTime: fileInfo.ModifiedTime.Format(time.RFC3339),
		Etag:         &fileInfo.ETag,
	}

	// Generate thumbnail URLs for image files
	if !fileInfo.IsDir {
		thumbnailUrls := r.generateThumbnailUrlsForResolvedSpace(ctx, fileInfo.Path, videoThumbnailPos, spaceKey, spaceConfig)
		fileStat.ThumbnailUrls = thumbnailUrls
	}

	return fileStat, nil
}

// StorageStatus is the resolver for the storageStatus field.
func (r *queryResolver) StorageStatus(ctx context.Context) (*gql.StorageStatus, error) {
	// Use batch operation for better performance - include all storage keys to detect overrides
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.storage_configured",
		"config.storage_type",
		"config.storage_config_updated_at",
		"config.file_storage_base_dir",
		"config.s3_storage_bucket",
	)

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Check if ANY storage config is overridden by external config
	isConfigOverridden := false
	for _, result := range results {
		if result.IsOverriddenByConfig {
			isConfigOverridden = true
			break
		}
	}

	// Check if storage is configured (either in registry or by external config)
	configuredResult := resultMap["config.storage_configured"]
	isConfigured := (configuredResult.Exists && configuredResult.Value == "true") || isConfigOverridden

	var storageType *string
	var fileConfig *gql.FileStorageConfig
	var s3Config *gql.S3StorageConfig
	var isFileOverridden, isS3Overridden bool

	// Determine storage type and load configuration
	if typeResult := resultMap["config.storage_type"]; typeResult.Exists {
		storageType = &typeResult.Value

		// Load type-specific configuration with override detection
		switch typeResult.Value {
		case "file", "filesystem":
			fileConfig, isFileOverridden = r.getFileStorageConfig(ctx)
		case "s3":
			s3Config, isS3Overridden = r.getS3StorageConfig(ctx)
		}
	} else if isConfigOverridden {
		// If no explicit type but config is overridden, try to detect from available config
		if resultMap["config.file_storage_base_dir"].Exists {
			fileType := "file"
			storageType = &fileType
			fileConfig, isFileOverridden = r.getFileStorageConfig(ctx)
		} else if resultMap["config.s3_storage_bucket"].Exists {
			s3Type := "s3"
			storageType = &s3Type
			s3Config, isS3Overridden = r.getS3StorageConfig(ctx)
		}
	}

	// Update override status based on type-specific checks
	isConfigOverridden = isFileOverridden || isS3Overridden

	var lastUpdated *string
	if timestampResult := resultMap["config.storage_config_updated_at"]; timestampResult.Exists {
		lastUpdated = &timestampResult.Value
	}

	return &gql.StorageStatus{
		Configured:              isConfigured,
		SupportsPresignedUpload: supportsPresignedUpload(r.getStorage()),
		Type:                    storageType,
		LastUpdated:             lastUpdated,
		IsOverriddenByConfig:    isConfigOverridden,
		FileConfig:              fileConfig,
		S3Config:                s3Config,
	}, nil
}

// Helper function to get file storage configuration
func (r *queryResolver) getFileStorageConfig(ctx context.Context) (*gql.FileStorageConfig, bool) {
	// Use batch operation for better performance
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.file_storage_base_dir",
		"config.file_storage_mkdir_permissions",
		"config.file_storage_write_permissions")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Check if any file storage config is overridden
	isOverridden := false
	for _, result := range results {
		if result.IsOverriddenByConfig {
			isOverridden = true
			break
		}
	}

	// Set defaults and override with registry values if they exist
	baseDir := "/app/gallery" // Default
	if result := resultMap["config.file_storage_base_dir"]; result.Exists {
		baseDir = result.Value
	}

	mkdirPermissions := "0755" // Default
	if result := resultMap["config.file_storage_mkdir_permissions"]; result.Exists {
		mkdirPermissions = result.Value
	}

	writePermissions := "0644" // Default
	if result := resultMap["config.file_storage_write_permissions"]; result.Exists {
		writePermissions = result.Value
	}

	return &gql.FileStorageConfig{
		BaseDir:          baseDir,
		MkdirPermissions: mkdirPermissions,
		WritePermissions: writePermissions,
	}, isOverridden
}

// Helper function to get S3 storage configuration
func (r *queryResolver) getS3StorageConfig(ctx context.Context) (*gql.S3StorageConfig, bool) {
	// Use batch operation for better performance
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.s3_storage_bucket",
		"config.s3_storage_region",
		"config.s3_storage_endpoint",
		"config.s3_storage_force_path_style",
		"config.s3_storage_base_dir")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Check if bucket exists (required)
	bucketResult := resultMap["config.s3_storage_bucket"]
	if !bucketResult.Exists {
		return nil, false
	}

	// Check if any S3 storage config is overridden
	isOverridden := false
	for _, result := range results {
		if result.IsOverriddenByConfig {
			isOverridden = true
			break
		}
	}

	c := &gql.S3StorageConfig{
		Bucket: bucketResult.Value,
	}

	if regionResult := resultMap["config.s3_storage_region"]; regionResult.Exists {
		c.Region = &regionResult.Value
	}

	if endpointResult := resultMap["config.s3_storage_endpoint"]; endpointResult.Exists {
		c.Endpoint = &endpointResult.Value
	}

	if forcePathStyleResult := resultMap["config.s3_storage_force_path_style"]; forcePathStyleResult.Exists {
		if forcePathStyle, err := strconv.ParseBool(forcePathStyleResult.Value); err == nil {
			c.ForcePathStyle = &forcePathStyle
		}
	}

	if baseDirResult := resultMap["config.s3_storage_base_dir"]; baseDirResult.Exists {
		c.BaseDir = &baseDirResult.Value
	}

	return c, isOverridden
}

// ConfigureFileStorage is the resolver for the configureFileStorage field.
func (r *mutationResolver) ConfigureFileStorage(ctx context.Context, input gql.FileStorageInput) (*gql.StorageConfigResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Configuring file storage", zap.String("baseDir", input.BaseDir))

	// First, test the configuration automatically
	testInput := gql.StorageConfigInput{
		Type:       gql.StorageTypeFile,
		FileConfig: &input,
	}

	testResult := r.validateStorageConfig(ctx, testInput)
	if !testResult.Success {
		// Return the test error directly
		return &gql.StorageConfigResult{
			Success:   false,
			Timestamp: fmt.Sprintf("%d", time.Now().UnixMilli()),
			Message:   &testResult.Message,
		}, nil
	}

	// Set timestamp
	timestamp := time.Now().UnixMilli()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// Prepare registry entries
	entries := []gql.RegistryEntryInput{
		{Key: "config.storage_type", Value: "file", IsEncrypted: false},
		{Key: "config.storage_configured", Value: "true", IsEncrypted: false},
		{Key: "config.file_storage_base_dir", Value: input.BaseDir, IsEncrypted: false},
		{Key: "config.storage_config_updated_at", Value: timestampStr, IsEncrypted: false},
	}

	// Add optional permissions
	if input.MkdirPermissions != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.file_storage_mkdir_permissions", Value: *input.MkdirPermissions, IsEncrypted: false,
		})
	}
	if input.WritePermissions != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.file_storage_write_permissions", Value: *input.WritePermissions, IsEncrypted: false,
		})
	}

	// Save to registry
	_, err := r.setSystemRegistryEntries(ctx, entries)
	if err != nil {
		r.logger.Error("Failed to save file storage configuration", zap.Error(err))
		return &gql.StorageConfigResult{
			Success:   false,
			Timestamp: timestampStr,
			Message:   &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	return &gql.StorageConfigResult{
		Success:   true,
		Timestamp: timestampStr,
		Message:   &[]string{"File storage configured successfully"}[0],
	}, nil
}

// ConfigureS3Storage is the resolver for the configureS3Storage field.
func (r *mutationResolver) ConfigureS3Storage(ctx context.Context, input gql.S3StorageInput) (*gql.StorageConfigResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Configuring S3 storage", zap.String("bucket", input.Bucket))

	// First, test the configuration automatically
	testInput := gql.StorageConfigInput{
		Type:     gql.StorageTypeS3,
		S3Config: &input,
	}

	testResult := r.validateStorageConfig(ctx, testInput)
	if !testResult.Success {
		// Return the test error directly
		return &gql.StorageConfigResult{
			Success:   false,
			Timestamp: fmt.Sprintf("%d", time.Now().UnixMilli()),
			Message:   &testResult.Message,
		}, nil
	}

	// Set timestamp
	timestamp := time.Now().UnixMilli()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// Prepare registry entries
	entries := []gql.RegistryEntryInput{
		{Key: "config.storage_type", Value: "s3", IsEncrypted: false},
		{Key: "config.storage_configured", Value: "true", IsEncrypted: false},
		{Key: "config.s3_storage_bucket", Value: input.Bucket, IsEncrypted: false},
		{Key: "config.storage_config_updated_at", Value: timestampStr, IsEncrypted: false},
	}

	// Add optional S3 configuration
	if input.Region != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_storage_region", Value: *input.Region, IsEncrypted: false,
		})
	}
	if input.Endpoint != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_storage_endpoint", Value: *input.Endpoint, IsEncrypted: false,
		})
	}
	if input.AccessKeyID != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_storage_access_key_id", Value: *input.AccessKeyID, IsEncrypted: true,
		})
	}
	if input.SecretAccessKey != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_storage_secret_access_key", Value: *input.SecretAccessKey, IsEncrypted: true,
		})
	}
	if input.SessionToken != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_storage_session_token", Value: *input.SessionToken, IsEncrypted: true,
		})
	}
	if input.ForcePathStyle != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_storage_force_path_style", Value: fmt.Sprintf("%t", *input.ForcePathStyle), IsEncrypted: false,
		})
	}
	if input.BaseDir != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_storage_base_dir", Value: *input.BaseDir, IsEncrypted: false,
		})
	}

	// Save to registry
	_, err := r.setSystemRegistryEntries(ctx, entries)
	if err != nil {
		r.logger.Error("Failed to save S3 storage configuration", zap.Error(err))
		return &gql.StorageConfigResult{
			Success:   false,
			Timestamp: timestampStr,
			Message:   &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	return &gql.StorageConfigResult{
		Success:   true,
		Timestamp: timestampStr,
		Message:   &[]string{"S3 storage configured successfully"}[0],
	}, nil
}

// validateStorageConfig is a helper function that validates a storage configuration
func (r *mutationResolver) validateStorageConfig(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
	return r.Resolver.validateStorageConfigInput(ctx, input)
}

// TestStorageConfig is the resolver for the testStorageConfig field.
func (r *mutationResolver) TestStorageConfig(ctx context.Context, input gql.StorageConfigInput) (*gql.StorageTestResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Testing storage configuration", zap.String("type", string(input.Type)))

	result := r.validateStorageConfig(ctx, input)
	return result, nil
}

// BeginStorageUploadProbe is the resolver for the beginStorageUploadProbe field.
func (r *mutationResolver) BeginStorageUploadProbe(ctx context.Context, input gql.StorageConfigInput, contentType string, sizeBytes int) (*gql.StorageUploadProbe, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if input.Type != gql.StorageTypeS3 {
		return nil, &gqlerror.Error{
			Message:    "browser upload probes are only supported for S3 storage",
			Extensions: map[string]interface{}{"code": "BAD_USER_INPUT"},
		}
	}
	if sizeBytes <= 0 {
		return nil, &gqlerror.Error{
			Message:    "invalid sizeBytes: must be greater than 0",
			Extensions: map[string]interface{}{"code": "BAD_USER_INPUT"},
		}
	}
	if int64(sizeBytes) > maxSinglePutUploadBytes {
		return nil, &gqlerror.Error{
			Message:    fmt.Sprintf("file too large for single upload: max %d bytes", maxSinglePutUploadBytes),
			Extensions: map[string]interface{}{"code": "BAD_USER_INPUT"},
		}
	}

	stor, err := storageFromValidationInput(input, r.logger, r.registryStore)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage instance: %w", err)
	}
	if _, err := stor.List(ctx, "", storage.ListOptions{Limit: 1}); err != nil {
		return nil, fmt.Errorf("failed to access storage directory: %w", err)
	}

	probe, err := newStorageUploadProbe(ctx, stor, contentType, int64(sizeBytes), 5*time.Minute)
	if err != nil {
		if errors.Is(err, errStorageDoesNotSupportPresign) {
			return nil, &gqlerror.Error{
				Message:    err.Error(),
				Extensions: map[string]interface{}{"code": "NOT_AVAILABLE"},
			}
		}
		return nil, fmt.Errorf("failed to generate upload probe: %w", err)
	}

	return probe, nil
}

// CompleteStorageUploadProbe is the resolver for the completeStorageUploadProbe field.
func (r *mutationResolver) CompleteStorageUploadProbe(ctx context.Context, input gql.StorageConfigInput, probePath string, expectedContent string) (*gql.StorageTestResult, error) {
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}
	if input.Type != gql.StorageTypeS3 {
		return nil, &gqlerror.Error{
			Message:    "browser upload probes are only supported for S3 storage",
			Extensions: map[string]interface{}{"code": "BAD_USER_INPUT"},
		}
	}

	stor, err := storageFromValidationInput(input, r.logger, r.registryStore)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage instance: %w", err)
	}

	result := completeStorageUploadProbe(ctx, stor, probePath, expectedContent)
	return result, nil
}

// Helper function to delete a system registry key
func (r *mutationResolver) deleteSystemRegistryKey(ctx context.Context, key string) error {
	_, err := r.DeleteSystemRegistry(ctx, &key, nil)
	return err
}

// parseExtensions parses a comma-separated string of extensions into a slice
func parseExtensions(extensionsStr *string) []string {
	if extensionsStr == nil || *extensionsStr == "" {
		return nil
	}
	parts := strings.Split(*extensionsStr, ",")
	extensions := make([]string, 0, len(parts))
	for _, part := range parts {
		ext := strings.TrimSpace(part)
		if ext != "" {
			extensions = append(extensions, ext)
		}
	}
	return extensions
}
