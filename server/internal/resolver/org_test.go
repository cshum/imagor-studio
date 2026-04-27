package resolver

import (
	"context"
	"testing"
	"time"

	"github.com/cshum/imagor-studio/server/internal/generated/gql"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor-studio/server/pkg/apperror"
	"github.com/cshum/imagor-studio/server/pkg/billing"
	"github.com/cshum/imagor-studio/server/pkg/management"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/vektah/gqlparser/v2/gqlerror"
	"go.uber.org/zap"
)

// ---------- helpers ----------------------------------------------------------

func makeTestOrg(id, ownerID string) *org.Org {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return &org.Org{
		ID:         id,
		OwnerID:    ownerID,
		Name:       "Test Org",
		Slug:       "test-org",
		Plan:       "starter",
		PlanStatus: "active",
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}

func makeTestSpace(key, orgID string) *space.Space {
	return &space.Space{
		ID:              "space-" + key,
		OrgID:           orgID,
		Key:             key,
		Name:            "Test Space",
		StorageType:     "s3",
		Bucket:          "my-bucket",
		Prefix:          "",
		Region:          "us-east-1",
		Endpoint:        "",
		UsePathStyle:    false,
		CustomDomain:    "",
		Suspended:       false,
		IsShared:        false,
		SignerAlgorithm: "sha256",
		SignerTruncate:  0,
		UpdatedAt:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

func newOrgResolver(orgStore *MockOrgStore, spaceStore *MockSpaceStore) *Resolver {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	return NewResolver(sp, nil, nil, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)
}

func newOrgResolverWithHostedStorage(orgStore *MockOrgStore, spaceStore *MockSpaceStore, hostedStorageStore *MockHostedStorageStore) *Resolver {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	return NewResolver(sp, nil, nil, nil, nil, nil, logger, orgStore, spaceStore, nil, nil, WithHostedStorageStore(hostedStorageStore))
}

func newOrgResolverWithUsageStores(orgStore *MockOrgStore, spaceStore *MockSpaceStore, hostedStorageStore *MockHostedStorageStore, processingUsageStore *MockProcessingUsageStore) *Resolver {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	return NewResolver(
		sp,
		nil,
		nil,
		nil,
		nil,
		nil,
		logger,
		orgStore,
		spaceStore,
		nil,
		nil,
		WithHostedStorageStore(hostedStorageStore),
		WithProcessingUsageStore(processingUsageStore),
	)
}

func newOrgResolverWithBilling(orgStore *MockOrgStore, spaceStore *MockSpaceStore, billingService *MockBillingService) *Resolver {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	return NewResolver(sp, nil, nil, nil, nil, nil, logger, orgStore, spaceStore, nil, nil, WithBillingService(billingService))
}

func newOrgResolverWithRegistry(orgStore *MockOrgStore, spaceStore *MockSpaceStore, registryStore *MockRegistryStore) *Resolver {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	return NewResolver(sp, registryStore, nil, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)
}

func newOrgResolverWithStorageValidator(orgStore *MockOrgStore, spaceStore *MockSpaceStore, validator StorageConfigValidator) *Resolver {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	return NewResolver(sp, nil, nil, nil, nil, nil, logger, orgStore, spaceStore, nil, nil, WithStorageConfigValidator(validator))
}

// ---------- MyOrganization ---------------------------------------------------

func TestMyOrganization_NilOrgStore(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, nil, nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().MyOrganization(ctx)
	require.NoError(t, err)
	assert.Nil(t, result)
}

func TestMyOrganization_ReturnsOrg(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	org := makeTestOrg("org-1", "user-1")
	orgStore.On("GetByID", mock.Anything, "org-1").Return(org, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().MyOrganization(ctx)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "org-1", result.ID)
	assert.Equal(t, "Test Org", result.Name)
	assert.Equal(t, "test-org", result.Slug)
	assert.Equal(t, "user-1", result.OwnerUserID)
	assert.Equal(t, "starter", result.Plan)
	assert.Equal(t, "active", result.PlanStatus)
	orgStore.AssertExpectations(t)
}

func TestMyOrganization_NoOrg(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().MyOrganization(ctx)
	require.NoError(t, err)
	assert.Nil(t, result)
	orgStore.AssertExpectations(t)
}

// ---------- Spaces -----------------------------------------------------------

func TestSpaces_NilSpaceStore(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, nil, nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	assert.Empty(t, result)
}

func TestSpaces_IncludesProcessingUsageForOwnOrgSpaces(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	hostedStorageStore := &MockHostedStorageStore{}
	processingUsageStore := &MockProcessingUsageStore{}
	r := newOrgResolverWithUsageStores(orgStore, spaceStore, hostedStorageStore, processingUsageStore)

	orgSpace := makeTestSpace("alpha", "org-1")
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{orgSpace}, nil)
	spaceStore.On("ListByMemberUserID", mock.Anything, "user-1").Return([]*space.Space{}, nil)
	hostedStorageStore.On("ListUsageBytesBySpace", mock.Anything, "org-1", []string{orgSpace.ID}).Return(map[string]int64{}, nil)
	processingUsageStore.On("GetCurrentUsageSummary", mock.Anything, "org-1").Return(&management.ProcessingUsageSummary{
		TotalProcessedCount: 45,
		ProcessedCountBySpace: map[string]int64{
			orgSpace.ID: 45,
		},
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	require.Len(t, result, 1)
	require.NotNil(t, result[0].ProcessingUsageCount)
	assert.Equal(t, 45, *result[0].ProcessingUsageCount)

	spaceStore.AssertExpectations(t)
	hostedStorageStore.AssertExpectations(t)
	processingUsageStore.AssertExpectations(t)
}

func TestUsageSummary_ReturnsPlanLimitsAndUsage(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	hostedStorageStore := &MockHostedStorageStore{}
	processingUsageStore := &MockProcessingUsageStore{}
	r := newOrgResolverWithUsageStores(orgStore, spaceStore, hostedStorageStore, processingUsageStore)

	proOrg := makeTestOrg("org-1", "user-1")
	proOrg.Plan = "pro"
	spaceA := makeTestSpace("alpha", "org-1")
	spaceB := makeTestSpace("beta", "org-1")
	periodStart := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	periodEnd := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(proOrg, nil)
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{spaceA, spaceB}, nil)
	hostedStorageStore.On("ListUsageBytesBySpace", mock.Anything, "org-1", []string{spaceA.ID, spaceB.ID}).Return(map[string]int64{
		spaceA.ID: 10,
		spaceB.ID: 20,
	}, nil)
	processingUsageStore.On("GetCurrentUsageSummary", mock.Anything, "org-1").Return(&management.ProcessingUsageSummary{
		PeriodStart:         periodStart,
		PeriodEnd:           periodEnd,
		TotalProcessedCount: 123,
		ProcessedCountBySpace: map[string]int64{
			spaceA.ID: 100,
			spaceB.ID: 23,
		},
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().UsageSummary(ctx)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 2, result.UsedSpaces)
	require.NotNil(t, result.MaxSpaces)
	assert.Equal(t, 3, *result.MaxSpaces)
	require.NotNil(t, result.StorageLimitGb)
	assert.Equal(t, 100, *result.StorageLimitGb)
	require.NotNil(t, result.TransformsLimit)
	assert.Equal(t, 150000, *result.TransformsLimit)
	require.NotNil(t, result.UsedHostedStorageBytes)
	assert.Equal(t, 30, *result.UsedHostedStorageBytes)
	require.NotNil(t, result.UsedTransforms)
	assert.Equal(t, 123, *result.UsedTransforms)
	require.NotNil(t, result.PeriodStart)
	assert.Equal(t, periodStart.Format(time.RFC3339), *result.PeriodStart)
	require.NotNil(t, result.PeriodEnd)
	assert.Equal(t, periodEnd.Format(time.RFC3339), *result.PeriodEnd)
	require.Len(t, result.Spaces, 2)
	assert.Equal(t, "alpha", result.Spaces[0].Key)
	require.NotNil(t, result.Spaces[0].ProcessingUsageCount)
	assert.Equal(t, 100, *result.Spaces[0].ProcessingUsageCount)
	assert.Equal(t, "beta", result.Spaces[1].Key)

	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
	hostedStorageStore.AssertExpectations(t)
	processingUsageStore.AssertExpectations(t)
}

func TestCreateCheckoutSession_CreatesBillingSession(t *testing.T) {
	billingService := &MockBillingService{}
	r := newOrgResolverWithBilling(&MockOrgStore{}, &MockSpaceStore{}, billingService)

	billingService.On("CreateCheckoutSession", mock.Anything, billing.CheckoutSessionInput{
		OrgID:      "org-1",
		Plan:       "pro",
		SuccessURL: "https://app.example/success",
		CancelURL:  "https://app.example/cancel",
	}).Return(&billing.Session{URL: "https://checkout.example/session"}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().CreateCheckoutSession(ctx, "pro", "https://app.example/success", "https://app.example/cancel")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "https://checkout.example/session", result.URL)
	billingService.AssertExpectations(t)
}

func TestCreateCheckoutSession_RejectsUnsupportedPlan(t *testing.T) {
	r := newOrgResolverWithBilling(&MockOrgStore{}, &MockSpaceStore{}, &MockBillingService{})
	ctx := createAdminContextWithOrg("user-1", "org-1")

	_, err := r.Mutation().CreateCheckoutSession(ctx, "trial", "https://app.example/success", "https://app.example/cancel")
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, "unsupported_billing_plan", gqlErr.Extensions["reason"])
}

func TestCreateCheckoutSession_RejectsInvalidRedirectURL(t *testing.T) {
	r := newOrgResolverWithBilling(&MockOrgStore{}, &MockSpaceStore{}, &MockBillingService{})
	ctx := createAdminContextWithOrg("user-1", "org-1")

	_, err := r.Mutation().CreateCheckoutSession(ctx, "pro", "/relative/success", "https://app.example/cancel")
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, "billing_redirect_url_invalid", gqlErr.Extensions["reason"])
}

func TestCreateBillingPortalSession_RequiresConfiguredBillingService(t *testing.T) {
	r := newOrgResolver(&MockOrgStore{}, &MockSpaceStore{})
	ctx := createAdminContextWithOrg("user-1", "org-1")

	_, err := r.Mutation().CreateBillingPortalSession(ctx, "https://app.example/account")
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, "billing_unavailable", gqlErr.Extensions["reason"])
}

func TestCreateBillingPortalSession_CreatesPortalSession(t *testing.T) {
	billingService := &MockBillingService{}
	r := newOrgResolverWithBilling(&MockOrgStore{}, &MockSpaceStore{}, billingService)

	billingService.On("CreatePortalSession", mock.Anything, billing.PortalSessionInput{
		OrgID:     "org-1",
		ReturnURL: "https://app.example/account",
	}).Return(&billing.Session{URL: "https://billing.example/portal"}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().CreateBillingPortalSession(ctx, "https://app.example/account")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "https://billing.example/portal", result.URL)
	billingService.AssertExpectations(t)
}

func TestCreateBillingPortalSession_RejectsInvalidReturnURL(t *testing.T) {
	r := newOrgResolverWithBilling(&MockOrgStore{}, &MockSpaceStore{}, &MockBillingService{})
	ctx := createAdminContextWithOrg("user-1", "org-1")

	_, err := r.Mutation().CreateBillingPortalSession(ctx, "javascript:alert(1)")
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, "billing_return_url_invalid", gqlErr.Extensions["reason"])
}

