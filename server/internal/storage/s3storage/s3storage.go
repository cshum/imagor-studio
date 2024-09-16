package s3storage

import (
	"context"
	"io"
	"path"
	"sort"
	"strconv"
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

func (s *S3Storage) List(ctx context.Context, path string, options storage.ListOptions) (storage.ListResult, error) {
	prefix := s.fullPath(path)
	if prefix != "" && !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}

	params := &s3.ListObjectsV2Input{
		Bucket:    aws.String(s.bucket),
		Prefix:    aws.String(prefix),
		Delimiter: aws.String("/"),
	}

	if options.OnlyFiles {
		params.Delimiter = nil
	}

	var items []storage.FileInfo
	var totalCount int64

	// First, get the total count
	countParams := *params
	countParams.MaxKeys = nil // Remove any limit to get all objects
	paginator := s3.NewListObjectsV2Paginator(s.client, &countParams)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return storage.ListResult{}, err
		}
		totalCount += int64(len(page.Contents))
		if !options.OnlyFiles {
			totalCount += int64(len(page.CommonPrefixes))
		}
	}

	// Now, get the actual items with pagination
	params.MaxKeys = aws.Int32(int32(options.Limit))
	if options.Offset > 0 {
		params.StartAfter = aws.String(s.fullPath(path) + strconv.Itoa(options.Offset))
	}

	result, err := s.client.ListObjectsV2(ctx, params)
	if err != nil {
		return storage.ListResult{}, err
	}

	if !options.OnlyFiles {
		for _, commonPrefix := range result.CommonPrefixes {
			folderName := s.relativePath(*commonPrefix.Prefix)
			folderName = strings.TrimSuffix(folderName, "/")
			items = append(items, storage.FileInfo{
				Name:  folderName,
				Path:  s.relativePath(*commonPrefix.Prefix),
				IsDir: true,
			})
		}
	}

	if !options.OnlyFolders {
		for _, object := range result.Contents {
			if strings.HasSuffix(*object.Key, "/") {
				continue
			}
			name := s.relativePath(*object.Key)
			items = append(items, storage.FileInfo{
				Name:         name,
				Path:         s.relativePath(*object.Key),
				Size:         *object.Size,
				IsDir:        false,
				ModifiedTime: *object.LastModified,
				ETag:         strings.Trim(*object.ETag, "\""),
			})
		}
	}

	// Sort items
	sort.Slice(items, func(i, j int) bool {
		switch options.SortBy {
		case storage.SortByName:
			if options.SortOrder == storage.SortOrderDesc {
				return items[i].Name > items[j].Name
			}
			return items[i].Name < items[j].Name
		case storage.SortBySize:
			if options.SortOrder == storage.SortOrderDesc {
				return items[i].Size > items[j].Size
			}
			return items[i].Size < items[j].Size
		case storage.SortByModifiedTime:
			if options.SortOrder == storage.SortOrderDesc {
				return items[i].ModifiedTime.After(items[j].ModifiedTime)
			}
			return items[i].ModifiedTime.Before(items[j].ModifiedTime)
		default:
			return items[i].Name < items[j].Name
		}
	})

	return storage.ListResult{
		Items:      items,
		TotalCount: int(totalCount),
	}, nil
}

func (s *S3Storage) Get(ctx context.Context, path string) (io.ReadCloser, error) {
	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.fullPath(path)),
	})
	if err != nil {
		return nil, err
	}
	return result.Body, nil
}

func (s *S3Storage) Put(ctx context.Context, path string, content io.Reader) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.fullPath(path)),
		Body:   content,
	})
	return err
}

func (s *S3Storage) CreateFolder(ctx context.Context, path string) error {
	fullPath := s.fullPath(path)
	if !strings.HasSuffix(fullPath, "/") {
		fullPath += "/"
	}
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(fullPath),
		Body:   strings.NewReader(""),
	})
	return err
}

func (s *S3Storage) Stat(ctx context.Context, path string) (storage.FileInfo, error) {
	result, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.fullPath(path)),
	})
	if err != nil {
		return storage.FileInfo{}, err
	}

	return storage.FileInfo{
		Name:         s.relativePath(path),
		Path:         s.relativePath(path),
		Size:         *result.ContentLength,
		IsDir:        strings.HasSuffix(path, "/"),
		ModifiedTime: *result.LastModified,
		ETag:         strings.Trim(*result.ETag, "\""),
	}, nil
}

func (s *S3Storage) Delete(ctx context.Context, path string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.fullPath(path)),
	})
	return err
}
