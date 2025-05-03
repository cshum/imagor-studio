package filestorage

import (
	"bytes"
	"context"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestFileStorage(t *testing.T) (*FileStorage, string) {
	tempDir, err := os.MkdirTemp("", "filestorage_test")
	require.NoError(t, err)

	fs, err := New(tempDir)
	require.NoError(t, err)

	return fs, tempDir
}

func TestFileStorage_Put(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	content := "Hello, World!"
	err := fs.Put(ctx, "test.txt", bytes.NewReader([]byte(content)))
	assert.NoError(t, err)

	// Verify the file was uploaded
	result, err := fs.Get(ctx, "test.txt")
	assert.NoError(t, err)
	defer result.Close()

	data, err := io.ReadAll(result)
	assert.NoError(t, err)
	assert.Equal(t, content, string(data))
}

func TestFileStorage_Get(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Upload a file
	content := "Hello, File!"
	err := fs.Put(ctx, "get_test.txt", bytes.NewReader([]byte(content)))
	require.NoError(t, err)

	// Get the file
	result, err := fs.Get(ctx, "get_test.txt")
	assert.NoError(t, err)
	defer result.Close()

	data, err := io.ReadAll(result)
	assert.NoError(t, err)
	assert.Equal(t, content, string(data))
}

func TestFileStorage_Delete(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Upload a file
	err := fs.Put(ctx, "delete_test.txt", bytes.NewReader([]byte("Delete me")))
	require.NoError(t, err)

	// Delete the file
	err = fs.Delete(ctx, "delete_test.txt")
	assert.NoError(t, err)

	// Try to get the deleted file
	_, err = fs.Get(ctx, "delete_test.txt")
	assert.Error(t, err)
}

func TestFileStorage_List(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Upload some files
	files := []string{"file1.txt", "file2.txt", "file3.txt"}
	for _, file := range files {
		err := fs.Put(ctx, file, bytes.NewReader([]byte("content")))
		require.NoError(t, err)
	}

	// Create some folders
	folders := []string{"folder1", "folder2"}
	for _, folder := range folders {
		err := fs.CreateFolder(ctx, folder)
		require.NoError(t, err)
	}

	// List all items
	result, err := fs.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, len(files)+len(folders), result.TotalCount)
	assert.Len(t, result.Items, len(files)+len(folders))

	// Check file and folder names
	names := make([]string, len(result.Items))
	for i, item := range result.Items {
		names[i] = item.Name
	}
	expectedNames := append(files, folders...)
	assert.ElementsMatch(t, expectedNames, names)

	// Test listing only files
	filesResult, err := fs.List(ctx, "", storage.ListOptions{OnlyFiles: true})
	assert.NoError(t, err)
	assert.Equal(t, len(files), filesResult.TotalCount)
	assert.Len(t, filesResult.Items, len(files))

	// Test listing only folders
	foldersResult, err := fs.List(ctx, "", storage.ListOptions{OnlyFolders: true})
	assert.NoError(t, err)
	assert.Equal(t, len(folders), foldersResult.TotalCount)
	assert.Len(t, foldersResult.Items, len(folders))
}

func TestFileStorage_CreateFolder(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	err := fs.CreateFolder(ctx, "test_folder")
	assert.NoError(t, err)

	// Verify the folder was created
	result, err := fs.List(ctx, "", storage.ListOptions{OnlyFolders: true})
	assert.NoError(t, err)
	assert.Equal(t, 1, result.TotalCount)
	assert.Len(t, result.Items, 1)
	assert.Equal(t, "test_folder", result.Items[0].Name)
	assert.True(t, result.Items[0].IsDir)
}

func TestFileStorage_Stat(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	content := "Stat test content"
	err := fs.Put(ctx, "stat_test.txt", bytes.NewReader([]byte(content)))
	require.NoError(t, err)

	info, err := fs.Stat(ctx, "stat_test.txt")
	assert.NoError(t, err)
	assert.Equal(t, "stat_test.txt", info.Name)
	assert.Equal(t, int64(len(content)), info.Size)
	assert.False(t, info.IsDir)
	assert.WithinDuration(t, time.Now(), info.ModifiedTime, time.Second*5)
}

