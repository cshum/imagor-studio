package s3storage

import (
	"context"
	"io"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/cshum/imagor-studio/server/internal/storage"
)

type S3Storage struct {
	client          *s3.Client
	bucket          string
	region          string
	endpoint        string
	accessKeyID     string
	secretAccessKey string
	sessionToken    string
	baseDir         string
	forcePathStyle  bool
}

var folderSuffix = "/"

type Option func(*S3Storage)

func WithRegion(region string) Option {
	return func(s *S3Storage) {
		s.region = region
	}
}

func WithEndpoint(endpoint string) Option {
	return func(s *S3Storage) {
		s.endpoint = endpoint
	}
}

func WithCredentials(accessKeyID, secretAccessKey, sessionToken string) Option {
	return func(s *S3Storage) {
		s.accessKeyID = accessKeyID
		s.secretAccessKey = secretAccessKey
		s.sessionToken = sessionToken
	}
}

func WithBaseDir(baseDir string) Option {
	return func(s *S3Storage) {
		s.baseDir = strings.Trim(baseDir, "/")
	}
}

func WithForcePathStyle(forcePathStyle bool) Option {
	return func(s *S3Storage) {
		s.forcePathStyle = forcePathStyle
	}
}

func New(bucket string, options ...Option) (*S3Storage, error) {
	s := &S3Storage{
		bucket: bucket,
	}

	for _, option := range options {
		option(s)
	}

	ctx := context.TODO()
	var cfg aws.Config
	var err error

	if s.accessKeyID != "" && s.secretAccessKey != "" {
		// Use provided credentials
		cfg, err = config.LoadDefaultConfig(ctx,
			config.WithRegion(s.region),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				s.accessKeyID,
				s.secretAccessKey,
				s.sessionToken,
			)),
		)
	} else {
		// Use default credential chain
		cfg, err = config.LoadDefaultConfig(ctx, config.WithRegion(s.region))
	}

	if err != nil {
		return nil, err
	}

	clientOpts := []func(*s3.Options){
		func(o *s3.Options) {
			if s.endpoint != "" {
				o.BaseEndpoint = aws.String(s.endpoint)
			}
			o.UsePathStyle = s.forcePathStyle
		},
	}

	s.client = s3.NewFromConfig(cfg, clientOpts...)

	return s, nil
}

func (s *S3Storage) fullPath(p string) string {
	return path.Join(s.baseDir, strings.TrimPrefix(p, "/"))
}

func (s *S3Storage) relativePath(p string) string {
	return strings.TrimPrefix(strings.TrimPrefix(p, s.baseDir), "/")
}

func (s *S3Storage) List(ctx context.Context, key string, options storage.ListOptions) (storage.ListResult, error) {
	prefix := s.fullPath(key)
	if prefix != "" && !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}

	params := &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucket),
		Prefix: aws.String(prefix),
	}

	if !options.OnlyFiles {
		params.Delimiter = aws.String("/")
	}

	var items []storage.FileInfo
	var totalCount int
	var currentOffset int

	paginator := s3.NewListObjectsV2Paginator(s.client, params)

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return storage.ListResult{}, err
		}

		// Process CommonPrefixes (folders)
		if !options.OnlyFiles {
			for _, commonPrefix := range page.CommonPrefixes {
				relativePath := s.relativePath(*commonPrefix.Prefix)
				folderName := strings.TrimSuffix(relativePath, "/")
				folderBaseName := path.Base(folderName)

				// Apply filtering
				if !storage.ShouldIncludeFile(folderBaseName, true, options) {
					continue
				}

				if currentOffset >= options.Offset && (options.Limit <= 0 || len(items) < options.Limit) {
					items = append(items, storage.FileInfo{
						Name:         folderBaseName,
						Path:         relativePath,
						IsDir:        true,
						ModifiedTime: time.Time{}, // S3 folders are virtual, no LastModified
					})
				}
				currentOffset++
				totalCount++
			}
		}

		// Process Contents (files)
		if !options.OnlyFolders {
			for _, object := range page.Contents {
				if strings.HasSuffix(*object.Key, folderSuffix) {
					continue // Skip directory placeholders
				}

				relativePath := s.relativePath(*object.Key)
				fileName := path.Base(relativePath)

				// Apply filtering
				if !storage.ShouldIncludeFile(fileName, false, options) {
					continue
				}

				if currentOffset >= options.Offset && (options.Limit <= 0 || len(items) < options.Limit) {
					items = append(items, storage.FileInfo{
						Name:         fileName,
						Path:         relativePath,
						Size:         *object.Size,
						IsDir:        false,
						ModifiedTime: *object.LastModified,
						ETag:         strings.Trim(*object.ETag, "\""),
					})
				}
				currentOffset++
				totalCount++
			}
		}

		// Break if we've collected enough items
		if options.Limit > 0 && len(items) >= options.Limit {
			break
		}
	}

	storage.SortFileInfos(items, options.SortBy, options.SortOrder)

	return storage.ListResult{
		Items:      items,
		TotalCount: totalCount,
	}, nil
}

