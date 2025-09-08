package resolver

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/imageservice"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"go.uber.org/zap"
)

// UploadFile is the resolver for the uploadFile field.
func (r *mutationResolver) UploadFile(ctx context.Context, path string, content graphql.Upload) (bool, error) {
	// Check write permissions
	if err := RequireWritePermission(ctx); err != nil {
		return false, err
	}
	r.logger.Debug("Uploading file", zap.String("path", path), zap.String("filename", content.Filename))

	if err := r.getStorage().Put(ctx, path, content.File); err != nil {
		r.logger.Error("Failed to upload file", zap.Error(err))
		return false, fmt.Errorf("failed to upload file: %w", err)
	}

	return true, nil
}

// DeleteFile is the resolver for the deleteFile field.
func (r *mutationResolver) DeleteFile(ctx context.Context, path string) (bool, error) {
	// Check write permissions
	if err := RequireWritePermission(ctx); err != nil {
		return false, err
	}

	r.logger.Debug("Deleting file", zap.String("path", path))

	if err := r.getStorage().Delete(ctx, path); err != nil {
		r.logger.Error("Failed to delete file", zap.Error(err))
		return false, fmt.Errorf("failed to delete file: %w", err)
	}

	return true, nil
}

// CreateFolder is the resolver for the createFolder field.
func (r *mutationResolver) CreateFolder(ctx context.Context, path string) (bool, error) {
	// Check write permissions
	if err := RequireWritePermission(ctx); err != nil {
		return false, err
	}

	r.logger.Debug("Creating folder", zap.String("path", path))

	if err := r.getStorage().CreateFolder(ctx, path); err != nil {
		r.logger.Error("Failed to create folder", zap.Error(err))
		return false, fmt.Errorf("failed to create folder: %w", err)
	}

	return true, nil
}