func TestCreateCheckoutSession_RequiresOrganization(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newOrgResolverWithBilling(orgStore, &MockSpaceStore{}, &MockBillingService{})
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(nil, nil)
	ctx := createAdminContext("user-1")

	_, err := r.Mutation().CreateCheckoutSession(ctx, "pro", "https://app.example/success", "https://app.example/cancel")
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "organization_required", gqlErr.Extensions["reason"])
	orgStore.AssertExpectations(t)
}

func TestCreateBillingPortalSession_RequiresOrganization(t *testing.T) {
	orgStore := &MockOrgStore{}
	r := newOrgResolverWithBilling(orgStore, &MockSpaceStore{}, &MockBillingService{})
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(nil, nil)
	ctx := createAdminContext("user-1")

	_, err := r.Mutation().CreateBillingPortalSession(ctx, "https://app.example/account")
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "organization_required", gqlErr.Extensions["reason"])
	orgStore.AssertExpectations(t)
}

func TestSpaces_ReturnsSpaces(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s1 := makeTestSpace("acme", "org-1")
	s2 := makeTestSpace("beta", "org-1")
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{s1, s2}, nil)

	// OrgID comes from JWT claim — no DB round-trip
	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "acme", result[0].Key)
	assert.Equal(t, "beta", result[1].Key)
	spaceStore.AssertExpectations(t)
}

