package resolver

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"path"
	"strings"
	"testing"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/cshum/imagor-studio/server/pkg/uuid"
	"github.com/johannesboyne/gofakes3"
	"github.com/johannesboyne/gofakes3/backend/s3mem"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"go.uber.org/zap"
)

type integrationHostedStorageObject struct {
	bun.BaseModel `bun:"table:hosted_storage_objects"`

	ID        string    `bun:"id,pk,type:text"`
	OrgID     string    `bun:"org_id,notnull"`
	SpaceID   string    `bun:"space_id,notnull"`
	ObjectKey string    `bun:"object_key,notnull"`
	Status    string    `bun:"status,notnull"`
	SizeBytes int64     `bun:"size_bytes,notnull,default:0"`
	CreatedAt time.Time `bun:"created_at,notnull"`
	UpdatedAt time.Time `bun:"updated_at,notnull"`
	ExpiresAt time.Time `bun:"expires_at,notnull"`
}

type integrationHostedStorageUsage struct {
	bun.BaseModel `bun:"table:hosted_storage_usage"`

	OrgID     string    `bun:"org_id,pk,type:text"`
	SpaceID   string    `bun:"space_id,pk,type:text"`
	UsedBytes int64     `bun:"used_bytes,notnull,default:0"`
	CreatedAt time.Time `bun:"created_at,notnull"`
	UpdatedAt time.Time `bun:"updated_at,notnull"`
}

type integrationHostedStorageStore struct {
	db *bun.DB
}

func newIntegrationHostedStorageStore(db *bun.DB) management.HostedStorageStore {
	return &integrationHostedStorageStore{db: db}
}

func (s *integrationHostedStorageStore) BeginPendingUpload(ctx context.Context, orgID, spaceID, objectKey string, expiresAt time.Time) error {
	now := time.Now().UTC()
	return s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var existing integrationHostedStorageObject
		err := tx.NewSelect().Model(&existing).Where("space_id = ? AND object_key = ?", spaceID, objectKey).Scan(ctx)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if errors.Is(err, sql.ErrNoRows) {
			_, err = tx.NewInsert().Model(&integrationHostedStorageObject{
				ID:        uuid.GenerateUUID(),
				OrgID:     orgID,
				SpaceID:   spaceID,
				ObjectKey: objectKey,
				Status:    "pending",
				SizeBytes: 0,
				CreatedAt: now,
				UpdatedAt: now,
				ExpiresAt: expiresAt,
			}).Exec(ctx)
			return err
		}
		_, err = tx.NewUpdate().Model((*integrationHostedStorageObject)(nil)).
			Set("org_id = ?", orgID).
			Set("status = ?", "pending").
			Set("expires_at = ?", expiresAt).
			Set("updated_at = ?", now).
			Where("space_id = ? AND object_key = ?", spaceID, objectKey).
			Exec(ctx)
		return err
	})
}

func (s *integrationHostedStorageStore) FinalizePendingUpload(ctx context.Context, spaceID, objectKey string, sizeBytes int64) (bool, error) {
	var incremented bool
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var existing integrationHostedStorageObject
		if err := tx.NewSelect().Model(&existing).Where("space_id = ? AND object_key = ?", spaceID, objectKey).Scan(ctx); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return errors.New("hosted object not found")
			}
			return err
		}

		if existing.Status == "ready" && existing.SizeBytes == sizeBytes {
			incremented = false
			return nil
		}

		delta := sizeBytes
		if existing.Status == "ready" {
			delta = sizeBytes - existing.SizeBytes
		}

		now := time.Now().UTC()
		if _, err := tx.NewUpdate().Model((*integrationHostedStorageObject)(nil)).
			Set("status = ?", "ready").
			Set("size_bytes = ?", sizeBytes).
			Set("updated_at = ?", now).
			Where("space_id = ? AND object_key = ?", spaceID, objectKey).
			Exec(ctx); err != nil {
			return err
		}

		if delta != 0 {
			if err := upsertIntegrationUsage(ctx, tx, existing.OrgID, spaceID, delta, now); err != nil {
				return err
			}
		}
		incremented = delta != 0
		return nil
	})
	return incremented, err
}