// ListFiles is the resolver for the listFiles field.
func (r *queryResolver) ListFiles(ctx context.Context, path string, offset *int, limit *int, onlyFiles *bool, onlyFolders *bool, sortBy *gql.SortOption, sortOrder *gql.SortOrder) (*gql.FileList, error) {
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

	result, err := r.getStorage().List(ctx, path, options)
	if err != nil {
		r.logger.Error("Failed to list files", zap.Error(err))
		return nil, fmt.Errorf("failed to list files: %w", err)
	}

	files := make([]*gql.FileItem, len(result.Items))
	for i, item := range result.Items {
		fileItem := &gql.FileItem{
			Name:        item.Name,
			Path:        item.Path,
			Size:        int(item.Size),
			IsDirectory: item.IsDir,
		}

		// Generate thumbnail URLs for image files
		if !item.IsDir && r.isImageFile(item.Name) {
			thumbnailUrls := r.generateThumbnailUrls(item.Path)
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
func (r *queryResolver) StatFile(ctx context.Context, path string) (*gql.FileStat, error) {
	r.logger.Debug("Getting file stats", zap.String("path", path))

	fileInfo, err := r.getStorage().Stat(ctx, path)
	if err != nil {
		r.logger.Error("Failed to get file stats", zap.Error(err))
		return nil, fmt.Errorf("failed to get file stats: %w", err)
	}

	fileStat := &gql.FileStat{
		Name:         fileInfo.Name,
		Path:         fileInfo.Path,
		Size:         int(fileInfo.Size),
		IsDirectory:  fileInfo.IsDir,
		ModifiedTime: fileInfo.ModifiedTime.Format(time.RFC3339),
		Etag:         &fileInfo.ETag,
	}

	// Generate thumbnail URLs for image files
	if !fileInfo.IsDir && r.isImageFile(fileInfo.Name) {
		thumbnailUrls := r.generateThumbnailUrls(fileInfo.Path)
		fileStat.ThumbnailUrls = thumbnailUrls
	}

	return fileStat, nil
}

// StorageStatus is the resolver for the storageStatus field.
func (r *queryResolver) StorageStatus(ctx context.Context) (*gql.StorageStatus, error) {
	// Use batch operation for better performance
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.storage_configured",
		"config.storage_type",
		"config.storage_config_updated_at")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Check if storage is configured
	configuredResult := resultMap["config.storage_configured"]
	isConfigured := configuredResult.Exists && configuredResult.Value == "true"

	var storageType *string
	var fileConfig *gql.FileStorageConfig
	var s3Config *gql.S3StorageConfig

	if isConfigured {
		if typeResult := resultMap["config.storage_type"]; typeResult.Exists {
			storageType = &typeResult.Value

			// Load type-specific configuration
			switch typeResult.Value {
			case "file", "filesystem":
				fileConfig = r.getFileStorageConfig(ctx)
			case "s3":
				s3Config = r.getS3StorageConfig(ctx)
			}
		}
	}

	// Check if restart is required
	restartRequired := r.storageProvider.IsRestartRequired()

	var lastUpdated *string
	if timestampResult := resultMap["config.storage_config_updated_at"]; timestampResult.Exists {
		lastUpdated = &timestampResult.Value
	}

	return &gql.StorageStatus{
		Configured:      isConfigured,
		Type:            storageType,
		RestartRequired: restartRequired,
		LastUpdated:     lastUpdated,
		FileConfig:      fileConfig,
		S3Config:        s3Config,
	}, nil
}

// Helper function to get file storage configuration
func (r *queryResolver) getFileStorageConfig(ctx context.Context) *gql.FileStorageConfig {
	// Use batch operation for better performance
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.file_base_dir",
		"config.file_mkdir_permissions",
		"config.file_write_permissions")

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
	baseDir := "./storage" // Default
	if result := resultMap["config.file_base_dir"]; result.Exists {
		baseDir = result.Value
	}

	mkdirPermissions := "0755" // Default
	if result := resultMap["config.file_mkdir_permissions"]; result.Exists {
		mkdirPermissions = result.Value
	}

	writePermissions := "0644" // Default
	if result := resultMap["config.file_write_permissions"]; result.Exists {
		writePermissions = result.Value
	}

	return &gql.FileStorageConfig{
		BaseDir:              baseDir,
		MkdirPermissions:     mkdirPermissions,
		WritePermissions:     writePermissions,
		IsOverriddenByConfig: isOverridden,
	}
}

// Helper function to get S3 storage configuration
func (r *queryResolver) getS3StorageConfig(ctx context.Context) *gql.S3StorageConfig {
	// Use batch operation for better performance
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.s3_bucket",
		"config.s3_region",
		"config.s3_endpoint",
		"config.s3_base_dir")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Check if bucket exists (required)
	bucketResult := resultMap["config.s3_bucket"]
	if !bucketResult.Exists {
		return nil
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
		Bucket:               bucketResult.Value,
		IsOverriddenByConfig: isOverridden,
	}

	if regionResult := resultMap["config.s3_region"]; regionResult.Exists {
		c.Region = &regionResult.Value
	}

	if endpointResult := resultMap["config.s3_endpoint"]; endpointResult.Exists {
		c.Endpoint = &endpointResult.Value
	}

	if baseDirResult := resultMap["config.s3_base_dir"]; baseDirResult.Exists {
		c.BaseDir = &baseDirResult.Value
	}

	return c
}

