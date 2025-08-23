package resolver

import (
	"context"
	"io"

	"github.com/cshum/imagor-studio/server/model"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/userstore"
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
	return context.WithValue(ctx, OwnerIDContextKey, userID)
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

func (m *MockUserStore) UpdateDisplayName(ctx context.context.Context, id string, displayName string) error {
	//TODO implement me
	panic("implement me")
}

func (m *MockUserStore) Create(ctx context.Context, username, email, hashedPassword, role string) (*userstore.User, error) {
	args := m.Called(ctx, username, email, hashedPassword, role)
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

func (m *MockUserStore) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	args := m.Called(ctx, email)
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

func (m *MockUserStore) UpdateUsername(ctx context.Context, id string, username string) error {
	args := m.Called(ctx, id, username)
	return args.Error(0)
}

func (m *MockUserStore) UpdateEmail(ctx context.Context, id string, email string) error {
	args := m.Called(ctx, id, email)
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
