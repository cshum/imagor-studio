package resolver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"path"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/johannesboyne/gofakes3"
	"github.com/johannesboyne/gofakes3/backend/s3mem"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestValidateStorageConfigInput_S3Storage_WithFakeS3(t *testing.T) {
	backend := s3mem.New()
	faker := gofakes3.New(backend)
	ts := httptest.NewServer(faker.Server())
	defer ts.Close()

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion("us-east-1"),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider("YOUR-ACCESSKEYID", "YOUR-SECRETKEY", "")),
	)
	require.NoError(t, err)

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(ts.URL)
		o.UsePathStyle = true
	})

	_, err = s3Client.CreateBucket(context.Background(), &s3.CreateBucketInput{Bucket: aws.String("test-bucket")})
	require.NoError(t, err)

	input := gql.StorageConfigInput{
		Type: gql.StorageTypeS3,
		S3Config: &gql.S3StorageInput{
			Bucket:          "test-bucket",
			Region:          stringPtr("us-east-1"),
			Endpoint:        stringPtr(ts.URL),
			ForcePathStyle:  boolPtrLocal(true),
			AccessKeyID:     stringPtr("YOUR-ACCESSKEYID"),
			SecretAccessKey: stringPtr("YOUR-SECRETKEY"),
			BaseDir:         stringPtr("images"),
		},
	}

	result := validateStorageConfigInput(context.Background(), input, zap.NewNop(), nil)

	assert.True(t, result.Success)
	assert.Equal(t, "Storage configuration test successful", result.Message)
	assert.Nil(t, result.Details)
}

func TestStorageUploadProbeFlow_WithFakeS3(t *testing.T) {
	backend := s3mem.New()
	faker := gofakes3.New(backend)
	ts := httptest.NewServer(faker.Server())
	defer ts.Close()

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion("us-east-1"),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider("YOUR-ACCESSKEYID", "YOUR-SECRETKEY", "")),
	)
	require.NoError(t, err)

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(ts.URL)
		o.UsePathStyle = true
	})

	_, err = s3Client.CreateBucket(context.Background(), &s3.CreateBucketInput{Bucket: aws.String("test-bucket")})
	require.NoError(t, err)

	input := gql.StorageConfigInput{
		Type: gql.StorageTypeS3,
		S3Config: &gql.S3StorageInput{
			Bucket:          "test-bucket",
			Region:          stringPtr("us-east-1"),
			Endpoint:        stringPtr(ts.URL),
			ForcePathStyle:  boolPtrLocal(true),
			AccessKeyID:     stringPtr("YOUR-ACCESSKEYID"),
			SecretAccessKey: stringPtr("YOUR-SECRETKEY"),
			BaseDir:         stringPtr("images"),
		},
	}

	logger := zap.NewNop()
	r := newTestResolver(NewMockStorageProvider(nil), nil, nil, nil, nil, nil, logger)
	ctx := createAdminContext("admin-user")

	probe, err := r.Mutation().BeginStorageUploadProbe(ctx, input, "text/plain", 2)
	require.NoError(t, err)
	require.NotNil(t, probe)
	assert.NotEmpty(t, probe.ProbePath)
	assert.NotEmpty(t, probe.UploadURL)

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPut, probe.UploadURL, strings.NewReader("ok"))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "text/plain")
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.GreaterOrEqual(t, resp.StatusCode, 200)
	assert.Less(t, resp.StatusCode, 300)

	result, err := r.Mutation().CompleteStorageUploadProbe(ctx, input, probe.ProbePath, "ok")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.True(t, result.Success)

	_, err = s3Client.HeadObject(context.Background(), &s3.HeadObjectInput{
		Bucket: aws.String("test-bucket"),
		Key:    aws.String(path.Join("images", probe.ProbePath)),
	})
	assert.Error(t, err)
}

func boolPtrLocal(value bool) *bool {
	return &value
}