// ConfigureFileStorage is the resolver for the configureFileStorage field.
func (r *mutationResolver) ConfigureFileStorage(ctx context.Context, input gql.FileStorageInput) (*gql.StorageConfigResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Configuring file storage", zap.String("baseDir", input.BaseDir))

	// Set timestamp
	timestamp := time.Now().UnixMilli()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// Prepare registry entries
	entries := []gql.RegistryEntryInput{
		{Key: "config.storage_type", Value: "file", IsEncrypted: false},
		{Key: "config.storage_configured", Value: "true", IsEncrypted: false},
		{Key: "config.file_base_dir", Value: input.BaseDir, IsEncrypted: false},
		{Key: "config.storage_config_updated_at", Value: timestampStr, IsEncrypted: false},
	}

	// Add optional permissions
	if input.MkdirPermissions != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.file_mkdir_permissions", Value: *input.MkdirPermissions, IsEncrypted: false,
		})
	}
	if input.WritePermissions != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.file_write_permissions", Value: *input.WritePermissions, IsEncrypted: false,
		})
	}

	// Save to registry
	_, err := r.setSystemRegistryEntries(ctx, entries)
	if err != nil {
		r.logger.Error("Failed to save file storage configuration", zap.Error(err))
		return &gql.StorageConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	// Reload storage from registry to apply changes immediately
	if err := r.storageProvider.ReloadFromRegistry(); err != nil {
		r.logger.Error("Failed to reload storage from registry", zap.Error(err))
		return &gql.StorageConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Configuration saved but failed to apply"}[0],
		}, nil
	}

	// Check if restart is required (should be false for file storage)
	restartRequired := r.storageProvider.IsRestartRequired()

	return &gql.StorageConfigResult{
		Success:         true,
		RestartRequired: restartRequired,
		Timestamp:       timestampStr,
		Message:         &[]string{"File storage configured successfully"}[0],
	}, nil
}

// ConfigureS3Storage is the resolver for the configureS3Storage field.
func (r *mutationResolver) ConfigureS3Storage(ctx context.Context, input gql.S3StorageInput) (*gql.StorageConfigResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Configuring S3 storage", zap.String("bucket", input.Bucket))

	// Set timestamp
	timestamp := time.Now().UnixMilli()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// Prepare registry entries
	entries := []gql.RegistryEntryInput{
		{Key: "config.storage_type", Value: "s3", IsEncrypted: false},
		{Key: "config.storage_configured", Value: "true", IsEncrypted: false},
		{Key: "config.s3_bucket", Value: input.Bucket, IsEncrypted: false},
		{Key: "config.storage_config_updated_at", Value: timestampStr, IsEncrypted: false},
	}

	// Add optional S3 configuration
	if input.Region != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_region", Value: *input.Region, IsEncrypted: false,
		})
	}
	if input.Endpoint != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_endpoint", Value: *input.Endpoint, IsEncrypted: false,
		})
	}
	if input.AccessKeyID != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_access_key_id", Value: *input.AccessKeyID, IsEncrypted: true,
		})
	}
	if input.SecretAccessKey != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_secret_access_key", Value: *input.SecretAccessKey, IsEncrypted: true,
		})
	}
	if input.SessionToken != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_session_token", Value: *input.SessionToken, IsEncrypted: true,
		})
	}
	if input.BaseDir != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_base_dir", Value: *input.BaseDir, IsEncrypted: false,
		})
	}

	// Save to registry
	_, err := r.setSystemRegistryEntries(ctx, entries)
	if err != nil {
		r.logger.Error("Failed to save S3 storage configuration", zap.Error(err))
		return &gql.StorageConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	// S3 configuration always requires restart
	return &gql.StorageConfigResult{
		Success:         true,
		RestartRequired: true,
		Timestamp:       timestampStr,
		Message:         &[]string{"S3 storage configured successfully. Server restart required."}[0],
	}, nil
}