func TestSpaces_ReturnsSameOrgSpacesForNonAdminMember(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s1 := makeTestSpace("acme", "org-1")
	s2 := makeTestSpace("beta", "org-1")
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{s1, s2}, nil)
	spaceStore.On("ListByMemberUserID", mock.Anything, "user-1").Return([]*space.Space{}, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{{
		OrgID:       "org-1",
		UserID:      "user-1",
		Username:    "alice",
		DisplayName: "Alice",
		Role:        "member",
	}}, nil)

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "acme", result[0].Key)
	assert.Equal(t, "beta", result[1].Key)
	assert.False(t, result[0].CanManage)
	assert.False(t, result[0].CanDelete)
	assert.False(t, result[0].CanLeave)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestSpaces_IncludesGuestAccessibleSpaces(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	ownSpace := makeTestSpace("acme", "org-1")
	guestSpace := makeTestSpace("shared", "org-2")
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{ownSpace}, nil)
	spaceStore.On("ListByMemberUserID", mock.Anything, "user-1").Return([]*space.Space{guestSpace}, nil)
	spaceStore.On("HasMember", mock.Anything, "space-shared", "user-1").Return(true, nil)
	spaceStore.On("ListMembers", mock.Anything, "space-shared").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-2",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "member",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "acme", result[0].Key)
	assert.Equal(t, "shared", result[1].Key)
	assert.False(t, result[1].CanManage)
	assert.True(t, result[1].CanLeave)
	spaceStore.AssertExpectations(t)
}

func TestSpaces_ReturnsHostedStorageUsageForPlatformSpaces(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	hostedStorageStore := &MockHostedStorageStore{}
	r := newOrgResolverWithHostedStorage(orgStore, spaceStore, hostedStorageStore)

	hostedSpace := makeTestSpace("hosted", "org-1")
	hostedSpace.StorageMode = space.StorageModePlatform
	hostedSpace.StorageType = "managed"
	byobSpace := makeTestSpace("byob", "org-1")
	byobSpace.StorageMode = space.StorageModeBYOB
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{hostedSpace, byobSpace}, nil)
	hostedStorageStore.On("ListUsageBytesBySpace", mock.Anything, "org-1", []string{"space-hosted"}).Return(map[string]int64{"space-hosted": 4096}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Nil(t, result[0].StorageUsageBytes)
	require.NotNil(t, result[1].StorageUsageBytes)
	assert.Equal(t, 4096, *result[1].StorageUsageBytes)
	spaceStore.AssertExpectations(t)
	hostedStorageStore.AssertExpectations(t)
}

func TestSpaces_FallbackToOrgStore(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	org := makeTestOrg("org-1", "user-1")
	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(org, nil)
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{}, nil)

	// No OrgID in claims → falls back to DB lookup
	ctx := createAdminContext("user-1")
	result, err := r.Query().Spaces(ctx)
	require.NoError(t, err)
	assert.Empty(t, result)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

// ---------- Space (single) ---------------------------------------------------

func TestSpace_ReturnsSpace(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(s, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "acme")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme", result.Key)
	assert.Equal(t, "org-1", result.OrgID)
	spaceStore.AssertExpectations(t)
}

func TestSpace_ReturnsSameOrgSpaceForNonAdminMember(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(s, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{{
		OrgID:       "org-1",
		UserID:      "user-1",
		Username:    "alice",
		DisplayName: "Alice",
		Role:        "member",
	}}, nil)

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "acme")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme", result.Key)
	assert.Equal(t, "org-1", result.OrgID)
	assert.False(t, result.CanManage)
	assert.False(t, result.CanDelete)
	assert.False(t, result.CanLeave)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestSpace_NotFound(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("GetByKey", mock.Anything, "missing").Return(nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "missing")
	require.NoError(t, err)
	assert.Nil(t, result)
	spaceStore.AssertExpectations(t)
}

func TestSpace_WrongOrg(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	// Space belongs to org-2, caller is in org-1
	s := makeTestSpace("acme", "org-2")
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(s, nil)
	spaceStore.On("HasMember", mock.Anything, "space-acme", "user-1").Return(false, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "acme")
	assert.Nil(t, result)
	require.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	require.True(t, ok)
	assert.Equal(t, "FORBIDDEN", gqlErr.Extensions["code"])
	spaceStore.AssertExpectations(t)
}

func TestSpace_ReturnsGuestAccessibleSpace(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-2")
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(s, nil)
	spaceStore.On("HasMember", mock.Anything, "space-acme", "user-1").Return(true, nil)
	spaceStore.On("ListMembers", mock.Anything, "space-acme").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-2",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "admin",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "acme")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme", result.Key)
	assert.Equal(t, "org-2", result.OrgID)
	assert.True(t, result.CanManage)
	assert.False(t, result.CanDelete)
	assert.True(t, result.CanLeave)
	spaceStore.AssertExpectations(t)
}

func TestSpace_ReturnsPublicAccessSpaceForGuestToken(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	registryStore := &MockRegistryStore{}
	r := newOrgResolverWithRegistry(orgStore, spaceStore, registryStore)

	s := makeTestSpace("public", "org-2")
	spaceStore.On("GetByKey", mock.Anything, "public").Return(s, nil)
	orgStore.On("GetByUserID", mock.Anything, "guest-id").Return(nil, nil)
	registryStore.On(
		"Get",
		mock.Anything,
		registrystore.SpaceOwnerID(s.ID),
		"config.allow_guest_mode",
	).Return(&registrystore.Registry{Key: "config.allow_guest_mode", Value: "true"}, nil)

	ctx := createGuestContext("guest-id")
	result, err := r.Query().Space(ctx, "public")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "public", result.Key)
	assert.Equal(t, "org-2", result.OrgID)
	assert.False(t, result.CanManage)
	assert.False(t, result.CanDelete)
	assert.False(t, result.CanLeave)
	spaceStore.AssertExpectations(t)
	registryStore.AssertExpectations(t)
}

func TestSpace_ReturnsPublicAccessSpaceForAuthenticatedNonMember(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	registryStore := &MockRegistryStore{}
	r := newOrgResolverWithRegistry(orgStore, spaceStore, registryStore)

	s := makeTestSpace("public", "org-2")
	spaceStore.On("GetByKey", mock.Anything, "public").Return(s, nil)
	registryStore.On(
		"Get",
		mock.Anything,
		registrystore.SpaceOwnerID(s.ID),
		"config.allow_guest_mode",
	).Return(&registrystore.Registry{Key: "config.allow_guest_mode", Value: "true"}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().Space(ctx, "public")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "public", result.Key)
	assert.Equal(t, "org-2", result.OrgID)
	assert.False(t, result.CanManage)
	assert.False(t, result.CanDelete)
	assert.False(t, result.CanLeave)
	spaceStore.AssertExpectations(t)
	registryStore.AssertExpectations(t)
}

// ---------- CreateSpace ------------------------------------------------------

