package graphqlmode

import (
	"context"

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
