package storage

import (
	"context"
	"io"
	"time"
)

type ListOptions struct {
	Offset      int
	Limit       int
	OnlyFiles   bool
	OnlyFolders bool
	SortBy      SortOption
	SortOrder   SortOrder
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

type Storage interface {
	List(ctx context.Context, key string, options ListOptions) (ListResult, error)
	Get(ctx context.Context, key string) (io.ReadCloser, error)
	Put(ctx context.Context, key string, content io.Reader) error
	Delete(ctx context.Context, key string) error
	CreateFolder(ctx context.Context, folder string) error
	Stat(ctx context.Context, key string) (FileInfo, error)
}
