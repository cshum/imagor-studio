package resolver

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/registryutil"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/storageprovider"
	"github.com/cshum/imagor-studio/server/internal/uuid"
	"github.com/cshum/imagor/imagorpath"
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
	var isFileOverridden, isS3Overridden bool

	if isConfigured {
		if typeResult := resultMap["config.storage_type"]; typeResult.Exists {
			storageType = &typeResult.Value

			// Load type-specific configuration with override detection
			switch typeResult.Value {
			case "file", "filesystem":
				fileConfig, isFileOverridden = r.getFileStorageConfig(ctx)
			case "s3":
				s3Config, isS3Overridden = r.getS3StorageConfig(ctx)
			}
		}
	}

	// Top-level override: true if ANY storage config is overridden
	isConfigOverridden := isFileOverridden || isS3Overridden

	// Check if restart is required
	restartRequired := r.storageProvider.IsRestartRequired()

	var lastUpdated *string
	if timestampResult := resultMap["config.storage_config_updated_at"]; timestampResult.Exists {
		lastUpdated = &timestampResult.Value
	}

	return &gql.StorageStatus{
		Configured:           isConfigured,
		Type:                 storageType,
		RestartRequired:      restartRequired,
		LastUpdated:          lastUpdated,
		IsOverriddenByConfig: isConfigOverridden,
		FileConfig:           fileConfig,
		S3Config:             s3Config,
	}, nil
}

// Helper function to get file storage configuration
func (r *queryResolver) getFileStorageConfig(ctx context.Context) (*gql.FileStorageConfig, bool) {
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
		BaseDir:          baseDir,
		MkdirPermissions: mkdirPermissions,
		WritePermissions: writePermissions,
	}, isOverridden
}

// Helper function to get S3 storage configuration
func (r *queryResolver) getS3StorageConfig(ctx context.Context) (*gql.S3StorageConfig, bool) {
	// Use batch operation for better performance
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.s3_bucket",
		"config.s3_region",
		"config.s3_endpoint",
		"config.s3_force_path_style",
		"config.s3_base_dir")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Check if bucket exists (required)
	bucketResult := resultMap["config.s3_bucket"]
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

	if regionResult := resultMap["config.s3_region"]; regionResult.Exists {
		c.Region = &regionResult.Value
	}

	if endpointResult := resultMap["config.s3_endpoint"]; endpointResult.Exists {
		c.Endpoint = &endpointResult.Value
	}

	if forcePathStyleResult := resultMap["config.s3_force_path_style"]; forcePathStyleResult.Exists {
		if forcePathStyle, err := strconv.ParseBool(forcePathStyleResult.Value); err == nil {
			c.ForcePathStyle = &forcePathStyle
		}
	}

	if baseDirResult := resultMap["config.s3_base_dir"]; baseDirResult.Exists {
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
			Success:         false,
			RestartRequired: false,
			Timestamp:       fmt.Sprintf("%d", time.Now().UnixMilli()),
			Message:         &testResult.Message,
		}, nil
	}

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

	// Reload imagor from registry to ensure it uses the same storage configuration
	if err := r.imagorProvider.ReloadFromRegistry(); err != nil {
		r.logger.Error("Failed to reload imagor from registry after storage change", zap.Error(err))
		// Don't fail the operation, but log the warning
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

	// First, test the configuration automatically
	testInput := gql.StorageConfigInput{
		Type:     gql.StorageTypeS3,
		S3Config: &input,
	}

	testResult := r.validateStorageConfig(ctx, testInput)
	if !testResult.Success {
		// Return the test error directly
		return &gql.StorageConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       fmt.Sprintf("%d", time.Now().UnixMilli()),
			Message:         &testResult.Message,
		}, nil
	}

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
	if input.ForcePathStyle != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.s3_force_path_style", Value: fmt.Sprintf("%t", *input.ForcePathStyle), IsEncrypted: false,
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

	// Reload imagor from registry to ensure it uses the same storage configuration
	// Note: For S3, this will prepare imagor for the new config, but server restart is still required
	if err := r.imagorProvider.ReloadFromRegistry(); err != nil {
		r.logger.Error("Failed to reload imagor from registry after S3 storage change", zap.Error(err))
		// Don't fail the operation, but log the warning
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
		if input.S3Config.ForcePathStyle != nil {
			cfg.S3ForcePathStyle = *input.S3Config.ForcePathStyle
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
	// Simple image file extension check
	ext := strings.ToLower(filename)
	return strings.HasSuffix(ext, ".jpg") || strings.HasSuffix(ext, ".jpeg") ||
		strings.HasSuffix(ext, ".png") || strings.HasSuffix(ext, ".gif") ||
		strings.HasSuffix(ext, ".webp") || strings.HasSuffix(ext, ".bmp") ||
		strings.HasSuffix(ext, ".tiff") || strings.HasSuffix(ext, ".tif")
}

// ImagorStatus is the resolver for the imagorStatus field.
func (r *queryResolver) ImagorStatus(ctx context.Context) (*gql.ImagorStatus, error) {
	// Use batch operation for better performance
	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config,
		"config.imagor_mode",
		"config.imagor_config_updated_at")

	// Create a map for easy lookup
	resultMap := make(map[string]registryutil.EffectiveValueResult)
	for _, result := range results {
		resultMap[result.Key] = result
	}

	// Get current imagor configuration
	imagorConfig := r.imagorProvider.GetConfig()
	if imagorConfig == nil {
		// Get JWT secret from config
		jwtSecret := ""
		if value, exists := r.config.GetByRegistryKey("config.jwt_secret"); exists {
			jwtSecret = value
		}

		// Default to embedded mode if no config
		imagorConfig = &imagorprovider.ImagorConfig{
			Mode:           "embedded",
			BaseURL:        "/imagor",
			Secret:         jwtSecret,
			Unsafe:         false,
			SignerType:     "sha256",
			SignerTruncate: 28,
		}
	}

	// Check if restart is required
	restartRequired := r.imagorProvider.IsRestartRequired()

	var lastUpdated *string
	if timestampResult := resultMap["config.imagor_config_updated_at"]; timestampResult.Exists {
		lastUpdated = &timestampResult.Value
	}

	// Check if any imagor config is overridden
	isConfigOverridden := r.isImagorConfigOverridden(ctx, imagorConfig.Mode)

	status := &gql.ImagorStatus{
		Configured:           true, // Always configured (defaults to embedded)
		Mode:                 &imagorConfig.Mode,
		RestartRequired:      restartRequired,
		LastUpdated:          lastUpdated,
		IsOverriddenByConfig: isConfigOverridden,
	}

	// Add mode-specific configuration
	if imagorConfig.Mode == "embedded" {
		status.EmbeddedConfig = r.getEmbeddedImagorConfig(ctx, imagorConfig)
	} else if imagorConfig.Mode == "external" {
		status.ExternalConfig = r.getExternalImagorConfig(ctx, imagorConfig)
	}

	return status, nil
}

