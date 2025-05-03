package resolver

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/storagemanager"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"go.uber.org/zap"
)

type contextKey string

const (
	OwnerIDContextKey contextKey = "ownerID"
)

// GetOwnerIDFromContext extracts the owner ID from the context
func GetOwnerIDFromContext(ctx context.Context) (string, error) {
	ownerID, ok := ctx.Value(OwnerIDContextKey).(string)
	if !ok {
		// For development/testing, return a default owner ID (UUID)
		// In production, this should return an error
		return "00000000-0000-0000-0000-000000000001", nil
	}
	return ownerID, nil
}

type Resolver struct {
	storageManager storagemanager.StorageManager
	logger         *zap.Logger
}

func NewResolver(storageManager storagemanager.StorageManager, logger *zap.Logger) *Resolver {
	return &Resolver{
		storageManager: storageManager,
		logger:         logger,
	}
}

func (r *Resolver) getStorage(ctx context.Context, storageKey *string) (storage.Storage, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	if storageKey == nil {
		return r.storageManager.GetDefaultStorage(ownerID)
	}
	return r.storageManager.GetStorage(ownerID, *storageKey)
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() gql.MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() gql.QueryResolver { return &queryResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }

// UploadFile is the resolver for the uploadFile field.
func (r *mutationResolver) UploadFile(ctx context.Context, storageKey *string, path string, content graphql.Upload) (bool, error) {
	r.logger.Info("Uploading file", zap.String("path", path), zap.String("filename", content.Filename))

	s, err := r.getStorage(ctx, storageKey)
	if err != nil {
		return false, err
	}

	err = s.Put(ctx, path, content.File)
	if err != nil {
		r.logger.Error("Failed to upload file", zap.Error(err))
		return false, fmt.Errorf("failed to upload file: %w", err)
	}

	return true, nil
}

// DeleteFile is the resolver for the deleteFile field.
func (r *mutationResolver) DeleteFile(ctx context.Context, storageKey *string, path string) (bool, error) {
	r.logger.Info("Deleting file", zap.String("path", path))

	s, err := r.getStorage(ctx, storageKey)
	if err != nil {
		return false, err
	}

	err = s.Delete(ctx, path)
	if err != nil {
		r.logger.Error("Failed to delete file", zap.Error(err))
		return false, fmt.Errorf("failed to delete file: %w", err)
	}

	return true, nil
}

// CreateFolder is the resolver for the createFolder field.
func (r *mutationResolver) CreateFolder(ctx context.Context, storageKey *string, path string) (bool, error) {
	r.logger.Info("Creating folder", zap.String("path", path))

	s, err := r.getStorage(ctx, storageKey)
	if err != nil {
		return false, err
	}

	err = s.CreateFolder(ctx, path)
	if err != nil {
		r.logger.Error("Failed to create folder", zap.Error(err))
		return false, fmt.Errorf("failed to create folder: %w", err)
	}

	return true, nil
}

// AddStorageConfig is the resolver for the addStorageConfig field.
func (r *mutationResolver) AddStorageConfig(ctx context.Context, config gql.StorageConfigInput) (*gql.StorageConfig, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	err = r.storageManager.AddConfig(ctx, ownerID, &storagemanager.StorageConfig{
		Name:   config.Name,
		Key:    config.Key,
		Type:   config.Type,
		Config: json.RawMessage(config.Config),
	})
	if err != nil {
		return nil, err
	}

	return &gql.StorageConfig{
		Name:   config.Name,
		Key:    config.Key,
		Type:   config.Type,
		Config: config.Config,
	}, nil
}

// UpdateStorageConfig is the resolver for the updateStorageConfig field.
func (r *mutationResolver) UpdateStorageConfig(ctx context.Context, key string, config gql.StorageConfigInput) (*gql.StorageConfig, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	err = r.storageManager.UpdateConfig(ctx, ownerID, key, &storagemanager.StorageConfig{
		Name:   config.Name,
		Key:    config.Key,
		Type:   config.Type,
		Config: json.RawMessage(config.Config),
	})
	if err != nil {
		return nil, err
	}

	return &gql.StorageConfig{
		Name:   config.Name,
		Key:    config.Key,
		Type:   config.Type,
		Config: config.Config,
	}, nil
}

// DeleteStorageConfig is the resolver for the deleteStorageConfig field.
func (r *mutationResolver) DeleteStorageConfig(ctx context.Context, key string) (bool, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to get owner ID: %w", err)
	}

	err = r.storageManager.DeleteConfig(ctx, ownerID, key)
	if err != nil {
		return false, err
	}
	return true, nil
}

