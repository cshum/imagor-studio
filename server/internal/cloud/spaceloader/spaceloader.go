// Package spaceloader implements an imagor.Loader that resolves per-space
// image requests for the processing service.
//
// Given an HTTP request whose Host header is either:
//   - a subdomain of the configured baseDomain (e.g. "acme.yoursaas.com")
//   - a custom domain registered to a space (e.g. "images.acme.com")
//
// SpaceS3Loader resolves the corresponding SpaceConfig from SpaceConfigStore,
// prepends the space's Prefix to the image path, and fetches the object from
// the space's S3-compatible bucket.
//
// The AWS s3.Client is created per-request (struct alloc only, ~microseconds).
// The underlying http.Client inside the AWS SDK pools TCP connections, so
// recreating the struct does not incur connection overhead.
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
	"github.com/cshum/imagor-studio/server/internal/cloudcontract"
)

// SpaceS3Loader implements imagor.Loader by routing each request to the
// correct space's S3 bucket based on the request Host header.
type SpaceS3Loader struct {
	store      cloudcontract.SpaceConfigReader
	baseDomain string // e.g. ".yoursaas.com" (note leading dot)
}

// New creates a SpaceS3Loader.
//
//   - store: the SpaceConfigStore to look up space credentials from
//   - baseDomain: the platform domain suffix, including the leading dot
//     (e.g. ".yoursaas.com"). Requests whose Host has this suffix are resolved
//     by stripping the suffix to get the space key.
func New(store cloudcontract.SpaceConfigReader, baseDomain string) *SpaceS3Loader {
	return &SpaceS3Loader{store: store, baseDomain: baseDomain}
}

// Get implements imagor.Loader.
//
// It resolves the space from r.Host, checks that the space is not suspended,
// then fetches cfg.Prefix+image from the space's S3 bucket.
func (l *SpaceS3Loader) Get(r *http.Request, image string) (*imagor.Blob, error) {
	cfg, err := l.resolveSpace(r.Host)
	if err != nil {
		return nil, err
	}
	if cfg.IsSuspended() {
		return nil, fmt.Errorf("space %q is suspended", cfg.GetKey())
	}

	// Combine the space's prefix with the requested image path.
	// Managed tier:  prefix="acme/",    image="photo.jpg" → key="acme/photo.jpg"
	// BYOB no prefix: prefix="",        image="photo.jpg" → key="photo.jpg"
	// BYOB subfolder: prefix="images/", image="photo.jpg" → key="images/photo.jpg"
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

// resolveSpace maps a Host header value to a SpaceConfig.
//
// Two routing modes:
//  1. Default domain — Host has the platform's baseDomain suffix:
//     "acme.yoursaas.com" → strip ".yoursaas.com" → space key "acme"
//  2. Custom domain — Host is looked up in the byDomain index:
//     "images.acme.com" → SpaceConfigStore.GetByHostname
func (l *SpaceS3Loader) resolveSpace(host string) (cloudcontract.SpaceConfig, error) {
	if strings.HasSuffix(host, l.baseDomain) {
		spaceKey := strings.TrimSuffix(host, l.baseDomain)
		cfg, ok := l.store.Get(spaceKey)
		if !ok {
			return nil, fmt.Errorf("space not found: %q", spaceKey)
		}
		return cfg, nil
	}
	// Custom domain path
	cfg, ok := l.store.GetByHostname(host)
	if !ok {
		return nil, fmt.Errorf("no space found for domain %q", host)
	}
	return cfg, nil
}

// buildS3Client creates an *s3.Client from the space's credentials.
//
// This is struct allocation only (~microseconds); the AWS SDK's internal
// http.Client pools TCP connections so no new connection is opened per call.
func buildS3Client(ctx context.Context, cfg cloudcontract.SpaceConfig) (*s3.Client, error) {
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
