// Package spaceloader implements an imagor.Loader that resolves per-space
// image requests for the processing service.
package spaceloader

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/cloudruntime"
)

type SpaceS3Loader struct {
	store      cloudruntime.SpaceConfigReader
	baseDomain string
}

func New(store cloudruntime.SpaceConfigReader, baseDomain string) *SpaceS3Loader {
	return &SpaceS3Loader{store: store, baseDomain: baseDomain}
}

func (l *SpaceS3Loader) Get(r *http.Request, image string) (*imagor.Blob, error) {
	cfg, err := l.resolveSpace(r.Host)
	if err != nil {
		return nil, err
	}
	if cfg.IsSuspended() {
		return nil, fmt.Errorf("space %q is suspended", cfg.GetKey())
	}
	objectKey := cfg.GetPrefix() + image
	blob := imagor.NewBlob(func() (io.ReadCloser, int64, error) {
		client, err := buildS3Client(r.Context(), cfg)
		if err != nil {
			return nil, -1, fmt.Errorf("build S3 client for space %q: %w", cfg.GetKey(), err)
		}
		result, err := client.GetObject(r.Context(), &s3.GetObjectInput{
			Bucket: aws.String(cfg.GetBucket()),
			Key:    aws.String(objectKey),
		})
		if err != nil {
			return nil, -1, err
		}
		return result.Body, aws.ToInt64(result.ContentLength), nil
	})
	return blob, blob.Err()
}

func (l *SpaceS3Loader) resolveSpace(host string) (cloudruntime.SpaceConfig, error) {
	if strings.HasSuffix(host, l.baseDomain) {
		spaceKey := strings.TrimSuffix(host, l.baseDomain)
		cfg, ok := l.store.Get(spaceKey)
		if !ok {
			return nil, fmt.Errorf("space not found: %q", spaceKey)
		}
		return cfg, nil
	}
	cfg, ok := l.store.GetByHostname(host)
	if !ok {
		return nil, fmt.Errorf("no space found for domain %q", host)
	}
	return cfg, nil
}

func buildS3Client(ctx context.Context, cfg cloudruntime.SpaceConfig) (*s3.Client, error) {
	var loadOpts []func(*awsconfig.LoadOptions) error
	if cfg.GetRegion() != "" {
		loadOpts = append(loadOpts, awsconfig.WithRegion(cfg.GetRegion()))
	}
	if cfg.GetAccessKeyID() != "" && cfg.GetSecretKey() != "" {
		loadOpts = append(loadOpts,
			awsconfig.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(cfg.GetAccessKeyID(), cfg.GetSecretKey(), ""),
			),
		)
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, loadOpts...)
	if err != nil {
		return nil, err
	}
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.GetEndpoint() != "" {
			o.BaseEndpoint = aws.String(cfg.GetEndpoint())
		}
		o.UsePathStyle = cfg.GetUsePathStyle()
	})
	return client, nil
}
