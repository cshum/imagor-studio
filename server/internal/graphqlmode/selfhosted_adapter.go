package graphqlmode

import (
	"context"

	sharedgql "github.com/cshum/imagor-studio/server/internal/generated/gql"
	selfhostedgql "github.com/cshum/imagor-studio/server/internal/generated/gql/selfhosted"
	"github.com/cshum/imagor-studio/server/internal/resolver"
)

type selfHostedRootAdapter struct{ *resolver.Resolver }
type selfHostedMutationAdapter struct{ *resolver.Resolver }
type selfHostedQueryAdapter struct{ *resolver.Resolver }

var _ = selfHostedRootAdapter{}

func (r selfHostedQueryAdapter) LicenseStatus(ctx context.Context) (*selfhostedgql.LicenseStatus, error) {
	status, err := r.Resolver.Query().LicenseStatus(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedLicenseStatusToSelfHosted(status), nil
}

func (r selfHostedQueryAdapter) ImagorStatus(ctx context.Context) (*selfhostedgql.ImagorStatus, error) {
	status, err := r.Resolver.Query().ImagorStatus(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedImagorStatusToSelfHosted(status), nil
}

func (r selfHostedQueryAdapter) Me(ctx context.Context) (*selfhostedgql.User, error) {
	user, err := r.Resolver.Query().Me(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedUserToSelfHosted(user), nil
}

func (r selfHostedQueryAdapter) Users(ctx context.Context, offset *int, limit *int, search *string) (*selfhostedgql.UserList, error) {
	users, err := r.Resolver.Query().Users(ctx, offset, limit, search)
	if err != nil {
		return nil, err
	}
	return mapSharedUserListToSelfHosted(users), nil
}

func (r selfHostedQueryAdapter) ListUserRegistry(ctx context.Context, prefix *string, ownerID *string) ([]*selfhostedgql.UserRegistry, error) {
	registries, err := r.Resolver.Query().ListUserRegistry(ctx, prefix, ownerID)
	if err != nil {
		return nil, err
	}
	return mapSharedUserRegistriesToSelfHosted(registries), nil
}

func (r selfHostedQueryAdapter) GetUserRegistry(ctx context.Context, key *string, keys []string, ownerID *string) ([]*selfhostedgql.UserRegistry, error) {
	registries, err := r.Resolver.Query().GetUserRegistry(ctx, key, keys, ownerID)
	if err != nil {
		return nil, err
	}
	return mapSharedUserRegistriesToSelfHosted(registries), nil
}

func (r selfHostedQueryAdapter) ListSystemRegistry(ctx context.Context, prefix *string) ([]*selfhostedgql.SystemRegistry, error) {
	registries, err := r.Resolver.Query().ListSystemRegistry(ctx, prefix)
	if err != nil {
		return nil, err
	}
	return mapSharedSystemRegistriesToSelfHosted(registries), nil
}

func (r selfHostedQueryAdapter) GetSystemRegistry(ctx context.Context, key *string, keys []string) ([]*selfhostedgql.SystemRegistry, error) {
	registries, err := r.Resolver.Query().GetSystemRegistry(ctx, key, keys)
	if err != nil {
		return nil, err
	}
	return mapSharedSystemRegistriesToSelfHosted(registries), nil
}

func (r selfHostedQueryAdapter) StorageStatus(ctx context.Context) (*selfhostedgql.StorageStatus, error) {
	status, err := r.Resolver.Query().StorageStatus(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedStorageStatusToSelfHosted(status), nil
}

func (r selfHostedQueryAdapter) ListFiles(ctx context.Context, path string, spaceKey *string, offset *int, limit *int, onlyFiles *bool, onlyFolders *bool, extensions *string, showHidden *bool, sortBy *selfhostedgql.SortOption, sortOrder *selfhostedgql.SortOrder) (*selfhostedgql.FileList, error) {
	var sharedSortBy *sharedgql.SortOption
	if sortBy != nil {
		v := sharedgql.SortOption(*sortBy)
		sharedSortBy = &v
	}
	var sharedSortOrder *sharedgql.SortOrder
	if sortOrder != nil {
		v := sharedgql.SortOrder(*sortOrder)
		sharedSortOrder = &v
	}
	list, err := r.Resolver.Query().ListFiles(ctx, path, spaceKey, offset, limit, onlyFiles, onlyFolders, extensions, showHidden, sharedSortBy, sharedSortOrder)
	if err != nil {
		return nil, err
	}
	return mapSharedFileListToSelfHosted(list), nil
}

func (r selfHostedQueryAdapter) StatFile(ctx context.Context, path string, spaceKey *string) (*selfhostedgql.FileStat, error) {
	stat, err := r.Resolver.Query().StatFile(ctx, path, spaceKey)
	if err != nil {
		return nil, err
	}
	return mapSharedFileStatToSelfHosted(stat), nil
}

func (r selfHostedMutationAdapter) RequestEmailChange(ctx context.Context, email string, userID *string) (*selfhostedgql.EmailChangeRequestResult, error) {
	result, err := r.Resolver.Mutation().RequestEmailChange(ctx, email, userID)
	if err != nil {
		return nil, err
	}
	return mapSharedEmailChangeRequestResultToSelfHosted(result), nil
}
