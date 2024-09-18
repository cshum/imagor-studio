package filestorage

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileStorage(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "filestorage_test")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create a new FileStorage instance
	fs, err := New(tempDir)
	require.NoError(t, err)

	// Test context
	ctx := context.Background()

	// Test CreateFolder
	t.Run("CreateFolder", func(t *testing.T) {
		err := fs.CreateFolder(ctx, "test_folder")
		assert.NoError(t, err)
		assert.DirExists(t, filepath.Join(tempDir, "test_folder"))
	})

	// Test Put
	t.Run("Put", func(t *testing.T) {
		content := "Hello, World!"
		err := fs.Put(ctx, "test_file.txt", stringReader(content))
		assert.NoError(t, err)
		assert.FileExists(t, filepath.Join(tempDir, "test_file.txt"))
	})

	// Test Get
	t.Run("Get", func(t *testing.T) {
		reader, err := fs.Get(ctx, "test_file.txt")
		assert.NoError(t, err)
		defer reader.Close()

		content, err := io.ReadAll(reader)
		assert.NoError(t, err)
		assert.Equal(t, "Hello, World!", string(content))
	})

	// Test List
	t.Run("List", func(t *testing.T) {
		result, err := fs.List(ctx, "", storage.ListOptions{})
		assert.NoError(t, err)
		assert.Len(t, result.Items, 2) // test_folder and test_file.txt

		// Test sorting
		result, err = fs.List(ctx, "", storage.ListOptions{
			SortBy:    storage.SortByName,
			SortOrder: storage.SortOrderDesc,
		})
		assert.NoError(t, err)
		assert.Len(t, result.Items, 2)
		assert.Equal(t, "test_folder", result.Items[0].Name)
		assert.Equal(t, "test_file.txt", result.Items[1].Name)
	})

	// Test Stat
	t.Run("Stat", func(t *testing.T) {
		info, err := fs.Stat(ctx, "test_file.txt")
		assert.NoError(t, err)
		assert.Equal(t, "test_file.txt", info.Name)
		assert.Equal(t, int64(13), info.Size) // "Hello, World!" is 13 bytes
		assert.False(t, info.IsDir)
		assert.WithinDuration(t, time.Now(), info.ModifiedTime, time.Second*5)
	})

	// Test Delete
	t.Run("Delete", func(t *testing.T) {
		err := fs.Delete(ctx, "test_file.txt")
		assert.NoError(t, err)
		assert.NoFileExists(t, filepath.Join(tempDir, "test_file.txt"))
	})
}

func stringReader(s string) io.Reader {
	return strings.NewReader(s)
}