func (s *integrationHostedStorageStore) DeleteReadyObject(ctx context.Context, spaceID, objectKey string) (int64, error) {
	var removed int64
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var existing integrationHostedStorageObject
		if err := tx.NewSelect().Model(&existing).Where("space_id = ? AND object_key = ?", spaceID, objectKey).Scan(ctx); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				removed = 0
				return nil
			}
			return err
		}
		if existing.Status != "ready" {
			removed = 0
			return nil
		}
		if _, err := tx.NewDelete().Model((*integrationHostedStorageObject)(nil)).Where("space_id = ? AND object_key = ?", spaceID, objectKey).Exec(ctx); err != nil {
			return err
		}
		if err := upsertIntegrationUsage(ctx, tx, existing.OrgID, spaceID, -existing.SizeBytes, time.Now().UTC()); err != nil {
			return err
		}
		removed = existing.SizeBytes
		return nil
	})
	return removed, err
}

func (s *integrationHostedStorageStore) MoveReadyObject(ctx context.Context, spaceID, fromKey, toKey string) error {
	return s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var existing integrationHostedStorageObject
		if err := tx.NewSelect().Model(&existing).Where("space_id = ? AND object_key = ?", spaceID, fromKey).Scan(ctx); err != nil {
			return err
		}
		if existing.Status != "ready" {
			return errors.New("hosted object is not ready")
		}
		count, err := tx.NewSelect().Model((*integrationHostedStorageObject)(nil)).Where("space_id = ? AND object_key = ?", spaceID, toKey).Count(ctx)
		if err != nil {
			return err
		}
		if count > 0 {
			return errors.New("destination object already exists")
		}
		_, err = tx.NewUpdate().Model((*integrationHostedStorageObject)(nil)).
			Set("object_key = ?", toKey).
			Set("updated_at = ?", time.Now().UTC()).
			Where("space_id = ? AND object_key = ?", spaceID, fromKey).
			Exec(ctx)
		return err
	})
}

func (s *integrationHostedStorageStore) CopyReadyObject(ctx context.Context, sourceSpaceID, sourceKey, destOrgID, destSpaceID, destKey string) (int64, error) {
	var copiedSize int64
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var existing integrationHostedStorageObject
		if err := tx.NewSelect().Model(&existing).Where("space_id = ? AND object_key = ?", sourceSpaceID, sourceKey).Scan(ctx); err != nil {
			return err
		}
		count, err := tx.NewSelect().Model((*integrationHostedStorageObject)(nil)).Where("space_id = ? AND object_key = ?", destSpaceID, destKey).Count(ctx)
		if err != nil {
			return err
		}
		if count > 0 {
			return errors.New("destination object already exists")
		}
		now := time.Now().UTC()
		_, err = tx.NewInsert().Model(&integrationHostedStorageObject{
			ID:        uuid.GenerateUUID(),
			OrgID:     destOrgID,
			SpaceID:   destSpaceID,
			ObjectKey: destKey,
			Status:    "ready",
			SizeBytes: existing.SizeBytes,
			CreatedAt: now,
			UpdatedAt: now,
			ExpiresAt: now.Add(hostedUploadIntentTTL),
		}).Exec(ctx)
		if err != nil {
			return err
		}
		if err := upsertIntegrationUsage(ctx, tx, destOrgID, destSpaceID, existing.SizeBytes, now); err != nil {
			return err
		}
		copiedSize = existing.SizeBytes
		return nil
	})
	return copiedSize, err
}

func (s *integrationHostedStorageStore) GetObject(ctx context.Context, spaceID, objectKey string) (*management.HostedStorageObject, error) {
	var existing integrationHostedStorageObject
	if err := s.db.NewSelect().Model(&existing).Where("space_id = ? AND object_key = ?", spaceID, objectKey).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &management.HostedStorageObject{
		OrgID:     existing.OrgID,
		SpaceID:   existing.SpaceID,
		ObjectKey: existing.ObjectKey,
		Status:    existing.Status,
		SizeBytes: existing.SizeBytes,
		CreatedAt: existing.CreatedAt,
		UpdatedAt: existing.UpdatedAt,
		ExpiresAt: existing.ExpiresAt,
	}, nil
}