// Helper function to check if imagor config is overridden
func (r *queryResolver) isImagorConfigOverridden(ctx context.Context, mode string) bool {
	var keys []string
	if mode == "embedded" {
		keys = []string{
			"config.imagor_mode",
			"config.imagor_secret",
		}
	} else {
		keys = []string{
			"config.imagor_mode",
			"config.imagor_base_url",
			"config.imagor_secret",
			"config.imagor_unsafe",
			"config.imagor_signer_type",
			"config.imagor_signer_truncate",
		}
	}

	results := registryutil.GetEffectiveValues(ctx, r.registryStore, r.config, keys...)
	for _, result := range results {
		if result.IsOverriddenByConfig {
			return true
		}
	}
	return false
}

// Helper function to get embedded imagor configuration
func (r *queryResolver) getEmbeddedImagorConfig(ctx context.Context, imagorConfig *imagorprovider.ImagorConfig) *gql.EmbeddedImagorConfig {
	return &gql.EmbeddedImagorConfig{
		Enabled: true, // Embedded mode is enabled when configured
	}
}

// Helper function to get external imagor configuration
func (r *queryResolver) getExternalImagorConfig(ctx context.Context, imagorConfig *imagorprovider.ImagorConfig) *gql.ExternalImagorConfig {
	// Convert signer type to GraphQL enum
	var signerType gql.ImagorSignerType
	switch strings.ToLower(imagorConfig.SignerType) {
	case "sha256":
		signerType = gql.ImagorSignerTypeSha256
	case "sha512":
		signerType = gql.ImagorSignerTypeSha512
	default:
		signerType = gql.ImagorSignerTypeSha1
	}

	return &gql.ExternalImagorConfig{
		BaseURL:        imagorConfig.BaseURL,
		HasSecret:      imagorConfig.Secret != "",
		Unsafe:         imagorConfig.Unsafe,
		SignerType:     signerType,
		SignerTruncate: imagorConfig.SignerTruncate,
	}
}