func (s *S3Storage) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.fullPath(key)),
	})
	if err != nil {
		return nil, err
	}
	return result.Body, nil
}

func (s *S3Storage) Put(ctx context.Context, key string, content io.Reader) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.fullPath(key)),
		Body:   content,
	})
	return err
}

func (s *S3Storage) CreateFolder(ctx context.Context, folder string) error {
	fullPath := s.fullPath(folder)
	if !strings.HasSuffix(fullPath, "/") {
		fullPath += folderSuffix
	}
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(fullPath),
		Body:   strings.NewReader(""),
	})
	return err
}

func (s *S3Storage) Stat(ctx context.Context, key string) (storage.FileInfo, error) {
	result, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.fullPath(key)),
	})
	if err != nil {
		return storage.FileInfo{}, err
	}
	relativePath := s.relativePath(key)
	return storage.FileInfo{
		Name:         path.Base(relativePath),
		Path:         relativePath,
		Size:         *result.ContentLength,
		IsDir:        strings.HasSuffix(key, "/"),
		ModifiedTime: *result.LastModified,
		ETag:         strings.Trim(*result.ETag, "\""),
	}, nil
}

func (s *S3Storage) Delete(ctx context.Context, key string) error {
	fullPath := s.fullPath(key)

	// Check if the key is a folder
	if !strings.HasSuffix(fullPath, "/") {
		// If it's not explicitly a folder, check if it exists as one
		listResult, err := s.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket:  aws.String(s.bucket),
			Prefix:  aws.String(fullPath + "/"),
			MaxKeys: aws.Int32(1),
		})
		if err != nil {
			return err
		}
		if len(listResult.Contents) > 0 {
			// It's a folder, append slash
			fullPath += "/"
		}
	}

	if strings.HasSuffix(fullPath, "/") {
		// It's a folder, delete all objects inside
		err := s.deleteFolder(ctx, fullPath)
		if err != nil {
			return err
		}
	} else {
		// It's a file, delete single object
		_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(s.bucket),
			Key:    aws.String(fullPath),
		})
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *S3Storage) deleteFolder(ctx context.Context, prefix string) error {
	var continuationToken *string

	for {
		listObjectsInput := &s3.ListObjectsV2Input{
			Bucket: aws.String(s.bucket),
			Prefix: aws.String(prefix),
		}
		if continuationToken != nil {
			listObjectsInput.ContinuationToken = continuationToken
		}
		listResult, err := s.client.ListObjectsV2(ctx, listObjectsInput)
		if err != nil {
			return err
		}
		if len(listResult.Contents) == 0 {
			break
		}
		objectsToDelete := make([]types.ObjectIdentifier, len(listResult.Contents))
		for i, object := range listResult.Contents {
			objectsToDelete[i] = types.ObjectIdentifier{Key: object.Key}
		}
		_, err = s.client.DeleteObjects(ctx, &s3.DeleteObjectsInput{
			Bucket: aws.String(s.bucket),
			Delete: &types.Delete{Objects: objectsToDelete},
		})
		if err != nil {
			return err
		}
		if !*listResult.IsTruncated {
			break
		}
		continuationToken = listResult.NextContinuationToken
	}

	return nil
}

