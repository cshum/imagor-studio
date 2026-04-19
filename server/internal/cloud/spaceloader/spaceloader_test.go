package spaceloader_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cshum/imagor-studio/server/internal/cloud/spaceconfigstore"
	"github.com/cshum/imagor-studio/server/internal/cloud/spaceloader"
	"github.com/johannesboyne/gofakes3"
	"github.com/johannesboyne/gofakes3/backend/s3mem"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// -----------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------

// fakeS3 sets up a gofakes3-backed httptest server with a pre-created bucket.
// Returns the server URL, a seeding client, and a cleanup func.
func fakeS3(t *testing.T, bucket string) (serverURL string, seed *s3.Client, cleanup func()) {
	t.Helper()

	backend := s3mem.New()
	faker := gofakes3.New(backend)
	ts := httptest.NewServer(faker.Server())

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion("us-east-1"),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider("FAKE-KEY", "FAKE-SECRET", ""),
		),
	)
	require.NoError(t, err)

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(ts.URL)
		o.UsePathStyle = true // gofakes3 requires path-style
	})

	_, err = client.CreateBucket(context.Background(), &s3.CreateBucketInput{
		Bucket: aws.String(bucket),
	})
	require.NoError(t, err)

	return ts.URL, client, ts.Close
}

// putObject seeds an S3 object into gofakes3 for testing.
func putObject(t *testing.T, client *s3.Client, bucket, key string, data []byte) {
	t.Helper()
	_, err := client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
		Body:   bytes.NewReader(data),
	})
	require.NoError(t, err)
}

// newStoreWithConfigs creates a SpaceConfigStore pre-populated with the given
// SpaceConfigs by serving them from a one-shot mock management HTTP server.
func newStoreWithConfigs(t *testing.T, spaces []*spaceconfigstore.SpaceConfig) *spaceconfigstore.SpaceConfigStore {
	t.Helper()

	mgmt := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(spaceconfigstore.SpacesDeltaResponse{
			Spaces:     spaces,
			ServerTime: 1_000_000,
		})
	}))
	t.Cleanup(mgmt.Close)

	store := spaceconfigstore.New(mgmt.URL, "test-secret", zap.NewNop(),
		spaceconfigstore.WithHTTPClient(mgmt.Client()),
	)
	err := store.Start(context.Background())
	require.NoError(t, err)
	return store
}