// ListFiles is the resolver for the listFiles field.
func (r *queryResolver) ListFiles(ctx context.Context, storageKey *string, path string, offset int, limit int, onlyFiles *bool, onlyFolders *bool, sortBy *gql.SortOption, sortOrder *gql.SortOrder) (*gql.FileList, error) {
	r.logger.Info("Listing files",
		zap.String("path", path),
		zap.Int("offset", offset),
		zap.Int("limit", limit),
		zap.Any("sortBy", sortBy),
		zap.Any("sortOrder", sortOrder),
	)

	s, err := r.getStorage(ctx, storageKey)
	if err != nil {
		return nil, err
	}

	options := storage.ListOptions{
		Offset:      offset,
		Limit:       limit,
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

	result, err := s.List(ctx, path, options)
	if err != nil {
		r.logger.Error("Failed to list files", zap.Error(err))
		return nil, fmt.Errorf("failed to list files: %w", err)
	}

	files := make([]*gql.File, len(result.Items))
	for i, item := range result.Items {
		files[i] = &gql.File{
			Name:        item.Name,
			Path:        item.Path,
			Size:        int(item.Size),
			IsDirectory: item.IsDir,
		}
	}

	return &gql.FileList{
		Items:      files,
		TotalCount: result.TotalCount,
	}, nil
}

// StatFile is the resolver for the statFile field.
func (r *queryResolver) StatFile(ctx context.Context, storageKey *string, path string) (*gql.FileStat, error) {
	r.logger.Info("Getting file stats", zap.String("path", path))

	s, err := r.getStorage(ctx, storageKey)
	if err != nil {
		return nil, err
	}

	fileInfo, err := s.Stat(ctx, path)
	if err != nil {
		r.logger.Error("Failed to get file stats", zap.Error(err))
		return nil, fmt.Errorf("failed to get file stats: %w", err)
	}

	return &gql.FileStat{
		Name:         fileInfo.Name,
		Path:         fileInfo.Path,
		Size:         int(fileInfo.Size),
		IsDirectory:  fileInfo.IsDir,
		ModifiedTime: fileInfo.ModifiedTime.Format(time.RFC3339),
		Etag:         &fileInfo.ETag,
	}, nil
}

// ListStorageConfigs is the resolver for the listStorageConfigs field.
func (r *queryResolver) ListStorageConfigs(ctx context.Context) ([]*gql.StorageConfig, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	configs, err := r.storageManager.GetConfigs(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	result := make([]*gql.StorageConfig, len(configs))
	for i, cfg := range configs {
		result[i] = &gql.StorageConfig{
			Name:   cfg.Name,
			Key:    cfg.Key,
			Type:   cfg.Type,
			Config: string(cfg.Config),
		}
	}
	return result, nil
}

// GetStorageConfig is the resolver for the getStorageConfig field.
func (r *queryResolver) GetStorageConfig(ctx context.Context, key string) (*gql.StorageConfig, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	cfg, err := r.storageManager.GetConfig(ctx, ownerID, key)
	if err != nil {
		return nil, err
	}
	if cfg == nil {
		return nil, nil
	}
	return &gql.StorageConfig{
		Name:   cfg.Name,
		Key:    cfg.Key,
		Type:   cfg.Type,
		Config: string(cfg.Config),
	}, nil
}