func TestCreateSpace_RequiresAdmin(t *testing.T) {
	r := newOrgResolver(&MockOrgStore{}, &MockSpaceStore{})

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "permission")
}

func TestCreateSpace_NilSpaceStore(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, nil, nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
}

func TestCreateSpace_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	created := makeTestSpace("acme", "org-1")
	created.StorageMode = space.StorageModePlatform
	created.StorageType = "managed"
	created.Bucket = ""
	created.Region = ""
	orgRecord := makeTestOrg("org-1", "user-1")
	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.OrgID == "org-1" && s.Name == "Acme" && s.StorageMode == space.StorageModePlatform && s.StorageType == "managed"
	})).Return(nil)
	orgStore.On("GetByID", mock.Anything, "org-1").Return(orgRecord, nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{}, nil).Once()
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	spaceStore.On("AddMember", mock.Anything, "space-acme", "user-1", "admin").Return(nil)
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(created, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme", result.Key)
	assert.Equal(t, "org-1", result.OrgID)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestCreateSpace_RejectsCustomDomainWhenPlanLimitReached(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	orgRecord := makeTestOrg("org-1", "user-1")
	orgRecord.Plan = org.PlanStarter
	other := makeTestSpace("brand", "org-1")
	other.CustomDomain = "images.other.test"

	orgStore.On("GetByID", mock.Anything, "org-1").Return(orgRecord, nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{other}, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	customDomain := "images.new.test"
	input := gql.SpaceInput{Key: "acme", Name: "Acme", CustomDomain: &customDomain}
	result, err := r.Mutation().CreateSpace(ctx, input)

	assert.Nil(t, result)
	require.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "custom_domain_limit_reached", gqlErr.Extensions["reason"])
	assert.Contains(t, gqlErr.Message, "custom domain limit")
	spaceStore.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestCreateSpace_RejectsWhenPlanSpaceLimitReached(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	orgRecord := makeTestOrg("org-1", "user-1")
	orgRecord.Plan = org.PlanStarter
	existing := makeTestSpace("brand", "org-1")

	orgStore.On("GetByID", mock.Anything, "org-1").Return(orgRecord, nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{existing}, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)

	assert.Nil(t, result)
	require.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "space_limit_reached", gqlErr.Extensions["reason"])
	assert.Contains(t, gqlErr.Message, "space limit")
	spaceStore.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestCreateSpace_RejectsPlatformWithByobFields(t *testing.T) {
	r := newOrgResolver(&MockOrgStore{}, &MockSpaceStore{})

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageMode := space.StorageModePlatform
	storageType := "managed"
	input := gql.SpaceInput{
		Key:         "acme",
		Name:        "Acme",
		StorageMode: &storageMode,
		StorageType: &storageType,
		Bucket:      ptrStr("bucket"),
	}

	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "platform storage")
}

func TestCreateSpace_RejectsByobWithoutBucket(t *testing.T) {
	r := newOrgResolver(&MockOrgStore{}, &MockSpaceStore{})

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageMode := space.StorageModeBYOB
	storageType := "s3"
	input := gql.SpaceInput{
		Key:         "acme",
		Name:        "Acme",
		StorageMode: &storageMode,
		StorageType: &storageType,
		Region:      ptrStr("us-east-1"),
	}

	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "requires bucket")
}

func TestCreateSpace_DerivesStorageModeFromType(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolverWithStorageValidator(orgStore, spaceStore, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		assert.Equal(t, gql.StorageTypeS3, input.Type)
		if assert.NotNil(t, input.S3Config) {
			assert.Equal(t, "bucket", input.S3Config.Bucket)
		}
		return &gql.StorageTestResult{Success: true, Message: "Storage configuration test successful"}
	})

	created := makeTestSpace("acme", "org-1")
	created.StorageMode = space.StorageModeBYOB
	created.StorageType = "s3"
	orgRecord := makeTestOrg("org-1", "user-1")
	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.StorageMode == space.StorageModeBYOB && s.StorageType == "s3" && s.Bucket == "bucket" && s.Region == "us-east-1"
	})).Return(nil)
	orgStore.On("GetByID", mock.Anything, "org-1").Return(orgRecord, nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{}, nil).Once()
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	spaceStore.On("AddMember", mock.Anything, "space-acme", "user-1", "admin").Return(nil)
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(created, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageType := "s3"
	input := gql.SpaceInput{
		Key:         "acme",
		Name:        "Acme",
		StorageType: &storageType,
		Bucket:      ptrStr("bucket"),
		Region:      ptrStr("us-east-1"),
	}

	result, err := r.Mutation().CreateSpace(ctx, input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, space.StorageModeBYOB, result.StorageMode)
	spaceStore.AssertExpectations(t)
	orgStore.AssertExpectations(t)
}

func TestCreateSpace_RejectsInvalidByobStorageConfig(t *testing.T) {
	r := newOrgResolverWithStorageValidator(&MockOrgStore{}, &MockSpaceStore{}, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to write probe object",
			Details: stringPtr("access denied"),
		}
	})

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageType := "s3"
	input := gql.SpaceInput{
		Key:         "acme",
		Name:        "Acme",
		StorageType: &storageType,
		Bucket:      ptrStr("bucket"),
		Region:      ptrStr("us-east-1"),
	}

	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid BYOB storage configuration")
	assert.Contains(t, err.Error(), "Failed to write probe object")
	assert.Contains(t, err.Error(), "access denied")
}

func TestCreateSpace_DuplicateKey(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)
	orgRecord := makeTestOrg("org-1", "user-1")

	orgStore.On("GetByID", mock.Anything, "org-1").Return(orgRecord, nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{}, nil).Once()
	spaceStore.On("Create", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme"
	})).Return(apperror.Conflict(`space key "acme" is already taken`, "key"))

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already taken")
	spaceStore.AssertExpectations(t)
}

func TestCreateSpace_RequiresOrganization(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	orgStore.On("GetByUserID", mock.Anything, "user-1").Return(nil, nil)

	ctx := createAdminContext("user-1") // no org_id claim
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "organization_required", gqlErr.Extensions["reason"])
	orgStore.AssertExpectations(t)
	spaceStore.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestCreateSpace_NoOrgAndNilOrgStore(t *testing.T) {
	// spaceStore present but orgStore nil — no org in JWT claim either
	logger, _ := zap.NewDevelopment()
	sp := NewMockStorageProvider(nil)
	spaceStore := &MockSpaceStore{}
	r := NewResolver(sp, nil, nil, nil, nil, nil, logger, nil, spaceStore, nil, nil)

	ctx := createAdminContext("user-1") // no org_id claim
	input := gql.SpaceInput{Key: "acme", Name: "Acme"}
	result, err := r.Mutation().CreateSpace(ctx, input)
	assert.Nil(t, result)
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "organization_required", gqlErr.Extensions["reason"])
}