// readBlob reads the full content of an imagor.Blob into a []byte.
// It calls blob.NewReader() which triggers the underlying lazy function (e.g. S3 GetObject).
func readBlob(t *testing.T, blob interface {
	NewReader() (io.ReadCloser, int64, error)
}) []byte {
	t.Helper()
	rc, _, err := blob.NewReader()
	require.NoError(t, err)
	defer rc.Close()
	data, err := io.ReadAll(rc)
	require.NoError(t, err)
	return data
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

// TestGet_SubdomainRouting verifies that a Host of "acme.yoursaas.com" resolves
// to the "acme" space and fetches the correct S3 object (with prefix applied).
func TestGet_SubdomainRouting(t *testing.T) {
	bucket := "shared-bucket"
	s3URL, seedClient, cleanupS3 := fakeS3(t, bucket)
	defer cleanupS3()

	imageData := []byte("fake-png-bytes")
	putObject(t, seedClient, bucket, "acme/photo.jpg", imageData)

	store := newStoreWithConfigs(t, []*spaceconfigstore.SpaceConfig{
		{
			Key:          "acme",
			Bucket:       bucket,
			Prefix:       "acme/",
			Region:       "us-east-1",
			Endpoint:     s3URL,
			AccessKeyID:  "FAKE-KEY",
			SecretKey:    "FAKE-SECRET",
			UsePathStyle: true,
		},
	})

	loader := spaceloader.New(store, ".yoursaas.com")

	req := httptest.NewRequest(http.MethodGet, "/photo.jpg", nil)
	req.Host = "acme.yoursaas.com"

	blob, err := loader.Get(req, "photo.jpg")
	require.NoError(t, err)
	require.NotNil(t, blob)

	assert.Equal(t, imageData, readBlob(t, blob))
}

// TestGet_CustomDomainRouting verifies that a Host matching a registered custom
// domain resolves to the correct space and fetches the right S3 object.
func TestGet_CustomDomainRouting(t *testing.T) {
	bucket := "shared-bucket"
	s3URL, seedClient, cleanupS3 := fakeS3(t, bucket)
	defer cleanupS3()

	imageData := []byte("widget-image-data")
	putObject(t, seedClient, bucket, "widget/banner.png", imageData)

	store := newStoreWithConfigs(t, []*spaceconfigstore.SpaceConfig{
		{
			Key:          "widget",
			Bucket:       bucket,
			Prefix:       "widget/",
			CustomDomain: "images.widget.com",
			Region:       "us-east-1",
			Endpoint:     s3URL,
			AccessKeyID:  "FAKE-KEY",
			SecretKey:    "FAKE-SECRET",
			UsePathStyle: true,
		},
	})

	loader := spaceloader.New(store, ".yoursaas.com")

	req := httptest.NewRequest(http.MethodGet, "/banner.png", nil)
	req.Host = "images.widget.com" // custom domain — not a subdomain of .yoursaas.com

	blob, err := loader.Get(req, "banner.png")
	require.NoError(t, err)
	require.NotNil(t, blob)

	assert.Equal(t, imageData, readBlob(t, blob))
}

// TestGet_PrefixApplied verifies that a space's Prefix is prepended when
// building the S3 object key — covering both managed tier and BYOB subfolder.
func TestGet_PrefixApplied(t *testing.T) {
	bucket := "byob-bucket"
	s3URL, seedClient, cleanupS3 := fakeS3(t, bucket)
	defer cleanupS3()

	imageData := []byte("byob-subfolder-image")
	// Object is stored at "media/logo.svg" (prefix="media/", image="logo.svg")
	putObject(t, seedClient, bucket, "media/logo.svg", imageData)

	store := newStoreWithConfigs(t, []*spaceconfigstore.SpaceConfig{
		{
			Key:          "byob",
			Bucket:       bucket,
			Prefix:       "media/",
			Region:       "us-east-1",
			Endpoint:     s3URL,
			AccessKeyID:  "FAKE-KEY",
			SecretKey:    "FAKE-SECRET",
			UsePathStyle: true,
		},
	})

	loader := spaceloader.New(store, ".yoursaas.com")

	req := httptest.NewRequest(http.MethodGet, "/logo.svg", nil)
	req.Host = "byob.yoursaas.com"

	blob, err := loader.Get(req, "logo.svg")
	require.NoError(t, err)
	require.NotNil(t, blob)

	assert.Equal(t, imageData, readBlob(t, blob))
}

// TestGet_NoPrefix verifies that a space with an empty prefix accesses the
// S3 object directly by image name (true BYOB with no path prefix).
func TestGet_NoPrefix(t *testing.T) {
	bucket := "byob-root"
	s3URL, seedClient, cleanupS3 := fakeS3(t, bucket)
	defer cleanupS3()

	imageData := []byte("root-image")
	putObject(t, seedClient, bucket, "photo.jpg", imageData) // no prefix

	store := newStoreWithConfigs(t, []*spaceconfigstore.SpaceConfig{
		{
			Key:          "rootspace",
			Bucket:       bucket,
			Prefix:       "", // no prefix
			Region:       "us-east-1",
			Endpoint:     s3URL,
			AccessKeyID:  "FAKE-KEY",
			SecretKey:    "FAKE-SECRET",
			UsePathStyle: true,
		},
	})

	loader := spaceloader.New(store, ".yoursaas.com")

	req := httptest.NewRequest(http.MethodGet, "/photo.jpg", nil)
	req.Host = "rootspace.yoursaas.com"

	blob, err := loader.Get(req, "photo.jpg")
	require.NoError(t, err)
	require.NotNil(t, blob)

	assert.Equal(t, imageData, readBlob(t, blob))
}

// TestGet_SuspendedSpace verifies that a suspended space returns an error
// immediately (before any S3 call) when Get is invoked.
func TestGet_SuspendedSpace(t *testing.T) {
	store := newStoreWithConfigs(t, []*spaceconfigstore.SpaceConfig{
		{Key: "suspended", Bucket: "b", Suspended: true},
	})
	loader := spaceloader.New(store, ".yoursaas.com")

	req := httptest.NewRequest(http.MethodGet, "/photo.jpg", nil)
	req.Host = "suspended.yoursaas.com"

	blob, err := loader.Get(req, "photo.jpg")
	assert.Error(t, err)
	assert.Nil(t, blob)
	assert.Contains(t, err.Error(), "suspended")
}

// TestGet_UnknownSubdomain verifies that an unregistered subdomain returns
// an error indicating the space was not found.
func TestGet_UnknownSubdomain(t *testing.T) {
	store := newStoreWithConfigs(t, []*spaceconfigstore.SpaceConfig{}) // empty store
	loader := spaceloader.New(store, ".yoursaas.com")

	req := httptest.NewRequest(http.MethodGet, "/photo.jpg", nil)
	req.Host = "unknown.yoursaas.com"

	_, err := loader.Get(req, "photo.jpg")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "space not found")
}

// TestGet_UnknownCustomDomain verifies that an unregistered custom domain
// returns an error indicating no space was found for that domain.
func TestGet_UnknownCustomDomain(t *testing.T) {
	store := newStoreWithConfigs(t, []*spaceconfigstore.SpaceConfig{}) // empty store
	loader := spaceloader.New(store, ".yoursaas.com")

	req := httptest.NewRequest(http.MethodGet, "/photo.jpg", nil)
	req.Host = "unknown.example.com" // not a subdomain of .yoursaas.com

	_, err := loader.Get(req, "photo.jpg")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no space found")
}

// TestGet_S3ObjectNotFound verifies that when the S3 object does not exist,
// the error surfaces when reading the blob (lazy evaluation).
func TestGet_S3ObjectNotFound(t *testing.T) {
	bucket := "shared-bucket"
	s3URL, _, cleanupS3 := fakeS3(t, bucket)
	defer cleanupS3()
	// intentionally NOT seeding any object

	store := newStoreWithConfigs(t, []*spaceconfigstore.SpaceConfig{
		{
			Key:          "acme",
			Bucket:       bucket,
			Prefix:       "acme/",
			Region:       "us-east-1",
			Endpoint:     s3URL,
			AccessKeyID:  "FAKE-KEY",
			SecretKey:    "FAKE-SECRET",
			UsePathStyle: true,
		},
	})
	loader := spaceloader.New(store, ".yoursaas.com")

	req := httptest.NewRequest(http.MethodGet, "/missing.jpg", nil)
	req.Host = "acme.yoursaas.com"

	blob, err := loader.Get(req, "missing.jpg")
	// imagor.NewBlob may evaluate the underlying function eagerly (surfacing the
	// S3 error via blob.Err() which loader.Get returns) or lazily (surfacing it
	// only via blob.NewReader()).  Either way an error must be returned.
	if err == nil {
		require.NotNil(t, blob)
		rc, _, readErr := blob.NewReader()
		err = readErr
		if rc != nil {
			rc.Close()
		}
	}
	assert.Error(t, err, "expected an S3 NoSuchKey error for a missing object")
}
