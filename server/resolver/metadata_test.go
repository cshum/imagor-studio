package resolver

import (
	"context"
	"github.com/cshum/imagor-studio/server/pkg/metadatastore"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

type MockMetadataStore struct {
	mock.Mock
}

func (m *MockMetadataStore) List(ctx context.Context, ownerID string, prefix *string) ([]*metadatastore.Metadata, error) {
	args := m.Called(ctx, ownerID, prefix)
	return args.Get(0).([]*metadatastore.Metadata), args.Error(1)
}

func (m *MockMetadataStore) Get(ctx context.Context, ownerID, key string) (*metadatastore.Metadata, error) {
	args := m.Called(ctx, ownerID, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*metadatastore.Metadata), args.Error(1)
}

func (m *MockMetadataStore) Set(ctx context.Context, ownerID, key, value string) (*metadatastore.Metadata, error) {
	args := m.Called(ctx, ownerID, key, value)
	return args.Get(0).(*metadatastore.Metadata), args.Error(1)
}

func (m *MockMetadataStore) Delete(ctx context.Context, ownerID, key string) error {
	args := m.Called(ctx, ownerID, key)
	return args.Error(0)
}

// Metadata tests
func TestListMetadata(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	prefix := "app:"

	now := time.Now()
	mockMetadata := []*metadatastore.Metadata{
		{Key: "app:setting1", Value: "value1", CreatedAt: now, UpdatedAt: now},
		{Key: "app:setting2", Value: "value2", CreatedAt: now, UpdatedAt: now},
	}

	mockMetadataStore.On("List", ctx, "test-owner-id", &prefix).Return(mockMetadata, nil)

	result, err := resolver.Query().ListMetadata(ctx, &prefix)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result, 2)
	assert.Equal(t, "app:setting1", result[0].Key)
	assert.Equal(t, "value1", result[0].Value)

	mockMetadataStore.AssertExpectations(t)
}

func TestGetMetadata(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	key := "app:setting1"

	now := time.Now()
	mockMetadata := &metadatastore.Metadata{
		Key:       key,
		Value:     "value1",
		CreatedAt: now,
		UpdatedAt: now,
	}

	mockMetadataStore.On("Get", ctx, "test-owner-id", key).Return(mockMetadata, nil)

	result, err := resolver.Query().GetMetadata(ctx, key)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, key, result.Key)
	assert.Equal(t, "value1", result.Value)

	mockMetadataStore.AssertExpectations(t)
}

func TestGetMetadataNotFound(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	key := "non-existent"

	mockMetadataStore.On("Get", ctx, "test-owner-id", key).Return(nil, nil)

	result, err := resolver.Query().GetMetadata(ctx, key)

	assert.NoError(t, err)
	assert.Nil(t, result)

	mockMetadataStore.AssertExpectations(t)
}

func TestSetMetadata(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	key := "app:new-setting"
	value := "new-value"

	now := time.Now()
	resultMetadata := &metadatastore.Metadata{
		Key:       key,
		Value:     value,
		CreatedAt: now,
		UpdatedAt: now,
	}

	mockMetadataStore.On("Set", ctx, "test-owner-id", key, value).Return(resultMetadata, nil)

	result, err := resolver.Mutation().SetMetadata(ctx, key, value)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, key, result.Key)
	assert.Equal(t, value, result.Value)

	mockMetadataStore.AssertExpectations(t)
}

func TestDeleteMetadata(t *testing.T) {
	mockStorage := new(MockStorage)
	mockMetadataStore := new(MockMetadataStore)
	logger, _ := zap.NewDevelopment()
	resolver := NewResolver(mockStorage, mockMetadataStore, logger)

	ctx := context.WithValue(context.Background(), OwnerIDContextKey, "test-owner-id")
	key := "app:setting-to-delete"

	mockMetadataStore.On("Delete", ctx, "test-owner-id", key).Return(nil)

	result, err := resolver.Mutation().DeleteMetadata(ctx, key)

	assert.NoError(t, err)
	assert.True(t, result)

	mockMetadataStore.AssertExpectations(t)
}
