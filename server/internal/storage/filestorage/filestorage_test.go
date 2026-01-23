package filestorage

import (
	"bytes"
	"context"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"
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

	// List the file
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

func TestFileStorage_ListWithPermissionErrors(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "filestorage_permission_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create a logger for testing
	logger := zaptest.NewLogger(t)

	fs, err := New(tempDir, WithLogger(logger))
	require.NoError(t, err)

	ctx := context.Background()

	// Create some accessible files
	accessibleFiles := []string{"file1.txt", "file2.txt"}
	for _, file := range accessibleFiles {
		err := fs.Put(ctx, file, bytes.NewReader([]byte("content")))
		require.NoError(t, err)
	}

	// Create a directory with restricted permissions (simulate inaccessible directory)
	restrictedDir := filepath.Join(tempDir, "restricted")
	err = os.Mkdir(restrictedDir, 0000) // No permissions
	require.NoError(t, err)

	// On some systems, we might still be able to access it as root/owner
	// So let's test the behavior regardless
	result, err := fs.List(ctx, "", storage.ListOptions{})

	// The list operation should succeed (not fail completely)
	assert.NoError(t, err)

	// We should get at least the accessible files
	assert.GreaterOrEqual(t, result.TotalCount, len(accessibleFiles))
	assert.GreaterOrEqual(t, len(result.Items), len(accessibleFiles))

	// Verify accessible files are included
	names := make([]string, len(result.Items))
	for i, item := range result.Items {
		names[i] = item.Name
	}

	for _, expectedFile := range accessibleFiles {
		assert.Contains(t, names, expectedFile)
	}

	// Restore permissions for cleanup
	os.Chmod(restrictedDir, 0755)
}

func TestFileStorage_ListDirectoryNotAccessible(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "filestorage_dir_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	logger := zaptest.NewLogger(t)
	fs, err := New(tempDir, WithLogger(logger))
	require.NoError(t, err)

	ctx := context.Background()

	// Try to list a non-existent directory - should fail fast
	_, err = fs.List(ctx, "non_existent_directory", storage.ListOptions{})
	assert.Error(t, err)
}

func TestFileStorage_ListWithLogger(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "filestorage_logger_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create a logger for testing
	logger := zaptest.NewLogger(t)

	fs, err := New(tempDir, WithLogger(logger))
	require.NoError(t, err)

	ctx := context.Background()

	// Create some files
	files := []string{"file1.txt", "file2.txt"}
	for _, file := range files {
		err := fs.Put(ctx, file, bytes.NewReader([]byte("content")))
		require.NoError(t, err)
	}

	// List files - should work normally with logger
	result, err := fs.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, len(files), result.TotalCount)
	assert.Len(t, result.Items, len(files))
}

func TestFileStorage_ListWithoutLogger(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "filestorage_no_logger_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create file storage without logger (nil logger)
	fs, err := New(tempDir)
	require.NoError(t, err)

	ctx := context.Background()

	// Create some files
	files := []string{"file1.txt", "file2.txt"}
	for _, file := range files {
		err := fs.Put(ctx, file, bytes.NewReader([]byte("content")))
		require.NoError(t, err)
	}

	// List files - should work normally even without logger
	result, err := fs.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, len(files), result.TotalCount)
	assert.Len(t, result.Items, len(files))
}

func TestFileStorage_ListEmptyDirectoryWithLogger(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "filestorage_empty_logger_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	logger := zaptest.NewLogger(t)
	fs, err := New(tempDir, WithLogger(logger))
	require.NoError(t, err)

	ctx := context.Background()

	// List empty directory - should work and return empty result
	result, err := fs.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 0, result.TotalCount)
	assert.Len(t, result.Items, 0)
}

func TestFileStorage_CopyFile(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Create a source file
	content := "Hello, Copy!"
	err := fs.Put(ctx, "source.txt", bytes.NewReader([]byte(content)))
	require.NoError(t, err)

	// Copy the file
	err = fs.Copy(ctx, "source.txt", "dest.txt")
	assert.NoError(t, err)

	// Verify both files exist
	sourceData, err := fs.Get(ctx, "source.txt")
	assert.NoError(t, err)
	defer sourceData.Close()
	sourceContent, _ := io.ReadAll(sourceData)
	assert.Equal(t, content, string(sourceContent))

	destData, err := fs.Get(ctx, "dest.txt")
	assert.NoError(t, err)
	defer destData.Close()
	destContent, _ := io.ReadAll(destData)
	assert.Equal(t, content, string(destContent))
}