func (s *integrationHostedStorageStore) GetUsageBytes(ctx context.Context, orgID, spaceID string) (int64, error) {
	var usage integrationHostedStorageUsage
	if err := s.db.NewSelect().Model(&usage).Where("org_id = ? AND space_id = ?", orgID, spaceID).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return usage.UsedBytes, nil
}

func upsertIntegrationUsage(ctx context.Context, tx bun.Tx, orgID, spaceID string, delta int64, now time.Time) error {
	var usage integrationHostedStorageUsage
	err := tx.NewSelect().Model(&usage).Where("org_id = ? AND space_id = ?", orgID, spaceID).Scan(ctx)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		_, err = tx.NewInsert().Model(&integrationHostedStorageUsage{
			OrgID:     orgID,
			SpaceID:   spaceID,
			UsedBytes: delta,
			CreatedAt: now,
			UpdatedAt: now,
		}).Exec(ctx)
		return err
	}
	_, err = tx.NewUpdate().Model((*integrationHostedStorageUsage)(nil)).
		Set("used_bytes = ?", usage.UsedBytes+delta).
		Set("updated_at = ?", now).
		Where("org_id = ? AND space_id = ?", orgID, spaceID).
		Exec(ctx)
	return err
}

type integrationSpaceStore struct {
	db *bun.DB
}

func newIntegrationSpaceStore(db *bun.DB) space.SpaceStore {
	return &integrationSpaceStore{db: db}
}

func (s *integrationSpaceStore) Create(ctx context.Context, sp *space.Space) error {
	return errors.New("not implemented")
}
func (s *integrationSpaceStore) RenameKey(ctx context.Context, oldKey, newKey string) error {
	return errors.New("not implemented")
}
func (s *integrationSpaceStore) Upsert(ctx context.Context, sp *space.Space) error {
	return errors.New("not implemented")
}
func (s *integrationSpaceStore) SoftDelete(ctx context.Context, key string) error {
	return errors.New("not implemented")
}
func (s *integrationSpaceStore) GetByKey(ctx context.Context, key string) (*space.Space, error) {
	return nil, errors.New("not implemented")
}
func (s *integrationSpaceStore) GetByID(ctx context.Context, id string) (*space.Space, error) {
	var row model.Space
	if err := s.db.NewSelect().Model(&row).Where("id = ? AND deleted_at IS NULL", id).Scan(ctx); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &space.Space{
		ID:                   row.ID,
		OrgID:                row.OrgID,
		Key:                  row.Key,
		Name:                 row.Name,
		StorageMode:          row.StorageMode,
		StorageType:          row.StorageType,
		Bucket:               row.Bucket,
		Prefix:               row.Prefix,
		Region:               row.Region,
		Endpoint:             row.Endpoint,
		AccessKeyID:          row.AccessKeyID,
		SecretKey:            row.SecretKey,
		UsePathStyle:         row.UsePathStyle,
		CustomDomain:         row.CustomDomain,
		CustomDomainVerified: row.CustomDomainVerified,
		Suspended:            row.Suspended,
		IsShared:             row.IsShared,
		SignerAlgorithm:      row.SignerAlgorithm,
		SignerTruncate:       row.SignerTruncate,
		ImagorSecret:         row.ImagorSecret,
		ImagorCORSOrigins:    row.ImagorCORSOrigins,
		UpdatedAt:            row.UpdatedAt,
		DeletedAt:            row.DeletedAt,
	}, nil
}
func (s *integrationSpaceStore) List(ctx context.Context) ([]*space.Space, error) {
	return nil, errors.New("not implemented")
}
func (s *integrationSpaceStore) ListByOrgID(ctx context.Context, orgID string) ([]*space.Space, error) {
	return nil, errors.New("not implemented")
}
func (s *integrationSpaceStore) ListByMemberUserID(ctx context.Context, userID string) ([]*space.Space, error) {
	return nil, errors.New("not implemented")
}
func (s *integrationSpaceStore) Delta(ctx context.Context, since time.Time) (*space.DeltaResult, error) {
	return nil, errors.New("not implemented")
}
func (s *integrationSpaceStore) KeyExists(ctx context.Context, key string) (bool, error) {
	return false, errors.New("not implemented")
}
func (s *integrationSpaceStore) ListMembers(ctx context.Context, spaceID string) ([]*space.SpaceMemberView, error) {
	return nil, errors.New("not implemented")
}
func (s *integrationSpaceStore) AddMember(ctx context.Context, spaceID, userID, role string) error {
	return errors.New("not implemented")
}
func (s *integrationSpaceStore) RemoveMember(ctx context.Context, spaceID, userID string) error {
	return errors.New("not implemented")
}
func (s *integrationSpaceStore) UpdateMemberRole(ctx context.Context, spaceID, userID, role string) error {
	return errors.New("not implemented")
}
func (s *integrationSpaceStore) HasMember(ctx context.Context, spaceID, userID string) (bool, error) {
	return false, nil
}

