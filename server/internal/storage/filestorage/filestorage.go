package filestorage

import (
	"context"
	"io"
	"os"
	"path/filepath"

	"github.com/cshum/imagor-studio/server/internal/storage"
	"go.uber.org/zap"
)

type FileStorage struct {
	baseDir         string
	mkdirPermission os.FileMode
	writePermission os.FileMode
	logger          *zap.Logger
}

type Option func(*FileStorage)

func WithMkdirPermission(perm os.FileMode) Option {
	return func(fs *FileStorage) {
		fs.mkdirPermission = perm
	}
}

func WithWritePermission(perm os.FileMode) Option {
	return func(fs *FileStorage) {
		fs.writePermission = perm
	}
}

func WithLogger(logger *zap.Logger) Option {
	return func(fs *FileStorage) {
		fs.logger = logger
	}
}

func New(baseDir string, options ...Option) (*FileStorage, error) {
	absBaseDir, err := filepath.Abs(baseDir)
	if err != nil {
		return nil, err
	}
	fs := &FileStorage{
		baseDir:         absBaseDir,
		mkdirPermission: 0755, // Default directory permissions
		writePermission: 0644, // Default file permissions
	}
	for _, option := range options {
		option(fs)
	}
	return fs, nil
}

func (fs *FileStorage) List(ctx context.Context, path string, options storage.ListOptions) (storage.ListResult, error) {
	fullPath := filepath.Join(fs.baseDir, path)

	// First, try to read the directory - fail fast if directory is not accessible
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return storage.ListResult{}, err
	}

	var filteredEntries []os.DirEntry
	var skippedCount int

	// Filter entries and handle individual file access errors gracefully
	for _, entry := range entries {
		// Try to check if we should include this file - this may require accessing file info
		// For basic name-based filtering, this should work even if the file is inaccessible
		if !storage.ShouldIncludeFile(entry.Name(), entry.IsDir(), options) {
			continue
		}

		// Try to get basic info to verify the entry is accessible
		_, err := entry.Info()
		if err != nil {
			// Individual file/directory is inaccessible - skip it and log
			if fs.logger != nil {
				fs.logger.Debug("Skipping inaccessible entry",
					zap.String("name", entry.Name()),
					zap.String("path", fullPath),
					zap.Error(err))
			}
			skippedCount++
			continue
		}

		filteredEntries = append(filteredEntries, entry)
	}

	// Log summary if files were skipped
	if skippedCount > 0 && fs.logger != nil {
		fs.logger.Debug("Skipped inaccessible entries during listing",
			zap.Int("count", skippedCount),
			zap.String("directory", fullPath))
	}

	totalCount := len(filteredEntries)

	// Convert filtered entries to FileInfo for sorting
	var allItems []storage.FileInfo
	for _, entry := range filteredEntries {
		info, err := entry.Info()
		if err != nil {
			// This should not happen since we already checked above, but handle gracefully
			if fs.logger != nil {
				fs.logger.Debug("Skipping entry that became inaccessible",
					zap.String("name", entry.Name()),
					zap.Error(err))
			}
			continue
		}

		allItems = append(allItems, storage.FileInfo{
			Name:         entry.Name(),
			Path:         filepath.Join(path, entry.Name()),
			Size:         info.Size(),
			IsDir:        entry.IsDir(),
			ModifiedTime: info.ModTime(),
		})
	}

	// Sort the items using common sorting function
	storage.SortFileInfos(allItems, options.SortBy, options.SortOrder)

	// Handle pagination
	start := options.Offset
	if start > len(allItems) {
		start = len(allItems)
	}
	end := len(allItems)
	if options.Limit > 0 {
		end = start + options.Limit
		if end > len(allItems) {
			end = len(allItems)
		}
	}

	items := allItems[start:end]

	return storage.ListResult{
		Items:      items,
		TotalCount: totalCount,
	}, nil
}

func (fs *FileStorage) Get(ctx context.Context, path string) (io.ReadCloser, error) {
	fullPath := filepath.Join(fs.baseDir, path)
	return os.Open(fullPath)
}

func (fs *FileStorage) Put(ctx context.Context, path string, content io.Reader) error {
	fullPath := filepath.Join(fs.baseDir, path)
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, fs.mkdirPermission); err != nil {
		return err
	}

	file, err := os.OpenFile(fullPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, fs.writePermission)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = io.Copy(file, content)
	return err
}

func (fs *FileStorage) Delete(ctx context.Context, path string) error {
	fullPath := filepath.Join(fs.baseDir, path)
	fileInfo, err := os.Stat(fullPath)
	if err != nil {
		return err
	}

	if fileInfo.IsDir() {
		// If it's a directory, remove all contents recursively
		return os.RemoveAll(fullPath)
	}

	// If it's a file, remove it directly
	return os.Remove(fullPath)
}

func (fs *FileStorage) CreateFolder(ctx context.Context, path string) error {
	return os.MkdirAll(filepath.Join(fs.baseDir, path), fs.mkdirPermission)
}

func (fs *FileStorage) Stat(ctx context.Context, path string) (storage.FileInfo, error) {
	fullPath := filepath.Join(fs.baseDir, path)
	info, err := os.Stat(fullPath)
	if err != nil {
		return storage.FileInfo{}, err
	}

	return storage.FileInfo{
		Name:         info.Name(),
		Path:         path,
		Size:         info.Size(),
		IsDir:        info.IsDir(),
		ModifiedTime: info.ModTime(),
	}, nil
}
