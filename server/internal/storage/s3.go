package storage

import (
	"context"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Storage struct {
	client *s3.Client
	bucket string
}

func NewS3Storage(bucket, region string) (*S3Storage, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(cfg)
	return &S3Storage{client: client, bucket: bucket}, nil
}

func (s *S3Storage) List(ctx context.Context, path string, offset, limit int, onlyFiles, onlyFolders bool) (ListResult, error) {
	prefix := strings.TrimPrefix(path, "/")
	if prefix != "" && !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}

	params := &s3.ListObjectsV2Input{
		Bucket:    aws.String(s.bucket),
		Prefix:    aws.String(prefix),
		Delimiter: aws.String("/"),
	}

	if onlyFiles {
		// For files only, we don't use a delimiter
		params.Delimiter = nil
	}

	var items []FileInfo
	var totalCount int

	paginator := s3.NewListObjectsV2Paginator(s.client, params)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return ListResult{}, err
		}

		if !onlyFiles {
			for _, commonPrefix := range page.CommonPrefixes {
				folderName := strings.TrimPrefix(*commonPrefix.Prefix, prefix)
				folderName = strings.TrimSuffix(folderName, "/")
				items = append(items, FileInfo{
					Name:  folderName,
					Path:  *commonPrefix.Prefix,
					IsDir: true,
				})
				totalCount++
			}
		}

		if !onlyFolders {
			for _, object := range page.Contents {
				if strings.HasSuffix(*object.Key, "/") {
					continue // Skip directory markers
				}
				name := strings.TrimPrefix(*object.Key, prefix)
				items = append(items, FileInfo{
					Name:  name,
					Path:  *object.Key,
					Size:  *object.Size,
					IsDir: false,
				})
				totalCount++
			}
		}
	}

	// Apply pagination
	if offset >= len(items) {
		return ListResult{TotalCount: totalCount}, nil
	}

	end := offset + limit
	if end > len(items) {
		end = len(items)
	}

	return ListResult{
		Items:      items[offset:end],
		TotalCount: totalCount,
	}, nil
}

func (s *S3Storage) Get(ctx context.Context, path string) (io.ReadCloser, error) {
	resp, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	})
	if err != nil {
		return nil, err
	}
	return resp.Body, nil
}

func (s *S3Storage) Put(ctx context.Context, path string, content io.Reader) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
		Body:   content,
	})
	return err
}

func (s *S3Storage) Delete(ctx context.Context, path string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
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
