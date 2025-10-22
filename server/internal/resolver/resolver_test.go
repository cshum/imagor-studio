package resolver

import (
	"context"
	"io"

	"github.com/cshum/imagor-studio/server/internal/auth"
	"github.com/cshum/imagor-studio/server/internal/config"
	"github.com/cshum/imagor-studio/server/internal/imagorprovider"
	"github.com/cshum/imagor-studio/server/internal/model"
	"github.com/cshum/imagor-studio/server/internal/storage"
	"github.com/cshum/imagor-studio/server/internal/userstore"
	"github.com/cshum/imagor/imagorpath"
	"github.com/stretchr/testify/mock"
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

func (m *MockUserStore) SetActive(ctx context.Context, id string, active bool) error {
	args := m.Called(ctx, id, active)
	return args.Error(0)
}

func (m *MockUserStore) List(ctx context.Context, offset, limit int) ([]*userstore.User, int, error) {
	args := m.Called(ctx, offset, limit)
	return args.Get(0).([]*userstore.User), args.Get(1).(int), args.Error(2)
}

func (m *MockUserStore) GetByIDWithPassword(ctx context.Context, id string) (*model.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
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

func (m *MockImagorProvider) GetConfig() *imagorprovider.ImagorConfig {
	args := m.Called()
	if args.Get(0) == nil {
		return nil
	}
	return args.Get(0).(*imagorprovider.ImagorConfig)
}

func (m *MockImagorProvider) IsRestartRequired() bool {
	args := m.Called()
	return args.Bool(0)
}

func (m *MockImagorProvider) ReloadFromRegistry() error {
	args := m.Called()
	return args.Error(0)
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