// validateStorageConfig is a helper function that validates a storage configuration
func (r *mutationResolver) validateStorageConfig(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
	// Create a temporary config for testing
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
		cfg.FileBaseDir = input.FileConfig.BaseDir
		// Set defaults for permissions if not provided
		cfg.FileMkdirPermissions = 0755
		cfg.FileWritePermissions = 0644

	case gql.StorageTypeS3:
		if input.S3Config == nil {
			return &gql.StorageTestResult{
				Success: false,
				Message: "S3 configuration is required for S3 storage type",
			}
		}
		cfg.StorageType = "s3"
		cfg.S3Bucket = input.S3Config.Bucket
		if input.S3Config.Region != nil {
			cfg.S3Region = *input.S3Config.Region
		}
		if input.S3Config.Endpoint != nil {
			cfg.S3Endpoint = *input.S3Config.Endpoint
		}
		if input.S3Config.AccessKeyID != nil {
			cfg.S3AccessKeyID = *input.S3Config.AccessKeyID
		}
		if input.S3Config.SecretAccessKey != nil {
			cfg.S3SecretAccessKey = *input.S3Config.SecretAccessKey
		}
		if input.S3Config.SessionToken != nil {
			cfg.S3SessionToken = *input.S3Config.SessionToken
		}
		if input.S3Config.BaseDir != nil {
			cfg.S3BaseDir = *input.S3Config.BaseDir
		}
	}

	// Create a temporary storage provider for testing
	testProvider := storageprovider.New(r.logger, r.registryStore, nil)
	testStorage, err := testProvider.NewStorageFromConfig(cfg)
	if err != nil {
		errMsg := err.Error()
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to create storage instance",
			Details: &errMsg,
		}
	}

	// Test basic operations - start with List to verify directory exists without creating it
	// Test list operation first (read-only, won't create directories)
	_, err = testStorage.List(ctx, "", storage.ListOptions{Limit: 1})
	if err != nil {
		errMsg := err.Error()
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to access storage directory",
			Details: &errMsg,
		}
	}

	// Test basic write/read/delete operations
	testPath := "test-connection-" + uuid.GenerateUUID()
	testContent := strings.NewReader("test")

	// Test write
	if err := testStorage.Put(ctx, testPath, testContent); err != nil {
		errMsg := err.Error()
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to write test file",
			Details: &errMsg,
		}
	}

	// Test read
	reader, err := testStorage.Get(ctx, testPath)
	if err != nil {
		errMsg := err.Error()
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to read test file",
			Details: &errMsg,
		}
	}
	reader.Close()

	// Test delete
	if err := testStorage.Delete(ctx, testPath); err != nil {
		errMsg := err.Error()
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to delete test file",
			Details: &errMsg,
		}
	}

	return &gql.StorageTestResult{
		Success: true,
		Message: "Storage configuration test successful",
	}
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

// Helper function to set system registry entries
func (r *mutationResolver) setSystemRegistryEntries(ctx context.Context, entries []gql.RegistryEntryInput) ([]*gql.SystemRegistry, error) {
	// Check all entries for config conflicts first (same logic as SetSystemRegistry)
	for _, entry := range entries {
		if _, exists := r.config.GetByRegistryKey(entry.Key); exists {
			return nil, fmt.Errorf("cannot set registry key '%s': this configuration is managed by external config", entry.Key)
		}
	}

	// Convert []gql.RegistryEntryInput to []*gql.RegistryEntryInput
	entryPointers := make([]*gql.RegistryEntryInput, len(entries))
	for i := range entries {
		entryPointers[i] = &entries[i]
	}
	return r.SetSystemRegistry(ctx, nil, entryPointers)
}

// Helper function to check if a file is an image
func (r *queryResolver) isImageFile(filename string) bool {
	return imageservice.IsImageFile(filename)
}

// Helper function to generate thumbnail URLs using the image service
func (r *queryResolver) generateThumbnailUrls(imagePath string) *gql.ThumbnailUrls {
	// Generate different sized URLs using the image service
	gridURL, _ := r.imageService.GenerateURL(imagePath, imageservice.URLParams{
		Width:   300,
		Height:  225,
		Quality: 85,
		// Smart:   true,
		Format: "webp",
	})

	previewURL, _ := r.imageService.GenerateURL(imagePath, imageservice.URLParams{
		Width:   1200,
		Height:  900,
		Quality: 90,
		FitIn:   true,
	})

	fullURL, _ := r.imageService.GenerateURL(imagePath, imageservice.URLParams{
		Width:   2400,
		Height:  1800,
		Quality: 95,
		FitIn:   true,
	})

	// For original, use direct file access
	originalURL, _ := r.imageService.GenerateURL(imagePath, imageservice.URLParams{
		Raw: true,
	})

	// Generate meta URL for EXIF data
	metaURL, _ := r.imageService.GenerateURL(imagePath, imageservice.URLParams{
		Meta: true,
	})

	return &gql.ThumbnailUrls{
		Grid:     &gridURL,
		Preview:  &previewURL,
		Full:     &fullURL,
		Original: &originalURL,
		Meta:     &metaURL,
	}
}
