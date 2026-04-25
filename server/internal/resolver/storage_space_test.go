package resolver

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/cshum/imagor-studio/server/pkg/space"
	storagepkg "github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"go.uber.org/zap"
)

// ptrStr is a local helper for taking the address of a string literal.
func ptrStr(s string) *string { return &s }

// newSpaceTestResolver builds a Resolver backed by a MockStorage / MockStorageProvider
// and the provided spaceStore.  All other dependencies (registry, users, imagor,
// config, license, org) are left nil — they are not exercised by the space-storage
// tests.
func newSpaceTestResolver(spaceStore space.SpaceStore) *Resolver {
	mockStor := &MockStorage{}
	sp := NewMockStorageProvider(mockStor)
	return NewResolver(sp, nil, nil, nil, nil, nil, zap.NewNop(), nil, spaceStore, nil, nil)
}

func newSpaceTestResolverWithCloudConfig(spaceStore space.SpaceStore, cloudConfig management.CloudConfig) *Resolver {
	mockStor := &MockStorage{}
	sp := NewMockStorageProvider(mockStor)
	return NewResolver(sp, nil, nil, nil, nil, nil, zap.NewNop(), nil, spaceStore, nil, nil, WithCloudConfig(cloudConfig))
}

func newSpaceTestResolverWithCloudConfigAndHostedStorage(spaceStore space.SpaceStore, cloudConfig management.CloudConfig, hostedStorageStore management.HostedStorageStore) *Resolver {
	mockStor := &MockStorage{}
	sp := NewMockStorageProvider(mockStor)
	return NewResolver(sp, nil, nil, nil, nil, nil, zap.NewNop(), nil, spaceStore, nil, nil, WithCloudConfig(cloudConfig), WithHostedStorageStore(hostedStorageStore))
}

func newSpaceTestResolverWithHostedStorageAndSpaceStorage(spaceStore space.SpaceStore, cloudConfig management.CloudConfig, hostedStorageStore management.HostedStorageStore, spaceStorage storagepkg.Storage) *Resolver {
	sp := NewMockStorageProvider(&MockStorage{})
	return NewResolver(
		sp,
		nil,
		nil,
		nil,
		nil,
		nil,
		zap.NewNop(),
		nil,
		spaceStore,
		nil,
		nil,
		WithCloudConfig(cloudConfig),
		WithHostedStorageStore(hostedStorageStore),
		WithSpaceStorageFactory(func(*space.Space) (storagepkg.Storage, error) {
			return spaceStorage, nil
		}),
	)
}

func newSpaceRegistryTestResolver(spaceStore space.SpaceStore, registryStore registrystore.Store, cfg *config.Config) (*Resolver, *MockStorage) {
	mockStor := &MockStorage{}
	sp := NewMockStorageProvider(mockStor)
	return NewResolver(sp, registryStore, nil, nil, cfg, nil, zap.NewNop(), nil, spaceStore, nil, nil), mockStor
}

// ─── getSpaceStorageByID unit tests ───────────────────────────────────────────

// TestGetSpaceStorage_NilSpaceID: nil id with active spaceStore → NOT_AVAILABLE error.
// In multi-tenant mode the root gallery has no system storage; callers must provide
// a spaceID. spaceStore.GetByID must never be called.
func TestGetSpaceStorage_NilSpaceID(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	r := newSpaceTestResolver(mockSpaceStore)

	stor, err := r.getSpaceStorageByID(context.Background(), nil)
	assert.Error(t, err)
	assert.Nil(t, stor)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected a gqlerror.Error")
	assert.Equal(t, "NOT_AVAILABLE", gqlErr.Extensions["code"])
	mockSpaceStore.AssertNotCalled(t, "GetByID")
}

