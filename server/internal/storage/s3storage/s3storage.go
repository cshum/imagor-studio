package s3storage

import (
	"context"
	"io"
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

func (s *S3Storage) List(ctx context.Context, path string, options storage.ListOptions) (storage.ListResult, error) {
	prefix := strings.TrimPrefix(path, "/")
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
	var totalCount int

	paginator := s3.NewListObjectsV2Paginator(s.client, params)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return storage.ListResult{}, err
		}

		if !options.OnlyFiles {
			for _, commonPrefix := range page.CommonPrefixes {
				folderName := strings.TrimPrefix(*commonPrefix.Prefix, prefix)
				folderName = strings.TrimSuffix(folderName, "/")
				items = append(items, storage.FileInfo{
					Name:  folderName,
					Path:  *commonPrefix.Prefix,
					IsDir: true,
				})
				totalCount++
			}
		}

		if !options.OnlyFolders {
			for _, object := range page.Contents {
				if strings.HasSuffix(*object.Key, "/") {
					continue
				}
				name := strings.TrimPrefix(*object.Key, prefix)
				items = append(items, storage.FileInfo{
					Name:         name,
					Path:         *object.Key,
					Size:         *object.Size,
					IsDir:        false,
					ModifiedTime: *object.LastModified,
					ETag:         strings.Trim(*object.ETag, "\""),
				})
				totalCount++
			}
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

	// Apply pagination
	start := options.Offset
	end := options.Offset + options.Limit
	if start >= len(items) {
		return storage.ListResult{TotalCount: totalCount}, nil
	}
	if end > len(items) {
		end = len(items)
	}

	return storage.ListResult{
		Items:      items[start:end],
		TotalCount: totalCount,
	}, nil
}

func (s *S3Storage) Get(ctx context.Context, path string) (io.ReadCloser, error) {
	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	})
	if err != nil {
		return nil, err
	}
	return result.Body, nil
}

func (s *S3Storage) Put(ctx context.Context, path string, content io.Reader) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
		Body:   content,
	})
	return err
}

func (s *S3Storage) CreateFolder(ctx context.Context, path string) error {
	if !strings.HasSuffix(path, "/") {
		path += "/"
	}
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
		Body:   strings.NewReader(""),
	})
	return err
}

func (s *S3Storage) Stat(ctx context.Context, path string) (storage.FileInfo, error) {
	result, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	})
	if err != nil {
		return storage.FileInfo{}, err
	}

	return storage.FileInfo{
		Name:         path[strings.LastIndex(path, "/")+1:],
		Path:         path,
		Size:         *result.ContentLength,
		IsDir:        strings.HasSuffix(path, "/"),
		ModifiedTime: *result.LastModified,
		ETag:         strings.Trim(*result.ETag, "\""),
	}, nil
}

func (s *S3Storage) Delete(ctx context.Context, path string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	})
	return err
}
