package storage

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"sort"
)

type FilesystemStorage struct {
	root string
}

func NewFilesystemStorage(root string) (*FilesystemStorage, error) {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	return &FilesystemStorage{root: absRoot}, nil
}

func (fs *FilesystemStorage) List(ctx context.Context, path string, offset, limit int, onlyFiles, onlyFolders bool) (ListResult, error) {
	fullPath := filepath.Join(fs.root, path)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return ListResult{}, err
	}

	var filteredEntries []os.DirEntry
	for _, entry := range entries {
		if (onlyFiles && entry.IsDir()) || (onlyFolders && !entry.IsDir()) {
			continue
		}
		filteredEntries = append(filteredEntries, entry)
	}

	totalCount := len(filteredEntries)

	sort.Slice(filteredEntries, func(i, j int) bool {
		return filteredEntries[i].Name() < filteredEntries[j].Name()
	})

	end := offset + limit
	if end > len(filteredEntries) {
		end = len(filteredEntries)
	}

	var items []FileInfo
	for _, entry := range filteredEntries[offset:end] {
		info, err := entry.Info()
		if err != nil {
			return ListResult{}, err
		}

		items = append(items, FileInfo{
			Name:  entry.Name(),
			Path:  filepath.Join(path, entry.Name()),
			Size:  info.Size(),
			IsDir: entry.IsDir(),
		})
	}

	return ListResult{
		Items:      items,
		TotalCount: totalCount,
	}, nil
}

func (fs *FilesystemStorage) Get(ctx context.Context, path string) (io.ReadCloser, error) {
	return os.Open(filepath.Join(fs.root, path))
}

func (fs *FilesystemStorage) Put(ctx context.Context, path string, content io.Reader) error {
	fullPath := filepath.Join(fs.root, path)
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	file, err := os.Create(fullPath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = io.Copy(file, content)
	return err
}

func (fs *FilesystemStorage) Delete(ctx context.Context, path string) error {
	return os.Remove(filepath.Join(fs.root, path))
}

func (fs *FilesystemStorage) CreateFolder(ctx context.Context, path string) error {
	return os.MkdirAll(filepath.Join(fs.root, path), 0755)
}