func TestTransferOrganizationOwnership_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	currentOrg := makeTestOrg("org-1", "user-1")
	updatedOrg := makeTestOrg("org-1", "user-2")
	orgStore.On("GetByID", mock.Anything, "org-1").Return(currentOrg, nil).Once()
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "admin"),
	}, nil).Once()
	orgStore.On("TransferOwnership", mock.Anything, "org-1", "user-1", "user-2").Return(nil).Once()
	orgStore.On("GetByID", mock.Anything, "org-1").Return(updatedOrg, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().TransferOrganizationOwnership(ctx, "user-2")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "user-2", result.OwnerUserID)
	orgStore.AssertExpectations(t)
}

func TestTransferOrganizationOwnership_RequiresCurrentOwner(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	currentOrg := makeTestOrg("org-1", "user-9")
	orgStore.On("GetByID", mock.Anything, "org-1").Return(currentOrg, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().TransferOrganizationOwnership(ctx, "user-2")
	assert.Nil(t, result)
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, apperror.ErrForbidden, gqlErr.Extensions["code"])
	orgStore.AssertNotCalled(t, "TransferOwnership", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
}

func TestTransferOrganizationOwnership_RequiresExistingMember(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	currentOrg := makeTestOrg("org-1", "user-1")
	orgStore.On("GetByID", mock.Anything, "org-1").Return(currentOrg, nil).Once()
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().TransferOrganizationOwnership(ctx, "user-2")
	assert.Nil(t, result)
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "org_transfer_target_not_member", gqlErr.Extensions["reason"])
	orgStore.AssertNotCalled(t, "TransferOwnership", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
}

func TestDeleteOrganization_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{}, nil).Once()
	orgStore.On("Delete", mock.Anything, "org-1", "user-1").Return(nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteOrganization(ctx)
	require.NoError(t, err)
	assert.True(t, ok)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestDeleteOrganization_RequiresCurrentOwner(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-9"), nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteOrganization(ctx)
	assert.False(t, ok)
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "org_delete_current_owner_required", gqlErr.Extensions["reason"])
	spaceStore.AssertNotCalled(t, "ListByOrgID", mock.Anything, mock.Anything)
	orgStore.AssertNotCalled(t, "Delete", mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
}

func TestDeleteOrganization_RejectsWhenSpacesRemain(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	orgStore.On("GetByID", mock.Anything, "org-1").Return(makeTestOrg("org-1", "user-1"), nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{makeTestSpace("alpha", "org-1")}, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteOrganization(ctx)
	assert.False(t, ok)
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "org_delete_has_spaces", gqlErr.Extensions["reason"])
	orgStore.AssertNotCalled(t, "Delete", mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestDeleteOrganization_RejectsActivePaidBilling(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	paidOrg := makeTestOrg("org-1", "user-1")
	paidOrg.Plan = org.PlanStarter
	paidOrg.PlanStatus = org.PlanStatusActive
	paidOrg.StripeSubscriptionID = "sub_123"
	orgStore.On("GetByID", mock.Anything, "org-1").Return(paidOrg, nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{}, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteOrganization(ctx)
	assert.False(t, ok)
	require.Error(t, err)
	var gqlErr *gqlerror.Error
	require.ErrorAs(t, err, &gqlErr)
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "org_delete_billing_active", gqlErr.Extensions["reason"])
	orgStore.AssertNotCalled(t, "Delete", mock.Anything, mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

// ---------- UpdateSpace ------------------------------------------------------

func TestUpdateSpace_RequiresManagePermission(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(makeTestSpace("acme", "org-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{{
		OrgID:       "org-1",
		UserID:      "user-1",
		Username:    "alice",
		DisplayName: "Alice",
		Role:        "member",
	}}, nil)

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	assert.Nil(t, result)
	require.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, apperror.ErrForbidden, gqlErr.Extensions["code"])
	assert.Contains(t, gqlErr.Message, "space manager access required")
	orgStore.AssertExpectations(t)
	spaceStore.AssertNotCalled(t, "Upsert", mock.Anything, mock.Anything)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_NotFound(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("GetByKey", mock.Anything, "missing").Return(nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "missing", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "missing", input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestUpdateSpace_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	existing := makeTestSpace("acme", "org-1")
	existing.StorageMode = space.StorageModePlatform
	existing.StorageType = "managed"
	existing.Bucket = ""
	existing.Region = ""
	updated := makeTestSpace("acme", "org-1")
	updated.Name = "New Name"
	updated.StorageMode = space.StorageModePlatform
	updated.StorageType = "managed"
	updated.Bucket = ""
	updated.Region = ""

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.Name == "New Name"
	})).Return(nil)
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "New Name", result.Name)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_ResetsCustomDomainVerificationWhenDomainChanges(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	existing := makeTestSpace("acme", "org-1")
	existing.CustomDomain = "images.old.test"
	existing.CustomDomainVerified = true
	orgRecord := makeTestOrg("org-1", "user-1")
	orgRecord.Plan = org.PlanPro
	updated := makeTestSpace("acme", "org-1")
	updated.CustomDomain = "images.new.test"
	updated.CustomDomainVerified = false

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()
	orgStore.On("GetByID", mock.Anything, "org-1").Return(orgRecord, nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{existing}, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.CustomDomain == "images.new.test" && !s.CustomDomainVerified
	})).Return(nil)
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	customDomain := "images.new.test"
	input := gql.SpaceInput{Key: "acme", Name: "Acme", CustomDomain: &customDomain}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "images.new.test", result.CustomDomain)
	assert.False(t, result.CustomDomainVerified)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_KeepsCustomDomainVerificationWhenDomainIsUnchanged(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	existing := makeTestSpace("acme", "org-1")
	existing.CustomDomain = "images.demo.test"
	existing.CustomDomainVerified = true
	updated := makeTestSpace("acme", "org-1")
	updated.CustomDomain = "images.demo.test"
	updated.CustomDomainVerified = true

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.CustomDomain == "images.demo.test" && s.CustomDomainVerified
	})).Return(nil)
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	customDomain := " IMAGES.DEMO.TEST. "
	input := gql.SpaceInput{Key: "acme", Name: "Acme", CustomDomain: &customDomain}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "images.demo.test", result.CustomDomain)
	assert.True(t, result.CustomDomainVerified)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_RejectsCustomDomainWhenPlanLimitReached(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	existing := makeTestSpace("acme", "org-1")
	other := makeTestSpace("brand", "org-1")
	other.CustomDomain = "images.other.test"
	orgRecord := makeTestOrg("org-1", "user-1")
	orgRecord.Plan = "starter"

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()
	orgStore.On("GetByID", mock.Anything, "org-1").Return(orgRecord, nil).Once()
	spaceStore.On("ListByOrgID", mock.Anything, "org-1").Return([]*space.Space{existing, other}, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	customDomain := "images.new.test"
	input := gql.SpaceInput{Key: "acme", Name: "Acme", CustomDomain: &customDomain}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)

	assert.Nil(t, result)
	require.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, apperror.ErrInvalidInput, gqlErr.Extensions["code"])
	assert.Equal(t, "custom_domain_limit_reached", gqlErr.Extensions["reason"])
	assert.Contains(t, gqlErr.Message, "custom domain limit")
	spaceStore.AssertNotCalled(t, "Upsert", mock.Anything, mock.Anything)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_RejectsByobManagedTypeMismatch(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	existing := makeTestSpace("acme", "org-1")
	existing.StorageMode = space.StorageModeBYOB
	existing.StorageType = "s3"
	existing.Bucket = "bucket"
	existing.Region = "us-east-1"
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	storageMode := space.StorageModeBYOB
	storageType := "managed"
	input := gql.SpaceInput{Key: "acme", Name: "New Name", StorageMode: &storageMode, StorageType: &storageType}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "requires storageType")
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_ValidatesByobStorageChanges(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolverWithStorageValidator(orgStore, spaceStore, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		if assert.NotNil(t, input.S3Config) {
			assert.Equal(t, "new-bucket", input.S3Config.Bucket)
		}
		return &gql.StorageTestResult{Success: true, Message: "Storage configuration test successful"}
	})

	existing := makeTestSpace("acme", "org-1")
	existing.StorageMode = space.StorageModeBYOB
	existing.StorageType = "s3"
	existing.Bucket = "bucket"
	existing.Region = "us-east-1"
	updated := makeTestSpace("acme", "org-1")
	updated.StorageMode = space.StorageModeBYOB
	updated.StorageType = "s3"
	updated.Bucket = "new-bucket"
	updated.Region = "us-east-1"

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.Bucket == "new-bucket" && s.StorageMode == space.StorageModeBYOB
	})).Return(nil)
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	bucket := "new-bucket"
	input := gql.SpaceInput{Key: "acme", Name: "New Name", Bucket: &bucket}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "new-bucket", result.Bucket)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_RejectsInvalidByobStorageChanges(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolverWithStorageValidator(orgStore, spaceStore, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		return &gql.StorageTestResult{
			Success: false,
			Message: "Failed to generate presigned upload URL",
			Details: stringPtr("signature mismatch"),
		}
	})

	existing := makeTestSpace("acme", "org-1")
	existing.StorageMode = space.StorageModeBYOB
	existing.StorageType = "s3"
	existing.Bucket = "bucket"
	existing.Region = "us-east-1"
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	bucket := "new-bucket"
	input := gql.SpaceInput{Key: "acme", Name: "New Name", Bucket: &bucket}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid BYOB storage configuration")
	assert.Contains(t, err.Error(), "Failed to generate presigned upload URL")
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_SkipsValidationWhenByobStorageUnchanged(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	validatorCalled := false
	r := newOrgResolverWithStorageValidator(orgStore, spaceStore, func(ctx context.Context, input gql.StorageConfigInput) *gql.StorageTestResult {
		validatorCalled = true
		return &gql.StorageTestResult{Success: true, Message: "Storage configuration test successful"}
	})

	existing := makeTestSpace("acme", "org-1")
	existing.StorageMode = space.StorageModeBYOB
	existing.StorageType = "s3"
	existing.Bucket = "bucket"
	existing.Region = "us-east-1"
	updated := makeTestSpace("acme", "org-1")
	updated.StorageMode = space.StorageModeBYOB
	updated.StorageType = "s3"
	updated.Bucket = "bucket"
	updated.Region = "us-east-1"
	updated.Name = "New Name"

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.Name == "New Name" && s.Bucket == "bucket"
	})).Return(nil)
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.False(t, validatorCalled)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_AllowsGuestManager(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	existing := makeTestSpace("acme", "org-host")
	updated := makeTestSpace("acme", "org-host")
	updated.Name = "New Name"

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("ListMembers", mock.Anything, "space-acme").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-1",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "admin",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme" && s.Name == "New Name"
	})).Return(nil)
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(updated, nil).Once()
	spaceStore.On("ListMembers", mock.Anything, "space-acme").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-1",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "admin",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-guest")
	input := gql.SpaceInput{Key: "acme", Name: "New Name"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.True(t, result.CanManage)
	assert.False(t, result.CanDelete)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpace_RenamesKeyAndMigratesDependencies(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	inviteStore := &MockSpaceInviteStore{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, nil, nil, nil, nil, logger, orgStore, spaceStore, inviteStore, nil)

	existing := makeTestSpace("acme", "org-1")
	updated := makeTestSpace("acme-renamed", "org-1")
	updated.Name = "Renamed Space"

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(existing, nil).Once()
	spaceStore.On("RenameKey", mock.Anything, "acme", "acme-renamed").Return(nil).Once()
	spaceStore.On("Upsert", mock.Anything, mock.MatchedBy(func(s *space.Space) bool {
		return s.Key == "acme-renamed" && s.Name == "Renamed Space"
	})).Return(nil).Once()
	spaceStore.On("GetByKey", mock.Anything, "acme-renamed").Return(updated, nil).Once()

	ctx := createAdminContextWithOrg("user-1", "org-1")
	input := gql.SpaceInput{Key: "acme-renamed", Name: "Renamed Space"}
	result, err := r.Mutation().UpdateSpace(ctx, "acme", input)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "acme-renamed", result.Key)
	assert.Equal(t, "Renamed Space", result.Name)
	spaceStore.AssertExpectations(t)
}

