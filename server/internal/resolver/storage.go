package resolver

import (
	"context"
	"fmt"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"go.uber.org/zap"
)

// UploadFile is the resolver for the uploadFile field.
func (r *mutationResolver) UploadFile(ctx context.Context, path string, content graphql.Upload) (bool, error) {
	// Check write permissions
	if err := RequireWritePermission(ctx); err != nil {
		return false, err
	}
	r.logger.Info("Uploading file", zap.String("path", path), zap.String("filename", content.Filename))

	if err := r.storage.Put(ctx, path, content.File); err != nil {
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

	r.logger.Info("Deleting file", zap.String("path", path))

	if err := r.storage.Delete(ctx, path); err != nil {
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

	r.logger.Info("Creating folder", zap.String("path", path))

	if err := r.storage.CreateFolder(ctx, path); err != nil {
		r.logger.Error("Failed to create folder", zap.Error(err))
		return false, fmt.Errorf("failed to create folder: %w", err)
	}

	return true, nil
}

// ListFiles is the resolver for the listFiles field.
func (r *queryResolver) ListFiles(ctx context.Context, path string, offset int, limit int, onlyFiles *bool, onlyFolders *bool, sortBy *gql.SortOption, sortOrder *gql.SortOrder) (*gql.FileList, error) {
	r.logger.Info("Listing files",
		zap.String("path", path),
		zap.Int("offset", offset),
		zap.Int("limit", limit),
		zap.Any("sortBy", sortBy),
		zap.Any("sortOrder", sortOrder),
	)

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

	result, err := r.storage.List(ctx, path, options)
	if err != nil {
		r.logger.Error("Failed to list files", zap.Error(err))
		return nil, fmt.Errorf("failed to list files: %w", err)
	}

	files := make([]*gql.FileItem, len(result.Items))
	for i, item := range result.Items {
		files[i] = &gql.FileItem{
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
func (r *queryResolver) StatFile(ctx context.Context, path string) (*gql.FileStat, error) {
	r.logger.Info("Getting file stats", zap.String("path", path))

	fileInfo, err := r.storage.Stat(ctx, path)
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
