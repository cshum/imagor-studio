package storage

import (
	"context"
	"errors"
	"io"
	"time"
)

var ErrInvalidStorageType = errors.New("invalid storage type")

type FileInfo struct {
	Name         string    `json:"name"`
	Path         string    `json:"path"`
	Size         int64     `json:"size"`
	IsDir        bool      `json:"isDir"`
	ModifiedTime time.Time `json:"modifiedTime"`
	ETag         string    `json:"etag,omitempty"`
}

type ListResult struct {
	Items      []FileInfo `json:"items"`
	TotalCount int        `json:"totalCount"`
}

type SortOption string
type SortOrder string

const (
	SortByName         SortOption = "NAME"
	SortBySize         SortOption = "SIZE"
	SortByModifiedTime SortOption = "MODIFIED_TIME"

	SortOrderAsc  SortOrder = "ASC"
	SortOrderDesc SortOrder = "DESC"
)

type ListOptions struct {
	Offset      int
	Limit       int
	OnlyFiles   bool
	OnlyFolders bool
	SortBy      SortOption
	SortOrder   SortOrder
}

type Storage interface {
	List(ctx context.Context, path string, options ListOptions) (ListResult, error)
	Get(ctx context.Context, path string) (io.ReadCloser, error)
	Put(ctx context.Context, path string, content io.Reader) error
	Delete(ctx context.Context, path string) error
	CreateFolder(ctx context.Context, path string) error
	Stat(ctx context.Context, path string) (FileInfo, error)
}

func NewStorage(storageType, s3Bucket, s3Region, filesysRoot string) (Storage, error) {
	switch storageType {
	case "s3":
		return NewS3Storage(s3Bucket, s3Region)
	case "filesystem":
		return NewFilesystemStorage(filesysRoot)
	default:
		return nil, ErrInvalidStorageType
	}
}
