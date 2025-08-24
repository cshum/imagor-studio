package resolver

import (
	"context"
	"fmt"

	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/pkg/metadatastore"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/userstore"
	"go.uber.org/zap"
)

const SystemOwnerID = "system"

type Resolver struct {
	storage       storage.Storage
	metadataStore metadatastore.Store
	userStore     userstore.Store
	logger        *zap.Logger
}

func NewResolver(storage storage.Storage, metadataStore metadatastore.Store, userStore userstore.Store, logger *zap.Logger) *Resolver {
	return &Resolver{
		storage:       storage,
		metadataStore: metadataStore,
		userStore:     userStore,
		logger:        logger,
	}
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() gql.MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() gql.QueryResolver { return &queryResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }

// Helper function to determine effective owner ID for user metadata operations
func (r *mutationResolver) getEffectiveUserOwnerID(ctx context.Context, providedOwnerID *string) (string, error) {
	currentUserID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get current user ID: %w", err)
	}

	// Guests cannot manage user metadata
	if isGuestUser(ctx) {
		return "", fmt.Errorf("guests cannot manage user metadata")
	}

	// If no ownerID provided, use current user
	if providedOwnerID == nil {
		return currentUserID, nil
	}

	targetOwnerID := *providedOwnerID

	// Users can only access their own metadata, admins can access any user's metadata
	if targetOwnerID != currentUserID {
		if err := requireAdminPermission(ctx); err != nil {
			return "", fmt.Errorf("admin permission required to access other user's metadata: %w", err)
		}
	}

	return targetOwnerID, nil
}

// Helper function for user metadata queries (more permissive for reads)
func (r *queryResolver) getEffectiveUserOwnerIDForQuery(ctx context.Context, providedOwnerID *string) (string, error) {
	currentUserID, err := GetOwnerIDFromContext(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get current user ID: %w", err)
	}

	// If no ownerID provided, use current user (even for guests)
	if providedOwnerID == nil {
		return currentUserID, nil
	}

	targetOwnerID := *providedOwnerID

	// Users can read their own metadata, admins can read any user's metadata
	if targetOwnerID != currentUserID {
		if err := requireAdminPermission(ctx); err != nil {
			return "", fmt.Errorf("admin permission required to access other user's metadata: %w", err)
		}
	}

	return targetOwnerID, nil
}
