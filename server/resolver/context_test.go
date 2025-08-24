package resolver

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestWithUserID(t *testing.T) {
	ctx := context.Background()
	ownerID := "test-owner-123"

	// Add owner ID to context
	ctxWithOwner := WithUserID(ctx, ownerID)

	// Verify the owner ID is in the context
	value := ctxWithOwner.Value(UserIDContextKey)
	assert.NotNil(t, value)
	assert.Equal(t, ownerID, value.(string))
}

func TestGetOwnerIDFromContext(t *testing.T) {
	tests := []struct {
		name         string
		setupContext func() context.Context
		expectError  bool
		expectedID   string
	}{
		{
			name: "Valid owner ID in context",
			setupContext: func() context.Context {
				ctx := context.Background()
				return WithUserID(ctx, "test-owner-123")
			},
			expectError: false,
			expectedID:  "test-owner-123",
		},
		{
			name: "No owner ID in context",
			setupContext: func() context.Context {
				return context.Background()
			},
			expectError: true,
		},
		{
			name: "Wrong type in context",
			setupContext: func() context.Context {
				ctx := context.Background()
				return context.WithValue(ctx, UserIDContextKey, 12345) // int instead of string
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := tt.setupContext()
			ownerID, err := GetUserIDFromContext(ctx)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "owner ID not found in context")
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedID, ownerID)
			}
		})
	}
}
