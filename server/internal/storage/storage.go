package storage

import (
	"context"
	"io"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type ListOptions struct {
	Offset      int
	Limit       int
	OnlyFiles   bool
	OnlyFolders bool
	Extensions  []string // file extensions to filter by (e.g., [".jpg", ".png"])
	ShowHidden  bool     // whether to show hidden files (default false)
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
	Copy(ctx context.Context, sourcePath string, destPath string) error
	Move(ctx context.Context, sourcePath string, destPath string) error
}

// Helper functions for common filtering logic

// MatchesExtensions checks if a filename matches any of the provided extensions
func MatchesExtensions(filename string, extensions []string) bool {
	if len(extensions) == 0 {
		return true // No filter means match all
	}

	fileExt := strings.ToLower(filepath.Ext(filename))
	for _, ext := range extensions {
		if strings.ToLower(strings.TrimSpace(ext)) == fileExt {
			return true
		}
	}
	return false
}

// IsHiddenFile checks if a filename/dirname starts with "."
func IsHiddenFile(name string) bool {
	return strings.HasPrefix(name, ".")
}

// ShouldIncludeFile determines if a file should be included based on ListOptions
func ShouldIncludeFile(name string, isDir bool, options ListOptions) bool {
	// Hidden files filter
	if !options.ShowHidden && IsHiddenFile(name) {
		return false
	}

	// Extension filter (only applies to files, not directories)
	if len(options.Extensions) > 0 && !isDir {
		if !MatchesExtensions(name, options.Extensions) {
			return false
		}
	}

	// Existing onlyFiles/onlyFolders logic
	if options.OnlyFiles && isDir {
		return false
	}
	if options.OnlyFolders && !isDir {
		return false
	}

	return true
}

// SortFileInfos sorts a slice of FileInfo based on the provided sort options
func SortFileInfos(items []FileInfo, sortBy SortOption, sortOrder SortOrder) {
	if sortBy == "" && sortOrder == "" {
		return
	}

	sort.Slice(items, func(i, j int) bool {
		switch sortBy {
		case SortByName:
			if sortOrder == SortOrderDesc {
				return items[i].Name > items[j].Name
			}
			return items[i].Name < items[j].Name
		case SortBySize:
			if sortOrder == SortOrderDesc {
				return items[i].Size > items[j].Size
			}
			return items[i].Size < items[j].Size
		case SortByModifiedTime:
			if sortOrder == SortOrderDesc {
				return items[i].ModifiedTime.After(items[j].ModifiedTime)
			}
			return items[i].ModifiedTime.Before(items[j].ModifiedTime)
		default:
			return items[i].Name < items[j].Name
		}
	})
}
