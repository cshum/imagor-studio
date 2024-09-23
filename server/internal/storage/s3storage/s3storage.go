package s3storage

import (
	"context"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"io"
	"path"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
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
				o.UsePathStyle = true
			}
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
				if currentOffset >= options.Offset && (options.Limit <= 0 || len(items) < options.Limit) {
					relativePath := s.relativePath(*commonPrefix.Prefix)
					folderName := strings.TrimSuffix(relativePath, "/")
					items = append(items, storage.FileInfo{
						Name:  path.Base(folderName),
						Path:  relativePath,
						IsDir: true,
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
				if currentOffset >= options.Offset && (options.Limit <= 0 || len(items) < options.Limit) {
					relativePath := s.relativePath(*object.Key)
					items = append(items, storage.FileInfo{
						Name:         path.Base(relativePath),
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

	s.sortItems(items, options.SortBy, options.SortOrder)

	return storage.ListResult{
		Items:      items,
		TotalCount: totalCount,
	}, nil
}

func (s *S3Storage) sortItems(items []storage.FileInfo, sortBy storage.SortOption, sortOrder storage.SortOrder) {
	// Sort items
	sort.Slice(items, func(i, j int) bool {
		switch sortBy {
		case storage.SortByName:
			if sortOrder == storage.SortOrderDesc {
				return items[i].Name > items[j].Name
			}
			return items[i].Name < items[j].Name
		case storage.SortBySize:
			if sortOrder == storage.SortOrderDesc {
				return items[i].Size > items[j].Size
			}
			return items[i].Size < items[j].Size
		case storage.SortByModifiedTime:
			if sortOrder == storage.SortOrderDesc {
				return items[i].ModifiedTime.After(items[j].ModifiedTime)
			}
			return items[i].ModifiedTime.Before(items[j].ModifiedTime)
		default:
			return items[i].Name < items[j].Name
		}
	})
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