func TestFileStorage_CopyFolder(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Create a source folder with files
	err := fs.CreateFolder(ctx, "source_folder")
	require.NoError(t, err)
	err = fs.Put(ctx, "source_folder/file1.txt", bytes.NewReader([]byte("content1")))
	require.NoError(t, err)
	err = fs.Put(ctx, "source_folder/file2.txt", bytes.NewReader([]byte("content2")))
	require.NoError(t, err)

	// Copy the folder
	err = fs.Copy(ctx, "source_folder", "dest_folder")
	assert.NoError(t, err)

	// Verify destination folder and files exist
	result, err := fs.List(ctx, "dest_folder", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 2, result.TotalCount)

	// Verify file contents
	file1Data, err := fs.Get(ctx, "dest_folder/file1.txt")
	assert.NoError(t, err)
	defer file1Data.Close()
	content1, _ := io.ReadAll(file1Data)
	assert.Equal(t, "content1", string(content1))
}

func TestFileStorage_CopyNonExistent(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Try to copy a non-existent file
	err := fs.Copy(ctx, "non_existent.txt", "dest.txt")
	assert.Error(t, err)
}

func TestFileStorage_CopyDestinationExists(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Create source and destination files
	err := fs.Put(ctx, "source.txt", bytes.NewReader([]byte("source")))
	require.NoError(t, err)
	err = fs.Put(ctx, "dest.txt", bytes.NewReader([]byte("dest")))
	require.NoError(t, err)

	// Try to copy when destination exists
	err = fs.Copy(ctx, "source.txt", "dest.txt")
	assert.ErrorIs(t, err, os.ErrExist)
}

func TestFileStorage_MoveFile(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Create a source file
	content := "Hello, Move!"
	err := fs.Put(ctx, "source.txt", bytes.NewReader([]byte(content)))
	require.NoError(t, err)

	// Move the file
	err = fs.Move(ctx, "source.txt", "dest.txt")
	assert.NoError(t, err)

	// Verify source no longer exists
	_, err = fs.Get(ctx, "source.txt")
	assert.Error(t, err)

	// Verify destination exists with correct content
	destData, err := fs.Get(ctx, "dest.txt")
	assert.NoError(t, err)
	defer destData.Close()
	destContent, _ := io.ReadAll(destData)
	assert.Equal(t, content, string(destContent))
}

func TestFileStorage_MoveFolder(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Create a source folder with files
	err := fs.CreateFolder(ctx, "source_folder")
	require.NoError(t, err)
	err = fs.Put(ctx, "source_folder/file1.txt", bytes.NewReader([]byte("content1")))
	require.NoError(t, err)
	err = fs.Put(ctx, "source_folder/file2.txt", bytes.NewReader([]byte("content2")))
	require.NoError(t, err)

	// Move the folder
	err = fs.Move(ctx, "source_folder", "dest_folder")
	assert.NoError(t, err)

	// Verify source folder no longer exists
	_, err = fs.List(ctx, "source_folder", storage.ListOptions{})
	assert.Error(t, err)

	// Verify destination folder and files exist
	result, err := fs.List(ctx, "dest_folder", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 2, result.TotalCount)
}

func TestFileStorage_MoveNonExistent(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Try to move a non-existent file
	err := fs.Move(ctx, "non_existent.txt", "dest.txt")
	assert.Error(t, err)
}

func TestFileStorage_MoveDestinationExists(t *testing.T) {
	fs, tempDir := setupTestFileStorage(t)
	defer os.RemoveAll(tempDir)
	ctx := context.Background()

	// Create source and destination files
	err := fs.Put(ctx, "source.txt", bytes.NewReader([]byte("source")))
	require.NoError(t, err)
	err = fs.Put(ctx, "dest.txt", bytes.NewReader([]byte("dest")))
	require.NoError(t, err)

	// Try to move when destination exists
	err = fs.Move(ctx, "source.txt", "dest.txt")
	assert.ErrorIs(t, err, os.ErrExist)
}
