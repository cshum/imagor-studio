package s3storage

import (
	"bytes"
	"context"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/johannesboyne/gofakes3"
	"github.com/johannesboyne/gofakes3/backend/s3mem"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupFakeS3(t *testing.T) *S3Storage {
	backend := s3mem.New()
	faker := gofakes3.New(backend)
	ts := httptest.NewServer(faker.Server())

	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion("us-east-1"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider("YOUR-ACCESSKEYID", "YOUR-SECRETKEY", "")),
	)
	require.NoError(t, err)

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(ts.URL)
		o.UsePathStyle = true
	})

	s3Storage, err := New("test-bucket",
		WithRegion("us-east-1"),
		WithEndpoint(ts.URL),
		WithCredentials("YOUR-ACCESSKEYID", "YOUR-SECRETKEY", ""),
	)
	require.NoError(t, err)

	s3Storage.client = s3Client

	// Create the test bucket
	_, err = s3Client.CreateBucket(context.Background(), &s3.CreateBucketInput{
		Bucket: aws.String("test-bucket"),
	})
	require.NoError(t, err)

	return s3Storage
}

func TestS3Storage_Put(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	content := "Hello, World!"
	err := s3Storage.Put(ctx, "test.txt", bytes.NewReader([]byte(content)))
	assert.NoError(t, err)

	// Verify the file was uploaded
	result, err := s3Storage.Get(ctx, "test.txt")
	assert.NoError(t, err)
	defer result.Close()

	data, err := io.ReadAll(result)
	assert.NoError(t, err)
	assert.Equal(t, content, string(data))
}

func TestS3Storage_Get(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	// Upload a file
	content := "Hello, S3!"
	err := s3Storage.Put(ctx, "get_test.txt", bytes.NewReader([]byte(content)))
	require.NoError(t, err)

	// Get the file
	result, err := s3Storage.Get(ctx, "get_test.txt")
	assert.NoError(t, err)
	defer result.Close()

	data, err := io.ReadAll(result)
	assert.NoError(t, err)
	assert.Equal(t, content, string(data))
}

func TestS3Storage_Delete(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	// Upload a file
	err := s3Storage.Put(ctx, "delete_test.txt", bytes.NewReader([]byte("Delete me")))
	require.NoError(t, err)

	// Delete the file
	err = s3Storage.Delete(ctx, "delete_test.txt")
	assert.NoError(t, err)

	// Try to get the deleted file
	_, err = s3Storage.Get(ctx, "delete_test.txt")
	assert.Error(t, err)
}

func TestS3Storage_List(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	// Upload some files
	files := []string{"file1.txt", "file2.txt", "file3.txt"}
	for _, file := range files {
		err := s3Storage.Put(ctx, file, bytes.NewReader([]byte("content")))
		require.NoError(t, err)
	}

	// Create some folders
	folders := []string{"folder1", "folder2"}
	for _, folder := range folders {
		err := s3Storage.CreateFolder(ctx, folder)
		require.NoError(t, err)
	}

	// List all items
	result, err := s3Storage.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, len(files)+len(folders), result.TotalCount)
	assert.Len(t, result.Items, len(files)+len(folders))

	// Check file and folder names
	names := make([]string, len(result.Items))
	for i, item := range result.Items {
		names[i] = item.Name
	}
	expectedNames := append(files, "folder1", "folder2")
	assert.ElementsMatch(t, expectedNames, names)

	// Test listing only files
	filesResult, err := s3Storage.List(ctx, "", storage.ListOptions{OnlyFiles: true})
	assert.NoError(t, err)
	assert.Equal(t, len(files), filesResult.TotalCount)
	assert.Len(t, filesResult.Items, len(files))

	// Test listing only folders
	foldersResult, err := s3Storage.List(ctx, "", storage.ListOptions{OnlyFolders: true})
	assert.NoError(t, err)
	assert.Equal(t, len(folders), foldersResult.TotalCount)
	assert.Len(t, foldersResult.Items, len(folders))
}

func TestS3Storage_CreateFolder(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	err := s3Storage.CreateFolder(ctx, "test_folder")
	assert.NoError(t, err)

	// Verify the folder was created
	result, err := s3Storage.List(ctx, "", storage.ListOptions{OnlyFolders: true})
	assert.NoError(t, err)
	assert.Equal(t, 1, result.TotalCount)
	assert.Len(t, result.Items, 1)
	assert.Equal(t, "test_folder", result.Items[0].Name)
	assert.True(t, result.Items[0].IsDir)
}

func TestS3Storage_Stat(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	content := "Stat test content"
	err := s3Storage.Put(ctx, "stat_test.txt", bytes.NewReader([]byte(content)))
	require.NoError(t, err)

	info, err := s3Storage.Stat(ctx, "stat_test.txt")
	assert.NoError(t, err)
	assert.Equal(t, "stat_test.txt", info.Name)
	assert.Equal(t, int64(len(content)), info.Size)
	assert.False(t, info.IsDir)
	assert.WithinDuration(t, time.Now(), info.ModifiedTime, time.Second*5)
}

