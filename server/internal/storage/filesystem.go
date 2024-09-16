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

func (fs *FilesystemStorage) List(ctx context.Context, path string, options ListOptions) (ListResult, error) {
	fullPath := filepath.Join(fs.root, path)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return ListResult{}, err
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
		case SortByName:
			if options.SortOrder == SortOrderDesc {
				return filteredEntries[i].Name() > filteredEntries[j].Name()
			}
			return filteredEntries[i].Name() < filteredEntries[j].Name()
		case SortBySize:
			if options.SortOrder == SortOrderDesc {
				return infoI.Size() > infoJ.Size()
			}
			return infoI.Size() < infoJ.Size()
		case SortByModifiedTime:
			if options.SortOrder == SortOrderDesc {
				return infoI.ModTime().After(infoJ.ModTime())
			}
			return infoI.ModTime().Before(infoJ.ModTime())
		default:
			return filteredEntries[i].Name() < filteredEntries[j].Name()
		}
	})

	end := options.Offset + options.Limit
	if end > len(filteredEntries) {
		end = len(filteredEntries)
	}

	var items []FileInfo
	for _, entry := range filteredEntries[options.Offset:end] {
		info, err := entry.Info()
		if err != nil {
			return ListResult{}, err
		}

		items = append(items, FileInfo{
			Name:         entry.Name(),
			Path:         filepath.Join(path, entry.Name()),
			Size:         info.Size(),
			IsDir:        entry.IsDir(),
			ModifiedTime: info.ModTime(),
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

func (fs *FilesystemStorage) Stat(ctx context.Context, path string) (FileInfo, error) {
	fullPath := filepath.Join(fs.root, path)
	info, err := os.Stat(fullPath)
	if err != nil {
		return FileInfo{}, err
	}

	return FileInfo{
		Name:         info.Name(),
		Path:         path,
		Size:         info.Size(),
		IsDir:        info.IsDir(),
		ModifiedTime: info.ModTime(),
	}, nil
}
