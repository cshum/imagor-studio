package storage

import (
	"context"
	"io"
	"sort"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Storage struct {
	client *s3.Client
	bucket string
}

func NewS3Storage(bucket, region, endpoint, accessKeyID, secretAccessKey, sessionToken string) (*S3Storage, error) {
	ctx := context.TODO()
	var cfg aws.Config
	var err error

	if accessKeyID != "" && secretAccessKey != "" {
		// Use provided credentials
		cfg, err = config.LoadDefaultConfig(ctx,
			config.WithRegion(region),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				accessKeyID,
				secretAccessKey,
				sessionToken,
			)),
		)
	} else {
		// Use default credential chain
		cfg, err = config.LoadDefaultConfig(ctx, config.WithRegion(region))
	}

	if err != nil {
		return nil, err
	}

	options := []func(*s3.Options){
		func(o *s3.Options) {
			if endpoint != "" {
				o.BaseEndpoint = aws.String(endpoint)
				o.UsePathStyle = true
			}
		},
	}

	client := s3.NewFromConfig(cfg, options...)

	return &S3Storage{
		client: client,
		bucket: bucket,
	}, nil
}

func (s *S3Storage) List(ctx context.Context, path string, options ListOptions) (ListResult, error) {
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

	// Set up sorting parameters
	switch options.SortBy {
	case SortByName:
		// S3 always sorts by key (name) in ascending order
		if options.SortOrder == SortOrderDesc {
			// For descending order, we'll need to reverse the results in memory
			params.MaxKeys = aws.Int32(1000) // Fetch more items to sort
		}
	case SortBySize:
		// S3 doesn't support sorting by size, we'll sort in memory
		params.MaxKeys = aws.Int32(1000)
	case SortByModifiedTime:
		// Use ListObjectsV2 for sorting by modified time
		return s.listObjectsV2(ctx, prefix, options)
	}

	var items []FileInfo
	var totalCount int

	paginator := s3.NewListObjectsV2Paginator(s.client, params)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return ListResult{}, err
		}

		if !options.OnlyFiles {
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

		if !options.OnlyFolders {
			for _, object := range page.Contents {
				if strings.HasSuffix(*object.Key, "/") {
					continue
				}
				name := strings.TrimPrefix(*object.Key, prefix)
				items = append(items, FileInfo{
					Name:         name,
					Path:         *object.Key,
					Size:         *object.Size, // Dereference the pointer
					IsDir:        false,
					ModifiedTime: *object.LastModified,
					ETag:         strings.Trim(*object.ETag, "\""),
				})
				totalCount++
			}
		}
	}

	// Sort items if necessary
	if options.SortBy == SortBySize || (options.SortBy == SortByName && options.SortOrder == SortOrderDesc) {
		sortItems(items, options.SortBy, options.SortOrder)
	}

	// Apply pagination
	start := options.Offset
	end := options.Offset + options.Limit
	if start >= len(items) {
		return ListResult{TotalCount: totalCount}, nil
	}
	if end > len(items) {
		end = len(items)
	}

	return ListResult{
		Items:      items[start:end],
		TotalCount: totalCount,
	}, nil
}

func (s *S3Storage) listObjectsV2(ctx context.Context, prefix string, options ListOptions) (ListResult, error) {
	params := &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucket),
		Prefix: aws.String(prefix),
	}

	if !options.OnlyFiles {
		params.Delimiter = aws.String("/")
	}

	var items []FileInfo
	var totalCount int

	paginator := s3.NewListObjectsV2Paginator(s.client, params)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return ListResult{}, err
		}

		if !options.OnlyFiles {
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

		if !options.OnlyFolders {
			for _, object := range page.Contents {
				if strings.HasSuffix(*object.Key, "/") {
					continue
				}
				name := strings.TrimPrefix(*object.Key, prefix)
				items = append(items, FileInfo{
					Name:         name,
					Path:         *object.Key,
					Size:         *object.Size, // Dereference the pointer
					IsDir:        false,
					ModifiedTime: *object.LastModified,
					ETag:         strings.Trim(*object.ETag, "\""),
				})
				totalCount++
			}
		}
	}

	// Sort items
	sortItems(items, options.SortBy, options.SortOrder)

	// Apply pagination
	start := options.Offset
	end := options.Offset + options.Limit
	if start >= len(items) {
		return ListResult{TotalCount: totalCount}, nil
	}
	if end > len(items) {
		end = len(items)
	}

	return ListResult{
		Items:      items[start:end],
		TotalCount: totalCount,
	}, nil
}

// ... (rest of the S3Storage methods remain the same)

func sortItems(items []FileInfo, sortBy SortOption, sortOrder SortOrder) {
	sort.Slice(items, func(i, j int) bool {
		switch sortBy {
		case SortByName:
			if sortOrder == SortOrderDesc {
				return items[i].Name > items[j].Name
			}
			return items[i].Name < items[j].Name
		case SortBySize:
			if sortOrder == SortOrderDesc {
				return items[i].Size > items[j].Size
			}
			return items[i].Size < items[j].Size
		case SortByModifiedTime:
			if sortOrder == SortOrderDesc {
				return items[i].ModifiedTime.After(items[j].ModifiedTime)
			}
			return items[i].ModifiedTime.Before(items[j].ModifiedTime)
		default:
			return items[i].Name < items[j].Name
		}
	})
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

func (s *S3Storage) Stat(ctx context.Context, path string) (FileInfo, error) {
	result, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	})
	if err != nil {
		return FileInfo{}, err
	}

	return FileInfo{
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
