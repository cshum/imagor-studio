package storage

import (
	"context"
	"errors"
	"io"
)

var ErrInvalidStorageType = errors.New("invalid storage type")

type FileInfo struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	Size  int64  `json:"size"`
	IsDir bool   `json:"isDir"`
}

type ListResult struct {
	Items      []FileInfo `json:"items"`
	TotalCount int        `json:"totalCount"`
}

type Storage interface {
	List(ctx context.Context, path string, offset, limit int, onlyFiles, onlyFolders bool) (ListResult, error)
	Get(ctx context.Context, path string) (io.ReadCloser, error)
	Put(ctx context.Context, path string, content io.Reader) error
	Delete(ctx context.Context, path string) error
	CreateFolder(ctx context.Context, path string) error
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