// ---------- DeleteSpace ------------------------------------------------------

func TestDeleteSpace_RequiresDeletePermission(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("GetByKey", mock.Anything, "acme").Return(makeTestSpace("acme", "org-1"), nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{{
		OrgID:       "org-1",
		UserID:      "user-1",
		Username:    "alice",
		DisplayName: "Alice",
		Role:        "member",
	}}, nil)

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteSpace(ctx, "acme")
	assert.False(t, ok)
	require.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, apperror.ErrForbidden, gqlErr.Extensions["code"])
	assert.Contains(t, gqlErr.Message, "owning organization admins")
	orgStore.AssertExpectations(t)
}

func TestDeleteSpace_NotFound(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	spaceStore.On("GetByKey", mock.Anything, "missing").Return(nil, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteSpace(ctx, "missing")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestDeleteSpace_Success(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(s, nil)
	spaceStore.On("SoftDelete", mock.Anything, "acme").Return(nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteSpace(ctx, "acme")
	require.NoError(t, err)
	assert.True(t, ok)
	spaceStore.AssertExpectations(t)
}

func TestDeleteSpace_WrongOrg(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	// Space belongs to org-2, caller is org-1
	s := makeTestSpace("acme", "org-2")
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(s, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().DeleteSpace(ctx, "acme")
	assert.False(t, ok)
	require.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, apperror.ErrForbidden, gqlErr.Extensions["code"])
	assert.Contains(t, gqlErr.Message, "owning organization admins")
	spaceStore.AssertNotCalled(t, "SoftDelete")
}

func TestDeleteSpace_DeniesGuestManager(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-host")
	spaceStore.On("GetByKey", mock.Anything, "acme").Return(s, nil)
	spaceStore.On("ListMembers", mock.Anything, "space-acme").Return([]*space.SpaceMemberView{{
		SpaceID:   "space-1",
		UserID:    "user-1",
		Username:  "alice",
		Role:      "admin",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-guest")
	ok, err := r.Mutation().DeleteSpace(ctx, "acme")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "owning organization admins")
	spaceStore.AssertNotCalled(t, "SoftDelete")
}

func TestSpaceMembers_ExposeRowActionCapabilities(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByID", mock.Anything, s.ID).Return(s, nil)
	spaceStore.On("ListMembers", mock.Anything, "space-acme").Return([]*space.SpaceMemberView{
		{
			SpaceID:     "space-1",
			UserID:      "user-3",
			Username:    "charlie",
			DisplayName: "Charlie",
			Role:        "admin",
			CreatedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			SpaceID:     "space-1",
			UserID:      "user-9",
			Username:    "guest",
			DisplayName: "Guest User",
			Role:        "member",
			CreatedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		},
	}, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "admin"),
		makeTestMember("user-3", "charlie", "member"),
	}, nil)

	ctx := createAdminContextWithOrg("user-2", "org-1")
	result, err := r.Query().SpaceMembers(ctx, s.ID)
	require.NoError(t, err)
	require.Len(t, result, 4)
	assert.Equal(t, "user-1", result[0].UserID)
	assert.Equal(t, gql.SpaceMemberRoleOwner, result[0].Role)
	assert.Equal(t, gql.SpaceMemberRoleSourceOrganization, result[0].RoleSource)
	assert.False(t, result[0].CanChangeRole)
	assert.False(t, result[0].CanRemove)
	assert.Equal(t, "user-2", result[1].UserID)
	assert.Equal(t, gql.SpaceMemberRoleAdmin, result[1].Role)
	assert.Equal(t, gql.SpaceMemberRoleSourceOrganization, result[1].RoleSource)
	assert.False(t, result[1].CanChangeRole)
	assert.False(t, result[1].CanRemove)
	assert.Equal(t, "user-3", result[2].UserID)
	assert.Equal(t, gql.SpaceMemberRoleAdmin, result[2].Role)
	assert.Equal(t, gql.SpaceMemberRoleSourceSpace, result[2].RoleSource)
	assert.True(t, result[2].CanChangeRole)
	assert.True(t, result[2].CanRemove)
	assert.Equal(t, "user-9", result[3].UserID)
	assert.Equal(t, gql.SpaceMemberRoleSourceSpace, result[3].RoleSource)
	assert.True(t, result[3].CanChangeRole)
	assert.True(t, result[3].CanRemove)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestSpaceMembers_CollapsesRedundantOrgMemberDirectAccess(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByID", mock.Anything, s.ID).Return(s, nil)
	spaceStore.On("ListMembers", mock.Anything, "space-acme").Return([]*space.SpaceMemberView{{
		SpaceID:     "space-1",
		UserID:      "user-3",
		Username:    "charlie",
		DisplayName: "Charlie",
		Role:        "member",
		CreatedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-3", "charlie", "member"),
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Query().SpaceMembers(ctx, s.ID)
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "user-3", result[1].UserID)
	assert.Equal(t, gql.SpaceMemberRoleSourceOrganization, result[1].RoleSource)
	assert.Equal(t, gql.SpaceMemberRoleMember, result[1].Role)
	assert.False(t, result[1].CanChangeRole)
	assert.False(t, result[1].CanRemove)
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestSpaceMembers_RequiresManagePermission(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByID", mock.Anything, s.ID).Return(s, nil).Once()
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{{
		OrgID:       "org-1",
		UserID:      "user-1",
		Username:    "alice",
		DisplayName: "Alice",
		Role:        "member",
	}}, nil).Once()

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	result, err := r.Query().SpaceMembers(ctx, s.ID)

	assert.Nil(t, result)
	require.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, apperror.ErrForbidden, gqlErr.Extensions["code"])
	assert.Contains(t, gqlErr.Message, "space manager access required")
	orgStore.AssertExpectations(t)
	spaceStore.AssertNotCalled(t, "ListMembers", mock.Anything, mock.Anything)
	spaceStore.AssertExpectations(t)
}

func TestInviteSpaceMember_RejectsExistingOrgMemberByEmail(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	userStore := &MockUserStore{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, userStore, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByID", mock.Anything, s.ID).Return(s, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "member"),
	}, nil)
	userStore.On("GetByEmail", mock.Anything, "bob@example.com").Return(&userstore.User{
		ID:          "user-2",
		Username:    "bob",
		DisplayName: "Bob",
	}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().InviteSpaceMember(ctx, s.ID, "Bob@Example.com", "member")
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already has access")

	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestInviteSpaceMember_RequiresManagePermission(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	userStore := &MockUserStore{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, userStore, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByID", mock.Anything, s.ID).Return(s, nil).Once()
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{{
		OrgID:       "org-1",
		UserID:      "user-1",
		Username:    "alice",
		DisplayName: "Alice",
		Role:        "member",
	}}, nil).Once()

	ctx := createReadWriteContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().InviteSpaceMember(ctx, s.ID, "guest@example.com", "member")

	assert.Nil(t, result)
	require.Error(t, err)
	gqlErr, ok := err.(*gqlerror.Error)
	assert.True(t, ok, "expected *gqlerror.Error")
	assert.Equal(t, apperror.ErrForbidden, gqlErr.Extensions["code"])
	assert.Contains(t, gqlErr.Message, "space manager access required")
	orgStore.AssertExpectations(t)
	userStore.AssertNotCalled(t, "GetByEmail", mock.Anything, mock.Anything)
	spaceStore.AssertExpectations(t)
}

func TestInviteSpaceMember_AddsExistingExternalAccountAsGuest(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	userStore := &MockUserStore{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, userStore, nil, nil, nil, logger, orgStore, spaceStore, nil, nil)
	guestEmail := "guest@example.com"
	guestAvatarURL := "https://example.com/avatar.png"

	s := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByID", mock.Anything, s.ID).Return(s, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	userStore.On("GetByEmail", mock.Anything, "guest@example.com").Return(&userstore.User{
		ID:          "user-9",
		Email:       &guestEmail,
		Username:    "guestuser",
		DisplayName: "Guest User",
		AvatarUrl:   &guestAvatarURL,
	}, nil)
	spaceStore.On("HasMember", mock.Anything, "space-acme", "user-9").Return(false, nil)
	spaceStore.On("AddMember", mock.Anything, "space-acme", "user-9", "member").Return(nil)
	spaceStore.On("ListMembers", mock.Anything, "space-acme").Return([]*space.SpaceMemberView{{
		SpaceID:     "space-1",
		UserID:      "user-9",
		Username:    "guestuser",
		DisplayName: "Guest User",
		Email:       &guestEmail,
		AvatarURL:   &guestAvatarURL,
		Role:        "member",
		CreatedAt:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().InviteSpaceMember(ctx, s.ID, "guest@example.com", "member")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "added", result.Status)
	require.NotNil(t, result.Member)
	assert.Equal(t, "user-9", result.Member.UserID)
	require.NotNil(t, result.Member.Email)
	assert.Equal(t, "guest@example.com", *result.Member.Email)
	assert.Nil(t, result.Invitation)

	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
}

func TestLeaveSpace_RemovesGuestMembership(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	space := makeTestSpace("shared-space", "org-host")
	spaceStore.On("GetByID", mock.Anything, space.ID).Return(space, nil)
	spaceStore.On("HasMember", mock.Anything, "space-shared-space", "user-1").Return(true, nil)
	spaceStore.On("RemoveMember", mock.Anything, "space-shared-space", "user-1").Return(nil)

	ctx := createAdminContextWithOrg("user-1", "org-guest")
	ok, err := r.Mutation().LeaveSpace(ctx, space.ID)
	require.NoError(t, err)
	assert.True(t, ok)
	spaceStore.AssertExpectations(t)
}

func TestLeaveSpace_RejectsOwnedSpace(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	space := makeTestSpace("owned-space", "org-1")
	spaceStore.On("GetByID", mock.Anything, space.ID).Return(space, nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	ok, err := r.Mutation().LeaveSpace(ctx, space.ID)
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "only leave shared spaces")
	spaceStore.AssertExpectations(t)
}

func TestInviteSpaceMember_CreatesPendingInvitationForExternalEmail(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	userStore := &MockUserStore{}
	inviteStore := &MockSpaceInviteStore{}
	sender := &MockInviteSender{}
	logger, _ := zap.NewDevelopment()
	r := NewResolver(NewMockStorageProvider(nil), nil, userStore, nil, nil, nil, logger, orgStore, spaceStore, inviteStore, sender)

	s := makeTestSpace("acme", "org-1")
	o := makeTestOrg("org-1", "user-1")
	o.Name = "Acme Org"
	invitation := &space.Invitation{
		ID:        "invite-1",
		OrgID:     "org-1",
		SpaceID:   "space-acme",
		Email:     "new@example.com",
		Role:      "member",
		Token:     "tok-123",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		ExpiresAt: time.Date(2026, 1, 8, 0, 0, 0, 0, time.UTC),
	}

	spaceStore.On("GetByID", mock.Anything, s.ID).Return(s, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
	}, nil)
	userStore.On("GetByEmail", mock.Anything, "new@example.com").Return((*userstore.User)(nil), nil)
	inviteStore.On(
		"CreateOrRefreshPending",
		mock.Anything,
		"org-1",
		"space-acme",
		"new@example.com",
		"member",
		"user-1",
		mock.AnythingOfType("time.Time"),
	).Return(invitation, nil)
	orgStore.On("GetByID", mock.Anything, "org-1").Return(o, nil)
	sender.On("SendSpaceInvitation", mock.Anything, mock.MatchedBy(func(params space.EmailParams) bool {
		return params.ToEmail == "new@example.com" && params.OrgName == "Acme Org" && params.SpaceName == "Test Space" && params.InviteToken == "tok-123"
	})).Return(nil)

	ctx := createAdminContextWithOrg("user-1", "org-1")
	result, err := r.Mutation().InviteSpaceMember(ctx, s.ID, "new@example.com", "member")
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "invited", result.Status)
	assert.Nil(t, result.Member)
	require.NotNil(t, result.Invitation)
	assert.Equal(t, "invite-1", result.Invitation.ID)
	assert.Equal(t, "new@example.com", result.Invitation.Email)

	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
	userStore.AssertExpectations(t)
	inviteStore.AssertExpectations(t)
	sender.AssertExpectations(t)
}

func TestRemoveSpaceMember_RejectsHostOrgOwner(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	space := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByID", mock.Anything, space.ID).Return(space, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "admin"),
	}, nil)

	ctx := createAdminContextWithOrg("user-2", "org-1")
	ok, err := r.Mutation().RemoveSpaceMember(ctx, space.ID, "user-1")
	assert.False(t, ok)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "host organization owner or admin")
	spaceStore.AssertNotCalled(t, "RemoveMember")
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}

func TestUpdateSpaceMemberRole_RejectsHostOrgOwner(t *testing.T) {
	orgStore := &MockOrgStore{}
	spaceStore := &MockSpaceStore{}
	r := newOrgResolver(orgStore, spaceStore)

	space := makeTestSpace("acme", "org-1")
	spaceStore.On("GetByID", mock.Anything, space.ID).Return(space, nil)
	orgStore.On("ListMembers", mock.Anything, "org-1").Return([]*org.OrgMemberView{
		makeTestMember("user-1", "alice", "owner"),
		makeTestMember("user-2", "bob", "admin"),
	}, nil)

	ctx := createAdminContextWithOrg("user-2", "org-1")
	result, err := r.Mutation().UpdateSpaceMemberRole(ctx, space.ID, "user-1", "member")
	assert.Nil(t, result)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "host organization owner or admin")
	spaceStore.AssertNotCalled(t, "UpdateMemberRole")
	orgStore.AssertExpectations(t)
	spaceStore.AssertExpectations(t)
}