func (s *S3Storage) Copy(ctx context.Context, sourcePath string, destPath string) error {
	sourceFullPath := s.fullPath(sourcePath)
	destFullPath := s.fullPath(destPath)

	// Check if source exists
	_, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(sourceFullPath),
	})

	// If HeadObject fails, check if it's a folder
	isFolder := false
	if err != nil {
		// Check if it's a folder by listing objects with this prefix
		listResult, listErr := s.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket:  aws.String(s.bucket),
			Prefix:  aws.String(sourceFullPath + "/"),
			MaxKeys: aws.Int32(1),
		})
		if listErr != nil {
			return err // Return original error
		}
		if len(listResult.Contents) == 0 {
			return err // Source doesn't exist
		}
		isFolder = true
	}

	// Check if destination already exists (file or folder)
	_, err = s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(destFullPath),
	})
	if err == nil {
		return io.ErrClosedPipe // Use as "already exists" error
	}

	// Also check if destination exists as a folder
	listResult, err := s.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket:  aws.String(s.bucket),
		Prefix:  aws.String(destFullPath + "/"),
		MaxKeys: aws.Int32(1),
	})
	if err == nil && len(listResult.Contents) > 0 {
		return io.ErrClosedPipe // Destination folder exists
	}

	// Copy based on whether source is a file or folder
	if isFolder {
		return s.copyFolder(ctx, sourceFullPath+"/", destFullPath+"/")
	}

	// Copy single file
	return s.copyFile(ctx, sourceFullPath, destFullPath)
}

func (s *S3Storage) Move(ctx context.Context, sourcePath string, destPath string) error {
	// Copy to destination
	if err := s.Copy(ctx, sourcePath, destPath); err != nil {
		return err
	}

	// Delete source
	return s.Delete(ctx, sourcePath)
}

// copyFile copies a single S3 object
func (s *S3Storage) copyFile(ctx context.Context, sourceKey string, destKey string) error {
	copySource := s.bucket + "/" + sourceKey
	_, err := s.client.CopyObject(ctx, &s3.CopyObjectInput{
		Bucket:     aws.String(s.bucket),
		CopySource: aws.String(copySource),
		Key:        aws.String(destKey),
	})
	return err
}

// copyFolder recursively copies all objects with a given prefix
func (s *S3Storage) copyFolder(ctx context.Context, sourcePrefix string, destPrefix string) error {
	var continuationToken *string

	for {
		listObjectsInput := &s3.ListObjectsV2Input{
			Bucket: aws.String(s.bucket),
			Prefix: aws.String(sourcePrefix),
		}
		if continuationToken != nil {
			listObjectsInput.ContinuationToken = continuationToken
		}

		listResult, err := s.client.ListObjectsV2(ctx, listObjectsInput)
		if err != nil {
			return err
		}

		// Copy each object
		for _, object := range listResult.Contents {
			// Skip folder placeholders
			if strings.HasSuffix(*object.Key, folderSuffix) {
				continue
			}

			// Calculate destination key by replacing source prefix with dest prefix
			relativePath := strings.TrimPrefix(*object.Key, sourcePrefix)
			destKey := destPrefix + relativePath

			// Copy the object
			if err := s.copyFile(ctx, *object.Key, destKey); err != nil {
				return err
			}
		}

		if !*listResult.IsTruncated {
			break
		}
		continuationToken = listResult.NextContinuationToken
	}

	return nil
}