func newHostedResolverIntegrationDB(t *testing.T) *bun.DB {
	t.Helper()
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqldb.Close() })

	db := bun.NewDB(sqldb, sqlitedialect.New())
	_, err = db.NewCreateTable().Model((*model.Space)(nil)).IfNotExists().Exec(context.Background())
	require.NoError(t, err)
	_, err = db.NewCreateTable().Model((*integrationHostedStorageObject)(nil)).IfNotExists().Exec(context.Background())
	require.NoError(t, err)
	_, err = db.NewCreateIndex().Model((*integrationHostedStorageObject)(nil)).Index("uidx_hosted_storage_objects_space_key").Unique().Column("space_id", "object_key").IfNotExists().Exec(context.Background())
	require.NoError(t, err)
	_, err = db.NewCreateTable().Model((*integrationHostedStorageUsage)(nil)).IfNotExists().Exec(context.Background())
	require.NoError(t, err)
	return db
}

func setupHostedResolverIntegration(t *testing.T) (*Resolver, management.HostedStorageStore, *s3.Client, string) {
	t.Helper()
	backend := s3mem.New()
	faker := gofakes3.New(backend)
	ts := httptest.NewServer(faker.Server())
	t.Cleanup(ts.Close)

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion("us-east-1"),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider("YOUR-ACCESSKEYID", "YOUR-SECRETKEY", "")),
	)
	require.NoError(t, err)

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(ts.URL)
		o.UsePathStyle = true
	})

	_, err = s3Client.CreateBucket(context.Background(), &s3.CreateBucketInput{Bucket: aws.String("platform-bucket")})
	require.NoError(t, err)

	db := newHostedResolverIntegrationDB(t)
	spaceID := "space-123"
	now := time.Now().UTC()
	_, err = db.NewInsert().Model(&model.Space{
		ID:              spaceID,
		OrgID:           "org-a",
		Key:             "space-123",
		Name:            "Integration Space",
		StorageMode:     space.StorageModePlatform,
		StorageType:     "managed",
		SignerAlgorithm: "sha256",
		SignerTruncate:  32,
		CreatedAt:       now,
		UpdatedAt:       now,
	}).Exec(context.Background())
	require.NoError(t, err)

	hostedStore := newIntegrationHostedStorageStore(db)
	resolver := NewResolver(
		NewMockStorageProvider(nil),
		nil,
		nil,
		nil,
		nil,
		nil,
		zap.NewNop(),
		nil,
		newIntegrationSpaceStore(db),
		nil,
		nil,
		WithCloudConfig(management.CloudConfig{
			PlatformS3Bucket:       "platform-bucket",
			PlatformS3Region:       "us-east-1",
			PlatformS3Endpoint:     ts.URL,
			PlatformS3AccessKeyID:  "YOUR-ACCESSKEYID",
			PlatformS3SecretKey:    "YOUR-SECRETKEY",
			PlatformS3UsePathStyle: true,
			PlatformS3Prefix:       "spaces/{spaceID}",
		}),
		WithHostedStorageStore(hostedStore),
	)

	return resolver, hostedStore, s3Client, spaceID
}