// TestGetSpaceStorage_EmptySpaceID: empty-string id with active spaceStore → NOT_AVAILABLE error.
func TestGetSpaceStorage_EmptySpaceID(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	r := newSpaceTestResolver(mockSpaceStore)

	stor, err := r.getSpaceStorageByID(context.Background(), ptrStr(""))
	assert.Error(t, err)
	assert.Nil(t, stor)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected a gqlerror.Error")
	assert.Equal(t, "NOT_AVAILABLE", gqlErr.Extensions["code"])
	mockSpaceStore.AssertNotCalled(t, "GetByID")
}

// TestGetSpaceStorage_SpaceStoreNil: multi-tenancy disabled (spaceStore == nil)
// → transparent fallback even when a non-empty id is supplied.
func TestGetSpaceStorage_SpaceStoreNil(t *testing.T) {
	r := newSpaceTestResolver(nil)

	stor, err := r.getSpaceStorageByID(context.Background(), ptrStr("space-1"))
	assert.NoError(t, err)
	assert.NotNil(t, stor)
}

// TestGetSpaceStorage_NotFound: spaceStore returns (nil, nil) → NOT_FOUND gqlerror.
func TestGetSpaceStorage_NotFound(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").
		Return((*space.Space)(nil), nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorageByID(ctx, ptrStr("space-1"))
	assert.Nil(t, stor)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected a *gqlerror.Error")
	assert.Equal(t, "NOT_FOUND", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestGetSpaceStorage_OrgMismatch: space belongs to a different org → FORBIDDEN.
func TestGetSpaceStorage_OrgMismatch(t *testing.T) {
	space := &space.Space{
		ID:     "space-1",
		OrgID:  "org-b", // caller is in org-a
		Bucket: "the-bucket",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(space, nil)
	mockSpaceStore.On("HasMember", mock.Anything, "space-1", "user-1").Return(false, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorageByID(ctx, ptrStr("space-1"))
	assert.Nil(t, stor)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected a *gqlerror.Error")
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

func TestGetSpaceStorage_GuestMemberAllowed(t *testing.T) {
	space := &space.Space{
		ID:          "space-1",
		Key:         "space-1",
		OrgID:       "org-b",
		StorageType: "s3",
		Bucket:      "guest-bucket",
		Region:      "us-east-1",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(space, nil)
	mockSpaceStore.On("HasMember", mock.Anything, "space-1", "user-1").Return(true, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorageByID(ctx, ptrStr("space-1"))
	assert.NotNil(t, stor)
	assert.NoError(t, err)
	mockSpaceStore.AssertExpectations(t)
}

func TestGetSpaceStorage_PublicAccessAllowedForAuthenticatedNonMember(t *testing.T) {
	space := &space.Space{
		ID:          "space-1",
		Key:         "space-1",
		OrgID:       "org-b",
		StorageType: "s3",
		Bucket:      "public-bucket",
		Region:      "us-east-1",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockRegistryStore := &MockRegistryStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(space, nil)
	mockRegistryStore.On(
		"Get",
		mock.Anything,
		registrystore.SpaceOwnerID(space.ID),
		"config.allow_guest_mode",
	).Return(&registrystore.Registry{Key: "config.allow_guest_mode", Value: "true"}, nil)

	r, _ := newSpaceRegistryTestResolver(mockSpaceStore, mockRegistryStore, &config.Config{})
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorageByID(ctx, ptrStr("space-1"))
	assert.NotNil(t, stor)
	assert.NoError(t, err)
	mockSpaceStore.AssertExpectations(t)
	mockRegistryStore.AssertExpectations(t)
}

// TestGetSpaceStorage_Valid: matching org + valid bucket → non-nil S3 storage
// is constructed without any network call.
func TestGetSpaceStorage_Valid(t *testing.T) {
	space := &space.Space{
		OrgID:       "org-a",
		StorageType: "s3",
		Bucket:      "my-bucket",
		Region:      "us-east-1",
		Endpoint:    "https://s3.example.com",
		AccessKeyID: "AKIATEST",
		SecretKey:   "test-secret",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(space, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorageByID(ctx, ptrStr("space-1"))
	assert.NoError(t, err)
	assert.NotNil(t, stor) // S3 client built without network calls
	mockSpaceStore.AssertExpectations(t)
}

func TestGetSpaceStorage_PlatformManagedUsesCloudConfig(t *testing.T) {
	space := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(space, nil)

	r := newSpaceTestResolverWithCloudConfig(mockSpaceStore, management.CloudConfig{
		PlatformS3Bucket:       "platform-bucket",
		PlatformS3Region:       "auto",
		PlatformS3Endpoint:     "https://example.r2.cloudflarestorage.com",
		PlatformS3AccessKeyID:  "platform-ak",
		PlatformS3SecretKey:    "platform-sk",
		PlatformS3UsePathStyle: false,
		PlatformS3Prefix:       "spaces/{spaceID}",
	})
	ctx := createAdminContextWithOrg("user-1", "org-a")

	stor, err := r.getSpaceStorageByID(ctx, ptrStr("space-1"))
	assert.NoError(t, err)
	assert.NotNil(t, stor)
	mockSpaceStore.AssertExpectations(t)
}

func TestRequestUpload_PlatformManagedRecordsPendingHostedUpload(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockHostedStorage.On(
		"BeginPendingUpload",
		mock.Anything,
		"org-a",
		"space-123",
		"test.txt",
		mock.MatchedBy(func(expiresAt time.Time) bool { return !expiresAt.IsZero() }),
	).Return(nil).Once()

	r := newSpaceTestResolverWithCloudConfigAndHostedStorage(mockSpaceStore, management.CloudConfig{
		PlatformS3Bucket:       "platform-bucket",
		PlatformS3Region:       "auto",
		PlatformS3Endpoint:     "https://example.r2.cloudflarestorage.com",
		PlatformS3AccessKeyID:  "platform-ak",
		PlatformS3SecretKey:    "platform-sk",
		PlatformS3UsePathStyle: false,
		PlatformS3Prefix:       "spaces/{spaceID}",
	}, mockHostedStorage)

	ctx := createAdminContextWithOrg("user-1", "org-a")
	result, err := r.Mutation().RequestUpload(ctx, "test.txt", ptrStr("space-1"), "text/plain", 128)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotEmpty(t, result.UploadURL)
	mockSpaceStore.AssertExpectations(t)
	mockHostedStorage.AssertExpectations(t)
}

func TestRequestUpload_PlatformManagedUsesNoOverwritePresign(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockHostedStorage.On(
		"BeginPendingUpload",
		mock.Anything,
		"org-a",
		"space-123",
		"test.txt",
		mock.MatchedBy(func(expiresAt time.Time) bool { return !expiresAt.IsZero() }),
	).Return(nil).Once()
	mockSpaceStorage := &MockConditionalPresignableStorage{}
	mockSpaceStorage.On("PresignedPutURLNoOverwrite", mock.Anything, "test.txt", "text/plain", int64(128), hostedUploadIntentTTL).
		Return("https://example.com/upload", nil).Once()

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	result, err := r.Mutation().RequestUpload(ctx, "test.txt", ptrStr("space-1"), "text/plain", 128)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "https://example.com/upload", result.UploadURL)
	assert.Len(t, result.RequiredHeaders, 1)
	assert.Equal(t, uploadHeaderIfNoneMatch, result.RequiredHeaders[0].Name)
	assert.Equal(t, "*", result.RequiredHeaders[0].Value)
	mockSpaceStore.AssertExpectations(t)
	mockHostedStorage.AssertExpectations(t)
	mockSpaceStorage.AssertExpectations(t)
}

func TestUploadFile_PlatformManagedFinalizesHostedUpload(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockHostedStorage.On(
		"BeginPendingUpload",
		mock.Anything,
		"org-a",
		"space-123",
		"test.txt",
		mock.MatchedBy(func(expiresAt time.Time) bool { return !expiresAt.IsZero() }),
	).Return(nil).Once()
	mockHostedStorage.On("FinalizePendingUpload", mock.Anything, "space-123", "test.txt", int64(128)).Return(true, nil).Once()
	mockSpaceStorage := &MockStorage{}
	mockSpaceStorage.On("Stat", mock.Anything, "test.txt").Return(storagepkg.FileInfo{}, assert.AnError).Once()
	mockSpaceStorage.On("Put", mock.Anything, "test.txt", mock.Anything).Return(nil).Once()

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	upload := graphql.Upload{File: strings.NewReader("test content"), Filename: "test.txt", Size: 128}
	result, err := r.Mutation().UploadFile(ctx, "test.txt", ptrStr("space-1"), upload)

	assert.NoError(t, err)
	assert.True(t, result)
	mockSpaceStore.AssertExpectations(t)
	mockHostedStorage.AssertExpectations(t)
	mockSpaceStorage.AssertExpectations(t)
}

func TestUploadFile_PlatformManagedRejectsOverwrite(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockSpaceStorage := &MockStorage{}
	mockSpaceStorage.On("Stat", mock.Anything, "test.txt").Return(storagepkg.FileInfo{Path: "test.txt", Size: 128}, nil).Once()

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	upload := graphql.Upload{File: strings.NewReader("test content"), Filename: "test.txt", Size: 128}
	result, err := r.Mutation().UploadFile(ctx, "test.txt", ptrStr("space-1"), upload)

	assert.False(t, result)
	assert.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok)
	assert.Equal(t, apperror.ErrCodeFileAlreadyExists, gqlErr.Extensions["code"])
	mockHostedStorage.AssertNotCalled(t, "BeginPendingUpload", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	mockHostedStorage.AssertNotCalled(t, "FinalizePendingUpload", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	mockSpaceStorage.AssertNotCalled(t, "Put", mock.Anything, mock.Anything, mock.Anything)
	mockSpaceStore.AssertExpectations(t)
	mockSpaceStorage.AssertExpectations(t)
}

func TestCompleteUpload_PlatformManagedFinalizesHostedUpload(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockHostedStorage.On("FinalizePendingUpload", mock.Anything, "space-123", "test.txt", int64(128)).Return(true, nil).Once()
	mockSpaceStorage := &MockStorage{}
	mockSpaceStorage.On("Stat", mock.Anything, "test.txt").Return(storagepkg.FileInfo{Path: "test.txt", Size: 128}, nil).Once()

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	result, err := r.Mutation().CompleteUpload(ctx, "test.txt", ptrStr("space-1"))

	assert.NoError(t, err)
	assert.True(t, result)
	mockSpaceStore.AssertExpectations(t)
	mockHostedStorage.AssertExpectations(t)
	mockSpaceStorage.AssertExpectations(t)
}

func TestCompleteUpload_PlatformManagedIsIdempotent(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockHostedStorage.On("FinalizePendingUpload", mock.Anything, "space-123", "test.txt", int64(128)).Return(false, nil).Once()
	mockSpaceStorage := &MockStorage{}
	mockSpaceStorage.On("Stat", mock.Anything, "test.txt").Return(storagepkg.FileInfo{Path: "test.txt", Size: 128}, nil).Once()

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	result, err := r.Mutation().CompleteUpload(ctx, "test.txt", ptrStr("space-1"))

	assert.NoError(t, err)
	assert.True(t, result)
	mockSpaceStore.AssertExpectations(t)
	mockHostedStorage.AssertExpectations(t)
	mockSpaceStorage.AssertExpectations(t)
}

func TestCompleteUpload_BYOBSpaceNotAvailable(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModeBYOB,
		StorageType: "s3",
		Bucket:      "customer-bucket",
		Region:      "us-east-1",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockSpaceStorage := &MockStorage{}

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	result, err := r.Mutation().CompleteUpload(ctx, "test.txt", ptrStr("space-1"))

	assert.False(t, result)
	assert.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok)
	assert.Equal(t, "NOT_AVAILABLE", gqlErr.Extensions["code"])
	mockHostedStorage.AssertNotCalled(t, "FinalizePendingUpload", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	mockSpaceStorage.AssertNotCalled(t, "Stat", mock.Anything, mock.Anything)
	mockSpaceStore.AssertExpectations(t)
}

func TestDeleteFile_PlatformManagedDeletesHostedObject(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockHostedStorage.On("GetObject", mock.Anything, "space-123", "test.txt").Return(&management.HostedStorageObject{
		OrgID:     "org-a",
		SpaceID:   "space-123",
		ObjectKey: "test.txt",
		Status:    "ready",
		SizeBytes: 128,
	}, nil).Once()
	mockHostedStorage.On("DeleteReadyObject", mock.Anything, "space-123", "test.txt").Return(int64(128), nil).Once()
	mockSpaceStorage := &MockStorage{}
	mockSpaceStorage.On("Delete", mock.Anything, "test.txt").Return(nil).Once()

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	result, err := r.Mutation().DeleteFile(ctx, "test.txt", ptrStr("space-1"))

	assert.NoError(t, err)
	assert.True(t, result)
	mockSpaceStore.AssertExpectations(t)
	mockHostedStorage.AssertExpectations(t)
	mockSpaceStorage.AssertExpectations(t)
}

func TestDeleteFile_PlatformManagedUntrackedObjectSkipsHostedLedger(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockHostedStorage.On("GetObject", mock.Anything, "space-123", "test.txt").Return((*management.HostedStorageObject)(nil), nil).Once()
	mockSpaceStorage := &MockStorage{}
	mockSpaceStorage.On("Delete", mock.Anything, "test.txt").Return(nil).Once()

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	result, err := r.Mutation().DeleteFile(ctx, "test.txt", ptrStr("space-1"))

	assert.NoError(t, err)
	assert.True(t, result)
	mockHostedStorage.AssertNotCalled(t, "DeleteReadyObject", mock.Anything, mock.Anything, mock.Anything)
	mockSpaceStore.AssertExpectations(t)
	mockHostedStorage.AssertExpectations(t)
	mockSpaceStorage.AssertExpectations(t)
}

func TestCopyFile_PlatformManagedCopiesHostedObject(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockHostedStorage.On("GetObject", mock.Anything, "space-123", "source.txt").Return(&management.HostedStorageObject{
		OrgID:     "org-a",
		SpaceID:   "space-123",
		ObjectKey: "source.txt",
		Status:    "ready",
		SizeBytes: 128,
	}, nil).Once()
	mockHostedStorage.On("CopyReadyObject", mock.Anything, "space-123", "source.txt", "org-a", "space-123", "dest.txt").Return(int64(128), nil).Once()
	mockSpaceStorage := &MockStorage{}
	mockSpaceStorage.On("Copy", mock.Anything, "source.txt", "dest.txt").Return(nil).Once()

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	result, err := r.Mutation().CopyFile(ctx, "source.txt", "dest.txt", ptrStr("space-1"))

	assert.NoError(t, err)
	assert.True(t, result)
	mockSpaceStore.AssertExpectations(t)
	mockHostedStorage.AssertExpectations(t)
	mockSpaceStorage.AssertExpectations(t)
}

func TestMoveFile_PlatformManagedMovesHostedObjectWithoutCopyOrDelete(t *testing.T) {
	spaceRecord := &space.Space{
		ID:          "space-123",
		OrgID:       "org-a",
		StorageMode: space.StorageModePlatform,
		StorageType: "managed",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "space-1").Return(spaceRecord, nil)
	mockHostedStorage := &MockHostedStorageStore{}
	mockHostedStorage.On("GetObject", mock.Anything, "space-123", "source.txt").Return(&management.HostedStorageObject{
		OrgID:     "org-a",
		SpaceID:   "space-123",
		ObjectKey: "source.txt",
		Status:    "ready",
		SizeBytes: 128,
	}, nil).Once()
	mockHostedStorage.On("MoveReadyObject", mock.Anything, "space-123", "source.txt", "dest.txt").Return(nil).Once()
	mockSpaceStorage := &MockStorage{}
	mockSpaceStorage.On("Move", mock.Anything, "source.txt", "dest.txt").Return(nil).Once()

	r := newSpaceTestResolverWithHostedStorageAndSpaceStorage(mockSpaceStore, management.CloudConfig{}, mockHostedStorage, mockSpaceStorage)
	ctx := createAdminContextWithOrg("user-1", "org-a")
	result, err := r.Mutation().MoveFile(ctx, "source.txt", "dest.txt", ptrStr("space-1"))

	assert.NoError(t, err)
	assert.True(t, result)
	mockHostedStorage.AssertNotCalled(t, "CopyReadyObject", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	mockHostedStorage.AssertNotCalled(t, "DeleteReadyObject", mock.Anything, mock.Anything, mock.Anything)
	mockSpaceStore.AssertExpectations(t)
	mockHostedStorage.AssertExpectations(t)
	mockSpaceStorage.AssertExpectations(t)
}

func TestGetEffectiveVideoThumbnailPosition_UsesSpaceOverride(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	mockRegistryStore := &MockRegistryStore{}
	resolver, _ := newSpaceRegistryTestResolver(mockSpaceStore, mockRegistryStore, &config.Config{})

	spaceRecord := &space.Space{
		ID:    "space-id-1",
		Key:   "space-1",
		OrgID: "org-a",
	}

	mockRegistryStore.On(
		"GetMulti",
		mock.Anything,
		registrystore.SpaceOwnerID(spaceRecord.ID),
		[]string{"config.app_video_thumbnail_position"},
	).Return([]*registrystore.Registry{{
		Key:   "config.app_video_thumbnail_position",
		Value: "seek_3s",
	}}, nil).Once()

	position := (&queryResolver{resolver}).getEffectiveVideoThumbnailPosition(context.Background(), spaceRecord)

	assert.Equal(t, "seek_3s", position)
	mockRegistryStore.AssertExpectations(t)
}

// ─── ListFiles integration: auth error paths ─────────────────────────────────

// TestListFiles_SpaceIDNotFound: passing a spaceID that doesn't exist in the
// store propagates NOT_FOUND through the resolver.
func TestListFiles_SpaceIDNotFound(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "missing-space").
		Return((*space.Space)(nil), nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	result, err := r.Query().ListFiles(
		ctx, "some/path", ptrStr("missing-space"),
		nil, nil, nil, nil, nil, nil, nil, nil,
	)
	assert.Nil(t, result)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok)
	assert.Equal(t, "NOT_FOUND", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestListFiles_SpaceIDForbidden: passing a spaceID whose org doesn't match the
// caller's JWT org returns FORBIDDEN.
func TestListFiles_SpaceIDForbidden(t *testing.T) {
	space := &space.Space{
		ID:     "space-other",
		OrgID:  "org-b", // caller is in org-a
		Bucket: "b",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "other-space").Return(space, nil)
	mockSpaceStore.On("HasMember", mock.Anything, "space-other", "user-1").Return(false, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	result, err := r.Query().ListFiles(
		ctx, "some/path", ptrStr("other-space"),
		nil, nil, nil, nil, nil, nil, nil, nil,
	)
	assert.Nil(t, result)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok)
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestDeleteFile_SpaceIDForbidden: delete on a cross-org space also returns FORBIDDEN.
func TestDeleteFile_SpaceIDForbidden(t *testing.T) {
	space := &space.Space{
		ID:     "space-other",
		OrgID:  "org-b",
		Bucket: "b",
	}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "other-space").Return(space, nil)
	mockSpaceStore.On("HasMember", mock.Anything, "space-other", "user-1").Return(false, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	ok, err := r.Mutation().DeleteFile(ctx, "file.jpg", ptrStr("other-space"))
	assert.False(t, ok)
	assert.Error(t, err)

	gqlErr, isGql := err.(*gqlerror.Error)
	assert.True(t, isGql)
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// ─── SaveTemplate space-routing tests ────────────────────────────────────────

// minimalTemplateInput is a valid SaveTemplateInput for routing tests that only
// need to reach getSpaceStorage — the template JSON content and imagor provider
// are never exercised because getSpaceStorage returns an error first.
var minimalTemplateInput = gql.SaveTemplateInput{
	Name:            "My Template",
	DimensionMode:   gql.DimensionModeAdaptive,
	TemplateJSON:    `{"version":"1.0","transformations":{}}`,
	SourceImagePath: "test.jpg",
	SavePath:        "",
}

// TestSaveTemplate_SpaceIDNotFound: unknown space → NOT_FOUND gqlerror.
func TestSaveTemplate_SpaceIDNotFound(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "missing").
		Return((*space.Space)(nil), nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	result, err := r.Mutation().SaveTemplate(ctx, minimalTemplateInput, ptrStr("missing"))
	assert.Nil(t, result)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, "NOT_FOUND", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestSaveTemplate_SpaceIDForbidden: cross-org space → FORBIDDEN gqlerror.
func TestSaveTemplate_SpaceIDForbidden(t *testing.T) {
	space := &space.Space{ID: "space-other", OrgID: "org-b", Bucket: "b"}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "other-space").Return(space, nil)
	mockSpaceStore.On("HasMember", mock.Anything, "space-other", "user-1").Return(false, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	result, err := r.Mutation().SaveTemplate(ctx, minimalTemplateInput, ptrStr("other-space"))
	assert.Nil(t, result)
	assert.Error(t, err)

	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// ─── RegenerateTemplatePreview space-routing tests ───────────────────────────

// TestRegenerateTemplatePreview_SpaceIDNotFound: unknown space → NOT_FOUND.
func TestRegenerateTemplatePreview_SpaceIDNotFound(t *testing.T) {
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "missing").
		Return((*space.Space)(nil), nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	ok, err := r.Mutation().RegenerateTemplatePreview(
		ctx, "templates/My Template.imagor.json", ptrStr("missing"),
	)
	assert.False(t, ok)
	assert.Error(t, err)

	gqlErr, isGql := err.(*gqlerror.Error)
	assert.True(t, isGql, "expected *gqlerror.Error")
	assert.Equal(t, "NOT_FOUND", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}

// TestRegenerateTemplatePreview_SpaceIDForbidden: cross-org space → FORBIDDEN.
func TestRegenerateTemplatePreview_SpaceIDForbidden(t *testing.T) {
	space := &space.Space{ID: "space-other", OrgID: "org-b", Bucket: "b"}
	mockSpaceStore := &MockSpaceStore{}
	mockSpaceStore.On("GetByID", mock.Anything, "other-space").Return(space, nil)
	mockSpaceStore.On("HasMember", mock.Anything, "space-other", "user-1").Return(false, nil)

	r := newSpaceTestResolver(mockSpaceStore)
	ctx := createAdminContextWithOrg("user-1", "org-a")

	ok, err := r.Mutation().RegenerateTemplatePreview(
		ctx, "templates/My Template.imagor.json", ptrStr("other-space"),
	)
	assert.False(t, ok)
	assert.Error(t, err)

	gqlErr, isGql := err.(*gqlerror.Error)
	assert.True(t, isGql, "expected *gqlerror.Error")
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	mockSpaceStore.AssertExpectations(t)
}
