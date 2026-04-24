package resolver

import (
	"context"
	"io"
	"time"

	"github.com/cshum/imagor"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/license"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/registrystore"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/org"
	"github.com/cshum/imagor-studio/server/pkg/processing"
	"github.com/cshum/imagor-studio/server/pkg/space"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor/imagorpath"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// Helper function to create user context
func createUserContext(userID, role string, scopes []string) context.Context {
	claims := &auth.Claims{
		UserID: userID,
		Role:   role,
		Scopes: scopes,
	}
	ctx := auth.SetClaimsInContext(context.Background(), claims)
	return context.WithValue(ctx, UserIDContextKey, userID)
}

// Helper function to create embedded user context
func createEmbeddedUserContext(userID, role string, scopes []string, pathPrefix string) context.Context {
	claims := &auth.Claims{
		UserID:     userID,
		Role:       role,
		Scopes:     scopes,
		PathPrefix: pathPrefix,
		IsEmbedded: true,
	}
	ctx := auth.SetClaimsInContext(context.Background(), claims)
	return context.WithValue(ctx, UserIDContextKey, userID)
}

// Helper function to create embedded read-write context
func createEmbeddedReadWriteContext(userID, pathPrefix string) context.Context {
	return createEmbeddedUserContext(userID, "guest", []string{"read", "edit"}, pathPrefix)
}

// Helper function to create admin context
func createAdminContext(userID string) context.Context {
	return createUserContext(userID, "admin", []string{"read", "write", "admin"})
}

// Helper function to create read write user context
func createReadWriteContext(userID string) context.Context {
	return createUserContext(userID, "user", []string{"read", "write"})
}

func createReadOnlyContext(userID string) context.Context {
	return createUserContext(userID, "user", []string{"read"})
}

// Helper functions for tests
func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

type MockUserStore struct {
	mock.Mock
}

func (m *MockUserStore) Create(ctx context.Context, displayName, username, hashedPassword, role string) (*userstore.User, error) {
	args := m.Called(ctx, displayName, username, hashedPassword, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) GetByID(ctx context.Context, id string) (*userstore.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) GetByIDAdmin(ctx context.Context, id string) (*userstore.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) GetByEmail(ctx context.Context, email string) (*userstore.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	args := m.Called(ctx, username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserStore) UpdateLastLogin(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockUserStore) UpdatePassword(ctx context.Context, id string, hashedPassword string) error {
	args := m.Called(ctx, id, hashedPassword)
	return args.Error(0)
}

func (m *MockUserStore) UpdateDisplayName(ctx context.Context, id string, displayName string) error {
	args := m.Called(ctx, id, displayName)
	return args.Error(0)
}

func (m *MockUserStore) UpdateUsername(ctx context.Context, id string, username string) error {
	args := m.Called(ctx, id, username)
	return args.Error(0)
}

func (m *MockUserStore) RequestEmailChange(ctx context.Context, id string, email string) (*userstore.User, error) {
	args := m.Called(ctx, id, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) ListAuthProviders(ctx context.Context, id string) ([]*userstore.AuthProvider, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return []*userstore.AuthProvider{}, args.Error(1)
	}
	return args.Get(0).([]*userstore.AuthProvider), args.Error(1)
}

func (m *MockUserStore) UnlinkAuthProvider(ctx context.Context, id string, provider string) error {
	args := m.Called(ctx, id, provider)
	return args.Error(0)
}

func (m *MockUserStore) SetActive(ctx context.Context, id string, active bool) error {
	args := m.Called(ctx, id, active)
	return args.Error(0)
}

func (m *MockUserStore) List(ctx context.Context, offset, limit int, search string) ([]*userstore.User, int, error) {
	args := m.Called(ctx, offset, limit, search)
	return args.Get(0).([]*userstore.User), args.Get(1).(int), args.Error(2)
}

func (m *MockUserStore) GetByIDWithPassword(ctx context.Context, id string) (*model.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockUserStore) UpsertOAuth(ctx context.Context, provider, providerID, email, displayName, avatarURL string) (*userstore.User, error) {
	args := m.Called(ctx, provider, providerID, email, displayName, avatarURL)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*userstore.User), args.Error(1)
}

func (m *MockUserStore) UpdateRole(ctx context.Context, id string, role string) error {
	args := m.Called(ctx, id, role)
	return args.Error(0)
}

type MockStorage struct {
	mock.Mock
}

func (m *MockStorage) List(ctx context.Context, path string, options storage.ListOptions) (storage.ListResult, error) {
	args := m.Called(ctx, path, options)
	return args.Get(0).(storage.ListResult), args.Error(1)
}

func (m *MockStorage) Get(ctx context.Context, path string) (io.ReadCloser, error) {
	args := m.Called(ctx, path)
	return args.Get(0).(io.ReadCloser), args.Error(1)
}

func (m *MockStorage) Put(ctx context.Context, path string, content io.Reader) error {
	args := m.Called(ctx, path, content)
	return args.Error(0)
}

func (m *MockStorage) Delete(ctx context.Context, path string) error {
	args := m.Called(ctx, path)
	return args.Error(0)
}

func (m *MockStorage) CreateFolder(ctx context.Context, path string) error {
	args := m.Called(ctx, path)
	return args.Error(0)
}

func (m *MockStorage) Stat(ctx context.Context, path string) (storage.FileInfo, error) {
	args := m.Called(ctx, path)
	return args.Get(0).(storage.FileInfo), args.Error(1)
}

func (m *MockStorage) Copy(ctx context.Context, sourcePath string, destPath string) error {
	args := m.Called(ctx, sourcePath, destPath)
	return args.Error(0)
}

func (m *MockStorage) Move(ctx context.Context, sourcePath string, destPath string) error {
	args := m.Called(ctx, sourcePath, destPath)
	return args.Error(0)
}

type MockStorageProvider struct {
	mock.Mock
	storage storage.Storage
}

func NewMockStorageProvider(storage storage.Storage) *MockStorageProvider {
	return &MockStorageProvider{storage: storage}
}

func (m *MockStorageProvider) GetStorage() storage.Storage {
	return m.storage
}

func (m *MockStorageProvider) IsRestartRequired() bool {
	return false // Default to false for tests
}

func (m *MockStorageProvider) ReloadFromRegistry() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockStorageProvider) NewStorageFromConfig(cfg *config.Config) (storage.Storage, error) {
	args := m.Called(cfg)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(storage.Storage), args.Error(1)
}

// Ensure MockStorageProvider implements the StorageProvider interface
var _ StorageProvider = (*MockStorageProvider)(nil)

// Mock types for imagor tests (only new ones not already in registry_test.go)

type MockImagorProvider struct {
	mock.Mock
}

func (m *MockImagorProvider) Config() *imagorprovider.ImagorConfig {
	args := m.Called()
	if args.Get(0) == nil {
		return nil
	}
	return args.Get(0).(*imagorprovider.ImagorConfig)
}

func (m *MockImagorProvider) Imagor() *imagor.Imagor {
	args := m.Called()
	if args.Get(0) == nil {
		return nil
	}
	return args.Get(0).(*imagor.Imagor)
}

func (m *MockImagorProvider) GenerateURL(imagePath string, params imagorpath.Params) (string, error) {
	args := m.Called(imagePath, params)
	return args.String(0), args.Error(1)
}

type MockImagorConfig struct {
	Mode           string
	BaseURL        string
	Secret         string
	Unsafe         bool
	CachePath      string
	SignerType     string
	SignerTruncate int
}

type MockTemplatePreviewRenderClient struct {
	mock.Mock
}

func (m *MockTemplatePreviewRenderClient) RenderTemplatePreview(ctx context.Context, req processing.TemplatePreviewRenderRequest) (*processing.TemplatePreviewRenderResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*processing.TemplatePreviewRenderResponse), args.Error(1)
}