func TestHostedRequestUploadAndCompleteUpload_IntegrationFlow(t *testing.T) {
	r, hostedStore, s3Client, spaceID := setupHostedResolverIntegration(t)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	content := "integration upload"

	presign, err := r.Mutation().RequestUpload(ctx, "photos/test.txt", &spaceID, "text/plain", len(content))
	require.NoError(t, err)
	require.NotNil(t, presign)
	assert.Len(t, presign.RequiredHeaders, 1)
	assert.Equal(t, uploadHeaderIfNoneMatch, presign.RequiredHeaders[0].Name)
	assert.Equal(t, "*", presign.RequiredHeaders[0].Value)

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPut, presign.UploadURL, strings.NewReader(content))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "text/plain")
	for _, header := range presign.RequiredHeaders {
		req.Header.Set(header.Name, header.Value)
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.GreaterOrEqual(t, resp.StatusCode, 200)
	assert.Less(t, resp.StatusCode, 300)

	result, err := r.Mutation().CompleteUpload(ctx, "photos/test.txt", &spaceID)
	require.NoError(t, err)
	assert.True(t, result)

	readyObject, err := hostedStore.GetObject(ctx, spaceID, "photos/test.txt")
	require.NoError(t, err)
	require.NotNil(t, readyObject)
	assert.Equal(t, "ready", readyObject.Status)
	assert.Equal(t, int64(len(content)), readyObject.SizeBytes)

	usageBytes, err := hostedStore.GetUsageBytes(ctx, "org-a", spaceID)
	require.NoError(t, err)
	assert.Equal(t, int64(len(content)), usageBytes)

	_, err = s3Client.HeadObject(context.Background(), &s3.HeadObjectInput{
		Bucket: aws.String("platform-bucket"),
		Key:    aws.String(path.Join("spaces", spaceID, "photos/test.txt")),
	})
	require.NoError(t, err)

	result, err = r.Mutation().CompleteUpload(ctx, "photos/test.txt", &spaceID)
	require.NoError(t, err)
	assert.True(t, result)

	usageBytes, err = hostedStore.GetUsageBytes(ctx, "org-a", spaceID)
	require.NoError(t, err)
	assert.Equal(t, int64(len(content)), usageBytes)
}

func TestHostedUploadFile_IntegrationFlow(t *testing.T) {
	r, hostedStore, s3Client, spaceID := setupHostedResolverIntegration(t)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	content := "direct upload"

	result, err := r.Mutation().UploadFile(ctx, "photos/direct.txt", &spaceID, graphql.Upload{
		File:     strings.NewReader(content),
		Filename: "direct.txt",
		Size:     int64(len(content)),
	})
	require.NoError(t, err)
	assert.True(t, result)

	readyObject, err := hostedStore.GetObject(ctx, spaceID, "photos/direct.txt")
	require.NoError(t, err)
	require.NotNil(t, readyObject)
	assert.Equal(t, "ready", readyObject.Status)
	assert.Equal(t, int64(len(content)), readyObject.SizeBytes)

	usageBytes, err := hostedStore.GetUsageBytes(ctx, "org-a", spaceID)
	require.NoError(t, err)
	assert.Equal(t, int64(len(content)), usageBytes)

	_, err = s3Client.HeadObject(context.Background(), &s3.HeadObjectInput{
		Bucket: aws.String("platform-bucket"),
		Key:    aws.String(path.Join("spaces", spaceID, "photos/direct.txt")),
	})
	require.NoError(t, err)

	result, err = r.Mutation().UploadFile(ctx, "photos/direct.txt", &spaceID, graphql.Upload{
		File:     strings.NewReader("changed"),
		Filename: "direct.txt",
		Size:     int64(len("changed")),
	})
	assert.False(t, result)
	assert.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	require.True(t, ok)
	assert.Equal(t, apperror.ErrCodeFileAlreadyExists, gqlErr.Extensions["code"])

	usageBytes, err = hostedStore.GetUsageBytes(ctx, "org-a", spaceID)
	require.NoError(t, err)
	assert.Equal(t, int64(len(content)), usageBytes)
}