// ConfigureEmbeddedImagor is the resolver for the configureEmbeddedImagor field.
func (r *mutationResolver) ConfigureEmbeddedImagor(ctx context.Context) (*gql.ImagorConfigResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Configuring embedded imagor")

	// Set timestamp
	timestamp := time.Now().UnixMilli()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// Prepare registry entries
	entries := []gql.RegistryEntryInput{
		{Key: "config.imagor_mode", Value: "embedded", IsEncrypted: false},
		{Key: "config.imagor_config_updated_at", Value: timestampStr, IsEncrypted: false},
	}

	// Save to registry
	_, err := r.setSystemRegistryEntries(ctx, entries)
	if err != nil {
		r.logger.Error("Failed to save embedded imagor configuration", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	// Reload imagor from registry to apply changes immediately
	if err := r.imagorProvider.ReloadFromRegistry(); err != nil {
		r.logger.Error("Failed to reload imagor from registry", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Configuration saved but failed to apply"}[0],
		}, nil
	}

	// Embedded mode typically doesn't require restart
	restartRequired := r.imagorProvider.IsRestartRequired()

	return &gql.ImagorConfigResult{
		Success:         true,
		RestartRequired: restartRequired,
		Timestamp:       timestampStr,
		Message:         &[]string{"Embedded imagor configured successfully"}[0],
	}, nil
}

// ConfigureExternalImagor is the resolver for the configureExternalImagor field.
func (r *mutationResolver) ConfigureExternalImagor(ctx context.Context, input gql.ExternalImagorInput) (*gql.ImagorConfigResult, error) {
	// Check admin permissions
	if err := RequireAdminPermission(ctx); err != nil {
		return nil, err
	}

	r.logger.Debug("Configuring external imagor", zap.String("baseUrl", input.BaseURL))

	// Set timestamp
	timestamp := time.Now().UnixMilli()
	timestampStr := fmt.Sprintf("%d", timestamp)

	// Prepare registry entries
	entries := []gql.RegistryEntryInput{
		{Key: "config.imagor_mode", Value: "external", IsEncrypted: false},
		{Key: "config.imagor_base_url", Value: input.BaseURL, IsEncrypted: false},
		{Key: "config.imagor_config_updated_at", Value: timestampStr, IsEncrypted: false},
	}

	// Add optional secret
	if input.Secret != nil && *input.Secret != "" {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_secret", Value: *input.Secret, IsEncrypted: true,
		})
	}

	// Add optional unsafe flag
	if input.Unsafe != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_unsafe", Value: fmt.Sprintf("%t", *input.Unsafe), IsEncrypted: false,
		})
	}

	// Add optional signer type
	if input.SignerType != nil {
		var signerTypeStr string
		switch *input.SignerType {
		case gql.ImagorSignerTypeSha256:
			signerTypeStr = "sha256"
		case gql.ImagorSignerTypeSha512:
			signerTypeStr = "sha512"
		default:
			signerTypeStr = "sha1"
		}
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_signer_type", Value: signerTypeStr, IsEncrypted: false,
		})
	}

	// Add optional signer truncate
	if input.SignerTruncate != nil {
		entries = append(entries, gql.RegistryEntryInput{
			Key: "config.imagor_signer_truncate", Value: fmt.Sprintf("%d", *input.SignerTruncate), IsEncrypted: false,
		})
	}

	// Save to registry
	_, err := r.setSystemRegistryEntries(ctx, entries)
	if err != nil {
		r.logger.Error("Failed to save external imagor configuration", zap.Error(err))
		return &gql.ImagorConfigResult{
			Success:         false,
			RestartRequired: false,
			Timestamp:       timestampStr,
			Message:         &[]string{"Failed to save configuration"}[0],
		}, nil
	}

	// External mode configuration doesn't require restart (no embedded handler to recreate)
	return &gql.ImagorConfigResult{
		Success:         true,
		RestartRequired: false,
		Timestamp:       timestampStr,
		Message:         &[]string{"External imagor configured successfully"}[0],
	}, nil
}

// Helper function to delete a system registry key
func (r *mutationResolver) deleteSystemRegistryKey(ctx context.Context, key string) error {
	_, err := r.DeleteSystemRegistry(ctx, &key, nil)
	return err
}

// Helper function to generate thumbnail URLs using the imagor provider
func (r *queryResolver) generateThumbnailUrls(imagePath string) *gql.ThumbnailUrls {
	// Generate different sized URLs using the imagor provider
	gridURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:  300,
		Height: 225,
		Filters: imagorpath.Filters{
			{Name: "quality", Args: "80"},
			{Name: "format", Args: "webp"},
			{Name: "max_frames", Args: "1"},
		},
	})

	previewURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:  1200,
		Height: 900,
		FitIn:  true,
		Filters: imagorpath.Filters{
			{Name: "quality", Args: "90"},
			{Name: "format", Args: "webp"},
		},
	})

	fullURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Width:  2400,
		Height: 1800,
		FitIn:  true,
		Filters: imagorpath.Filters{
			{Name: "quality", Args: "95"},
			{Name: "format", Args: "webp"},
		},
	})

	// For original, use raw filter
	originalURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
		Filters: imagorpath.Filters{
			{Name: "raw"},
		},
	})

	// Generate meta URL for EXIF data
	metaURL, _ := r.imagorProvider.GenerateURL(imagePath, imagorpath.Params{
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