// MockLicenseChecker mocks the LicenseChecker interface for use in tests.
type MockLicenseChecker struct {
	mock.Mock
}

func (m *MockLicenseChecker) GetLicenseStatus(ctx context.Context, includeDetails bool) (*license.LicenseStatus, error) {
	args := m.Called(ctx, includeDetails)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*license.LicenseStatus), args.Error(1)
}

// ---------- Multi-tenant mocks -----------------------------------------------

// MockOrgStore mocks the orgstore.Store interface.
type MockOrgStore struct {
	mock.Mock
}

func (m *MockOrgStore) CreateWithMember(ctx context.Context, ownerID, name, slug string, trialEndsAt *time.Time) (*org.Org, error) {
	args := m.Called(ctx, ownerID, name, slug, trialEndsAt)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*org.Org), args.Error(1)
}

func (m *MockOrgStore) GetByUserID(ctx context.Context, userID string) (*org.Org, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*org.Org), args.Error(1)
}

func (m *MockOrgStore) GetBySlug(ctx context.Context, slug string) (*org.Org, error) {
	args := m.Called(ctx, slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*org.Org), args.Error(1)
}

func (m *MockOrgStore) ListMembers(ctx context.Context, orgID string) ([]*org.OrgMemberView, error) {
	args := m.Called(ctx, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*org.OrgMemberView), args.Error(1)
}

