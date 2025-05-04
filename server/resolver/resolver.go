package resolver

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/pkg/metadatastore"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/storageconfigstore"
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
	sorageRepository storageconfigstore.Store
	metadataStore    metadatastore.Store
	logger           *zap.Logger
}

func NewResolver(sorageRepository storageconfigstore.Store, metadataStore metadatastore.Store, logger *zap.Logger) *Resolver {
	return &Resolver{
		sorageRepository: sorageRepository,
		metadataStore:    metadataStore,
		logger:           logger,
	}
}

func (r *Resolver) getStorage(ctx context.Context, storageKey *string) (storage.Storage, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	if storageKey == nil {
		return r.sorageRepository.DefaultStorage(ownerID)
	}
	return r.sorageRepository.Storage(ownerID, *storageKey)
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

	err = r.sorageRepository.Create(ctx, ownerID, &storageconfigstore.Config{
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

	err = r.sorageRepository.Update(ctx, ownerID, key, &storageconfigstore.Config{
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

	err = r.sorageRepository.Delete(ctx, ownerID, key)
	if err != nil {
		return false, err
	}
	return true, nil
}

// SetMetadata is the resolver for the setMetadata field.
func (r *mutationResolver) SetMetadata(ctx context.Context, key string, value string) (*gql.Metadata, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	metadata, err := r.metadataStore.Set(ctx, ownerID, key, value)
	if err != nil {
		return nil, err
	}

	return &gql.Metadata{
		Key:       metadata.Key,
		Value:     metadata.Value,
		CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
		UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
	}, nil
}

// DeleteMetadata is the resolver for the deleteMetadata field.
func (r *mutationResolver) DeleteMetadata(ctx context.Context, key string) (bool, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to get owner ID: %w", err)
	}

	err = r.metadataStore.Delete(ctx, ownerID, key)
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

	configs, err := r.sorageRepository.List(ctx, ownerID)
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

	cfg, err := r.sorageRepository.Get(ctx, ownerID, key)
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

// ListMetadata is the resolver for the listMetadata field.
func (r *queryResolver) ListMetadata(ctx context.Context, prefix *string) ([]*gql.Metadata, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	metadataList, err := r.metadataStore.List(ctx, ownerID, prefix)
	if err != nil {
		return nil, err
	}

	result := make([]*gql.Metadata, len(metadataList))
	for i, metadata := range metadataList {
		result[i] = &gql.Metadata{
			Key:       metadata.Key,
			Value:     metadata.Value,
			CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
			UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
		}
	}
	return result, nil
}

// GetMetadata is the resolver for the getMetadata field.
func (r *queryResolver) GetMetadata(ctx context.Context, key string) (*gql.Metadata, error) {
	ownerID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get owner ID: %w", err)
	}

	metadata, err := r.metadataStore.Get(ctx, ownerID, key)
	if err != nil {
		return nil, err
	}
	if metadata == nil {
		return nil, nil
	}
	return &gql.Metadata{
		Key:       metadata.Key,
		Value:     metadata.Value,
		CreatedAt: metadata.CreatedAt.Format(time.RFC3339),
		UpdatedAt: metadata.UpdatedAt.Format(time.RFC3339),
	}, nil
}