func TestFileStorage_ListWithOptions(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Upload files and create folders
	files := []string{"file1.txt", "file2.txt", "file3.txt"}
	folders := []string{"folder1", "folder2"}

	for _, file := range files {
		err := fs.Put(ctx, file, bytes.NewReader([]byte("content")))
		require.NoError(t, err)
	}

	for _, folder := range folders {
		err := fs.CreateFolder(ctx, folder)
		require.NoError(t, err)
	}

	// Test sorting by name descending
	result, err := fs.List(ctx, "", storage.ListOptions{
		SortBy:    storage.SortByName,
		SortOrder: storage.SortOrderDesc,
	})
	assert.NoError(t, err)
	assert.Len(t, result.Items, len(files)+len(folders))
	assert.True(t, result.Items[0].Name > result.Items[1].Name)

	// Test pagination
	paginatedResult, err := fs.List(ctx, "", storage.ListOptions{
		Offset: 1,
		Limit:  2,
	})
	assert.NoError(t, err)
	assert.Equal(t, len(files)+len(folders), paginatedResult.TotalCount) // Total count should still be all items
	assert.Len(t, paginatedResult.Items, 2)                              // But only 2 items returned

	// Test listing with a prefix
	err = fs.Put(ctx, "subfolder/file4.txt", bytes.NewReader([]byte("content")))
	require.NoError(t, err)

	subfolderResult, err := fs.List(ctx, "subfolder", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 1, subfolderResult.TotalCount)
	assert.Len(t, subfolderResult.Items, 1)
	assert.Equal(t, "file4.txt", subfolderResult.Items[0].Name)
}

func TestFileStorage_ListEmpty(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	result, err := fs.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 0, result.TotalCount)
	assert.Len(t, result.Items, 0)
}

func TestFileStorage_PutInSubfolder(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	content := "Hello, Subfolder!"
	err := fs.Put(ctx, "subfolder/test.txt", bytes.NewReader([]byte(content)))
	assert.NoError(t, err)

	// Verify the file was uploaded
	result, err := fs.Get(ctx, "subfolder/test.txt")
	assert.NoError(t, err)
	defer result.Close()

	data, err := io.ReadAll(result)
	assert.NoError(t, err)
	assert.Equal(t, content, string(data))

	// List the subfolder
	listResult, err := fs.List(ctx, "subfolder", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 1, listResult.TotalCount)
	assert.Len(t, listResult.Items, 1)
	assert.Equal(t, "test.txt", listResult.Items[0].Name)
}

func TestFileStorage_DeleteFolder(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Create a folder and put a file in it
	err := fs.CreateFolder(ctx, "test_folder")
	require.NoError(t, err)
	err = fs.Put(ctx, "test_folder/file.txt", bytes.NewReader([]byte("content")))
	require.NoError(t, err)

	// Delete the folder
	err = fs.Delete(ctx, "test_folder")
	assert.NoError(t, err)

	// Verify the folder and its contents are gone
	result, err := fs.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 0, result.TotalCount)
	assert.Len(t, result.Items, 0)
}

func TestFileStorage_StatNonExistent(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	_, err := fs.Stat(ctx, "non_existent.txt")
	assert.Error(t, err)
}

func TestFileStorage_ListWithBaseDir(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "filestorage_test_basedir")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	baseDir := filepath.Join(tempDir, "base", "dir")
	err = os.MkdirAll(baseDir, 0755)
	require.NoError(t, err)

	fs, err := New(tempDir, WithMkdirPermission(0755))
	require.NoError(t, err)

	ctx := context.Background()

	// Put a file in the base directory
	err = fs.Put(ctx, "base/dir/test.txt", bytes.NewReader([]byte("content")))
	require.NoError(t, err)

	// List files
	result, err := fs.List(ctx, "base/dir", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 1, result.TotalCount)
	assert.Len(t, result.Items, 1)
	assert.Equal(t, "test.txt", result.Items[0].Name)

	// Verify the full path of the file
	fullPath := filepath.Join(tempDir, "base", "dir", "test.txt")
	assert.FileExists(t, fullPath)
}