func (m *MockOrgStore) AddMember(ctx context.Context, orgID, userID, role string) error {
	args := m.Called(ctx, orgID, userID, role)
	return args.Error(0)
}

func (m *MockOrgStore) RemoveMember(ctx context.Context, orgID, userID string) error {
	args := m.Called(ctx, orgID, userID)
	return args.Error(0)
}

func (m *MockOrgStore) UpdateMemberRole(ctx context.Context, orgID, userID, role string) error {
	args := m.Called(ctx, orgID, userID, role)
	return args.Error(0)
}

var _ org.OrgStore = (*MockOrgStore)(nil)

// MockSpaceStore mocks the spacestore.Store interface.
type MockSpaceStore struct {
	mock.Mock
}

func (m *MockSpaceStore) Create(ctx context.Context, s *space.Space) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockSpaceStore) RenameKey(ctx context.Context, oldKey, newKey string) error {
	args := m.Called(ctx, oldKey, newKey)
	return args.Error(0)
}

func (m *MockSpaceStore) Upsert(ctx context.Context, s *space.Space) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockSpaceStore) SoftDelete(ctx context.Context, key string) error {
	args := m.Called(ctx, key)
	return args.Error(0)
}

func (m *MockSpaceStore) Get(ctx context.Context, key string) (*space.Space, error) {
	args := m.Called(ctx, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*space.Space), args.Error(1)
}

func (m *MockSpaceStore) GetByID(ctx context.Context, id string) (*space.Space, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*space.Space), args.Error(1)
}

func (m *MockSpaceStore) List(ctx context.Context) ([]*space.Space, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*space.Space), args.Error(1)
}

func (m *MockSpaceStore) ListByOrgID(ctx context.Context, orgID string) ([]*space.Space, error) {
	args := m.Called(ctx, orgID)
	return args.Get(0).([]*space.Space), args.Error(1)
}

func (m *MockSpaceStore) ListByMemberUserID(ctx context.Context, userID string) ([]*space.Space, error) {
	for _, expected := range m.ExpectedCalls {
		if expected.Method == "ListByMemberUserID" {
			args := m.Called(ctx, userID)
			return args.Get(0).([]*space.Space), args.Error(1)
		}
	}
	return []*space.Space{}, nil
}

func (m *MockSpaceStore) Delta(ctx context.Context, since time.Time) (*space.DeltaResult, error) {
	args := m.Called(ctx, since)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*space.DeltaResult), args.Error(1)
}

func (m *MockSpaceStore) KeyExists(ctx context.Context, key string) (bool, error) {
	args := m.Called(ctx, key)
	return args.Bool(0), args.Error(1)
}

func (m *MockSpaceStore) ListMembers(ctx context.Context, spaceID string) ([]*space.SpaceMemberView, error) {
	for _, expected := range m.ExpectedCalls {
		if expected.Method == "ListMembers" {
			args := m.Called(ctx, spaceID)
			if args.Get(0) == nil {
				return nil, args.Error(1)
			}
			return args.Get(0).([]*space.SpaceMemberView), args.Error(1)
		}
	}
	return []*space.SpaceMemberView{}, nil
}