func TestS3Storage_ListWithOptions(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	// Upload files and create folders
	files := []string{"file1.txt", "file2.txt", "file3.txt"}
	folders := []string{"folder1", "folder2"}

	for _, file := range files {
		err := s3Storage.Put(ctx, file, bytes.NewReader([]byte("content")))
		require.NoError(t, err)
	}

	for _, folder := range folders {
		err := s3Storage.CreateFolder(ctx, folder)
		require.NoError(t, err)
	}

	// Test sorting by name descending
	result, err := s3Storage.List(ctx, "", storage.ListOptions{
		SortBy:    storage.SortByName,
		SortOrder: storage.SortOrderDesc,
	})
	assert.NoError(t, err)
	assert.Len(t, result.Items, len(files)+len(folders))
	assert.True(t, result.Items[0].Name > result.Items[1].Name)

	// Test pagination
	paginatedResult, err := s3Storage.List(ctx, "", storage.ListOptions{
		Offset: 1,
		Limit:  2,
	})
	assert.NoError(t, err)
	assert.Equal(t, len(files)+len(folders), paginatedResult.TotalCount) // Total count should still be all items
	assert.Len(t, paginatedResult.Items, 2)                              // But only 2 items returned

	// Test listing with a prefix
	err = s3Storage.Put(ctx, "subfolder/file4.txt", bytes.NewReader([]byte("content")))
	require.NoError(t, err)

	subfolderResult, err := s3Storage.List(ctx, "subfolder", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 1, subfolderResult.TotalCount)
	assert.Len(t, subfolderResult.Items, 1)
	assert.Equal(t, "file4.txt", subfolderResult.Items[0].Name)
}

func TestS3Storage_ListEmpty(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	result, err := s3Storage.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 0, result.TotalCount)
	assert.Len(t, result.Items, 0)
}

func TestS3Storage_PutInSubfolder(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	content := "Hello, Subfolder!"
	err := s3Storage.Put(ctx, "subfolder/test.txt", bytes.NewReader([]byte(content)))
	assert.NoError(t, err)

	// Verify the file was uploaded
	result, err := s3Storage.Get(ctx, "subfolder/test.txt")
	assert.NoError(t, err)
	defer result.Close()

	data, err := io.ReadAll(result)
	assert.NoError(t, err)
	assert.Equal(t, content, string(data))

	// List the subfolder
	listResult, err := s3Storage.List(ctx, "subfolder", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 1, listResult.TotalCount)
	assert.Len(t, listResult.Items, 1)
	assert.Equal(t, "test.txt", listResult.Items[0].Name)
}

func TestS3Storage_DeleteFolder(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	// Create a folder and put a file in it
	err := s3Storage.CreateFolder(ctx, "test_folder")
	require.NoError(t, err)
	err = s3Storage.Put(ctx, "test_folder/file.txt", bytes.NewReader([]byte("content")))
	require.NoError(t, err)

	// Delete the folder
	err = s3Storage.Delete(ctx, "test_folder")
	assert.NoError(t, err)

	// Verify the folder and its contents are gone
	result, err := s3Storage.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 0, result.TotalCount)
	assert.Len(t, result.Items, 0)
}

func TestS3Storage_StatNonExistent(t *testing.T) {
	s3Storage := setupFakeS3(t)
	ctx := context.Background()

	_, err := s3Storage.Stat(ctx, "non_existent.txt")
	assert.Error(t, err)
}

func TestS3Storage_ListWithBaseDir(t *testing.T) {
	// Setup S3 storage with a base directory
	backend := s3mem.New()
	faker := gofakes3.New(backend)
	ts := httptest.NewServer(faker.Server())

	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion("us-east-1"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider("YOUR-ACCESSKEYID", "YOUR-SECRETKEY", "")),
	)
	require.NoError(t, err)

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(ts.URL)
		o.UsePathStyle = true
	})

	s3Storage, err := New("test-bucket",
		WithRegion("us-east-1"),
		WithEndpoint(ts.URL),
		WithCredentials("YOUR-ACCESSKEYID", "YOUR-SECRETKEY", ""),
		WithBaseDir("base/dir"),
	)
	require.NoError(t, err)

	s3Storage.client = s3Client

	// Create the test bucket
	_, err = s3Client.CreateBucket(context.Background(), &s3.CreateBucketInput{
		Bucket: aws.String("test-bucket"),
	})
	require.NoError(t, err)

	ctx := context.Background()

	// Put a file in the base directory
	err = s3Storage.Put(ctx, "test.txt", bytes.NewReader([]byte("content")))
	require.NoError(t, err)

	// List files
	result, err := s3Storage.List(ctx, "", storage.ListOptions{})
	assert.NoError(t, err)
	assert.Equal(t, 1, result.TotalCount)
	assert.Len(t, result.Items, 1)
	assert.Equal(t, "test.txt", result.Items[0].Name)

	// Verify the full path of the file
	fullPathResult, err := s3Client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String("test-bucket"),
	})
	assert.NoError(t, err)
	assert.Len(t, fullPathResult.Contents, 1)
	assert.Equal(t, "base/dir/test.txt", *fullPathResult.Contents[0].Key)
}
