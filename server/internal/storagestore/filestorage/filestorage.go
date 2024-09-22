package filestorage

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"sort"

	"github.com/cshum/imagor-studio/server/internal/storagestore"
)

type FileStorage struct {
	baseDir         string
	dirPermissions  os.FileMode
	filePermissions os.FileMode
}

type Option func(*FileStorage)

func WithDirPermissions(perm os.FileMode) Option {
	return func(fs *FileStorage) {
		fs.dirPermissions = perm
	}
}

func WithFilePermissions(perm os.FileMode) Option {
	return func(fs *FileStorage) {
		fs.filePermissions = perm
	}
}

func New(baseDir string, options ...Option) (*FileStorage, error) {
	absBaseDir, err := filepath.Abs(baseDir)
	if err != nil {
		return nil, err
	}
	fs := &FileStorage{
		baseDir:         absBaseDir,
		dirPermissions:  0755, // Default directory permissions
		filePermissions: 0644, // Default file permissions
	}
	for _, option := range options {
		option(fs)
	}
	return fs, nil
}

func (fs *FileStorage) List(ctx context.Context, path string, options storagestore.ListOptions) (storagestore.ListResult, error) {
	fullPath := filepath.Join(fs.baseDir, path)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return storagestore.ListResult{}, err
	}

	var filteredEntries []os.DirEntry
	for _, entry := range entries {
		if (options.OnlyFiles && entry.IsDir()) || (options.OnlyFolders && !entry.IsDir()) {
			continue
		}
		filteredEntries = append(filteredEntries, entry)
	}

	totalCount := len(filteredEntries)

	// Sort the entries
	sort.Slice(filteredEntries, func(i, j int) bool {
		infoI, _ := filteredEntries[i].Info()
		infoJ, _ := filteredEntries[j].Info()
		switch options.SortBy {
		case storagestore.SortByName:
			if options.SortOrder == storagestore.SortOrderDesc {
				return filteredEntries[i].Name() > filteredEntries[j].Name()
			}
			return filteredEntries[i].Name() < filteredEntries[j].Name()
		case storagestore.SortBySize:
			if options.SortOrder == storagestore.SortOrderDesc {
				return infoI.Size() > infoJ.Size()
			}
			return infoI.Size() < infoJ.Size()
		case storagestore.SortByModifiedTime:
			if options.SortOrder == storagestore.SortOrderDesc {
				return infoI.ModTime().After(infoJ.ModTime())
			}
			return infoI.ModTime().Before(infoJ.ModTime())
		default:
			return filteredEntries[i].Name() < filteredEntries[j].Name()
		}
	})

	// Handle pagination
	start := options.Offset
	if start > len(filteredEntries) {
		start = len(filteredEntries)
	}
	end := len(filteredEntries)
	if options.Limit > 0 {
		end = start + options.Limit
		if end > len(filteredEntries) {
			end = len(filteredEntries)
		}
	}

	var items []storagestore.FileInfo
	for _, entry := range filteredEntries[start:end] {
		info, err := entry.Info()
		if err != nil {
			return storagestore.ListResult{}, err
		}

		items = append(items, storagestore.FileInfo{
			Name:         entry.Name(),
			Path:         filepath.Join(path, entry.Name()),
			Size:         info.Size(),
			IsDir:        entry.IsDir(),
			ModifiedTime: info.ModTime(),
		})
	}

	return storagestore.ListResult{
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
	if err := os.MkdirAll(dir, fs.dirPermissions); err != nil {
		return err
	}

	file, err := os.OpenFile(fullPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, fs.filePermissions)
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
	return os.MkdirAll(filepath.Join(fs.baseDir, path), fs.dirPermissions)
}

func (fs *FileStorage) Stat(ctx context.Context, path string) (storagestore.FileInfo, error) {
	fullPath := filepath.Join(fs.baseDir, path)
	info, err := os.Stat(fullPath)
	if err != nil {
		return storagestore.FileInfo{}, err
	}

	return storagestore.FileInfo{
		Name:         info.Name(),
		Path:         path,
		Size:         info.Size(),
		IsDir:        info.IsDir(),
		ModifiedTime: info.ModTime(),
	}, nil
}