func (m *MockSpaceStore) AddMember(ctx context.Context, spaceID, userID, role string) error {
	args := m.Called(ctx, spaceID, userID, role)
	return args.Error(0)
}

func (m *MockSpaceStore) RemoveMember(ctx context.Context, spaceID, userID string) error {
	args := m.Called(ctx, spaceID, userID)
	return args.Error(0)
}

func (m *MockSpaceStore) UpdateMemberRole(ctx context.Context, spaceID, userID, role string) error {
	args := m.Called(ctx, spaceID, userID, role)
	return args.Error(0)
}

func (m *MockSpaceStore) HasMember(ctx context.Context, spaceID, userID string) (bool, error) {
	for _, expected := range m.ExpectedCalls {
		if expected.Method == "HasMember" {
			args := m.Called(ctx, spaceID, userID)
			return args.Bool(0), args.Error(1)
		}
	}
	return false, nil
}

var _ space.SpaceStore = (*MockSpaceStore)(nil)

type MockSpaceInviteStore struct {
	mock.Mock
}

func (m *MockSpaceInviteStore) CreateOrRefreshPending(ctx context.Context, orgID, spaceID, email, role, invitedByUserID string, expiresAt time.Time) (*space.Invitation, error) {
	args := m.Called(ctx, orgID, spaceID, email, role, invitedByUserID, expiresAt)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*space.Invitation), args.Error(1)
}

func (m *MockSpaceInviteStore) ListPendingBySpace(ctx context.Context, orgID, spaceID string) ([]*space.Invitation, error) {
	args := m.Called(ctx, orgID, spaceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*space.Invitation), args.Error(1)
}

func (m *MockSpaceInviteStore) GetPendingByToken(ctx context.Context, token string) (*space.Invitation, error) {
	args := m.Called(ctx, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*space.Invitation), args.Error(1)
}

func (m *MockSpaceInviteStore) MarkAccepted(ctx context.Context, id string, acceptedAt time.Time) error {
	args := m.Called(ctx, id, acceptedAt)
	return args.Error(0)
}

var _ space.SpaceInviteStore = (*MockSpaceInviteStore)(nil)

type MockInviteSender struct {
	mock.Mock
}

func (m *MockInviteSender) SendSpaceInvitation(ctx context.Context, params space.EmailParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

var _ space.InviteSender = (*MockInviteSender)(nil)

// MockRegistryStore mocks the registrystore.Store interface for tests that need it.
// (Only defined here if not already defined by registry_test.go in this package.)

// ---------- Test resolver helper ---------------------------------------------

// newTestResolver creates a Resolver with nil org/space stores — for tests that
// pre-date multi-tenancy and don't need those stores.
func newTestResolver(
	sp StorageProvider,
	rs registrystore.Store,
	us userstore.Store,
	ip ImagorProvider,
	cfg ConfigProvider,
	lc LicenseChecker,
	logger *zap.Logger,
) *Resolver {
	return NewResolver(sp, rs, us, ip, cfg, lc, logger, nil, nil, nil, nil)
}

// createAdminContextWithOrg creates an admin context that carries an OrgID claim.
func createAdminContextWithOrg(userID, orgID string) context.Context {
	claims := &auth.Claims{
		UserID: userID,
		OrgID:  orgID,
		Role:   "admin",
		Scopes: []string{"read", "write", "admin"},
	}
	ctx := auth.SetClaimsInContext(context.Background(), claims)
	return context.WithValue(ctx, UserIDContextKey, userID)
}

// createReadWriteContextWithOrg creates an authenticated (non-admin) context with OrgID.
func createReadWriteContextWithOrg(userID, orgID string) context.Context {
	claims := &auth.Claims{
		UserID: userID,
		OrgID:  orgID,
		Role:   "user",
		Scopes: []string{"read", "write"},
	}
	ctx := auth.SetClaimsInContext(context.Background(), claims)
	return context.WithValue(ctx, UserIDContextKey, userID)
}
