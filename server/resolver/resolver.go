package resolver

import (
	"context"
	"fmt"

	"github.com/cshum/imagor-studio/server/gql"
	"github.com/cshum/imagor-studio/server/pkg/auth"
	"github.com/cshum/imagor-studio/server/pkg/metadatastore"
	"github.com/cshum/imagor-studio/server/pkg/storage"
	"github.com/cshum/imagor-studio/server/pkg/userstore"
	"go.uber.org/zap"
)

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

func (r *mutationResolver) requirePermission(ctx context.Context, requiredScope string) error {
	claims, err := auth.GetClaimsFromContext(ctx)
	if err != nil {
		return fmt.Errorf("unauthorized")
	}
	hasWriteScope := false
	for _, scope := range claims.Scopes {
		if scope == requiredScope {
			hasWriteScope = true
			break
		}
	}
	if !hasWriteScope {
		return fmt.Errorf("insufficient permission: %s", requiredScope)
	}
	return nil
}

// Helper function to check write permissions
func (r *mutationResolver) requireWritePermission(ctx context.Context) error {
	return r.requirePermission(ctx, "write")
}

// Helper function to check admin permissions
func (r *mutationResolver) requireAdminPermission(ctx context.Context) error {
	return r.requirePermission(ctx, "admin")
}
