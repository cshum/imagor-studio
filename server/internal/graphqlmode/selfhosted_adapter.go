package graphqlmode

import (
	"context"

	"github.com/99designs/gqlgen/graphql"
	sharedgql "github.com/cshum/imagor-studio/server/internal/generated/gql"
	selfhostedgql "github.com/cshum/imagor-studio/server/internal/generated/gql/selfhosted"
	"github.com/cshum/imagor-studio/server/internal/resolver"
)

type selfHostedRootAdapter struct{ *resolver.Resolver }
type selfHostedMutationAdapter struct{ *resolver.Resolver }
type selfHostedQueryAdapter struct{ *resolver.Resolver }

var _ = selfHostedRootAdapter{}

func (r selfHostedRootAdapter) Mutation() selfhostedgql.MutationResolver {
	return selfHostedMutationAdapter{Resolver: r.Resolver}
}

func (r selfHostedRootAdapter) Query() selfhostedgql.QueryResolver {
	return selfHostedQueryAdapter{Resolver: r.Resolver}
}

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

func (r selfHostedQueryAdapter) User(ctx context.Context, id string) (*selfhostedgql.User, error) {
	user, err := r.Resolver.Query().User(ctx, id)
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

func (r selfHostedMutationAdapter) UploadFile(ctx context.Context, path string, spaceKey *string, content graphql.Upload) (bool, error) {
	return r.Resolver.Mutation().UploadFile(ctx, path, spaceKey, content)
}

func (r selfHostedMutationAdapter) DeleteFile(ctx context.Context, path string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().DeleteFile(ctx, path, spaceKey)
}

func (r selfHostedMutationAdapter) CreateFolder(ctx context.Context, path string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().CreateFolder(ctx, path, spaceKey)
}

func (r selfHostedMutationAdapter) CopyFile(ctx context.Context, sourcePath string, destPath string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().CopyFile(ctx, sourcePath, destPath, spaceKey)
}

func (r selfHostedMutationAdapter) MoveFile(ctx context.Context, sourcePath string, destPath string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().MoveFile(ctx, sourcePath, destPath, spaceKey)
}

func (r selfHostedMutationAdapter) SaveTemplate(ctx context.Context, input selfhostedgql.SaveTemplateInput, spaceKey *string) (*selfhostedgql.TemplateResult, error) {
	sharedInput := sharedgql.SaveTemplateInput{
		Name:            input.Name,
		Description:     input.Description,
		DimensionMode:   sharedgql.DimensionMode(input.DimensionMode),
		TemplateJSON:    input.TemplateJSON,
		SourceImagePath: input.SourceImagePath,
		SavePath:        input.SavePath,
		Overwrite:       input.Overwrite,
	}
	result, err := r.Resolver.Mutation().SaveTemplate(ctx, sharedInput, spaceKey)
	if err != nil {
		return nil, err
	}
	return mapSharedTemplateResultToSelfHosted(result), nil
}

func (r selfHostedMutationAdapter) RegenerateTemplatePreview(ctx context.Context, templatePath string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().RegenerateTemplatePreview(ctx, templatePath, spaceKey)
}

func (r selfHostedMutationAdapter) ConfigureFileStorage(ctx context.Context, input selfhostedgql.FileStorageInput) (*selfhostedgql.StorageConfigResult, error) {
	sharedInput := sharedgql.FileStorageInput(input)
	result, err := r.Resolver.Mutation().ConfigureFileStorage(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedStorageConfigResultToSelfHosted(result), nil
}

func (r selfHostedMutationAdapter) ConfigureS3Storage(ctx context.Context, input selfhostedgql.S3StorageInput) (*selfhostedgql.StorageConfigResult, error) {
	sharedInput := sharedgql.S3StorageInput(input)
	result, err := r.Resolver.Mutation().ConfigureS3Storage(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedStorageConfigResultToSelfHosted(result), nil
}

func (r selfHostedMutationAdapter) TestStorageConfig(ctx context.Context, input selfhostedgql.StorageConfigInput) (*selfhostedgql.StorageTestResult, error) {
	sharedInput := sharedgql.StorageConfigInput{Type: sharedgql.StorageType(input.Type)}
	if input.FileConfig != nil {
		sharedInput.FileConfig = &sharedgql.FileStorageInput{
			BaseDir:          input.FileConfig.BaseDir,
			MkdirPermissions: input.FileConfig.MkdirPermissions,
			WritePermissions: input.FileConfig.WritePermissions,
		}
	}
	if input.S3Config != nil {
		sharedInput.S3Config = &sharedgql.S3StorageInput{
			Bucket:          input.S3Config.Bucket,
			Region:          input.S3Config.Region,
			Endpoint:        input.S3Config.Endpoint,
			ForcePathStyle:  input.S3Config.ForcePathStyle,
			AccessKeyID:     input.S3Config.AccessKeyID,
			SecretAccessKey: input.S3Config.SecretAccessKey,
			SessionToken:    input.S3Config.SessionToken,
			BaseDir:         input.S3Config.BaseDir,
		}
	}
	result, err := r.Resolver.Mutation().TestStorageConfig(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedStorageTestResultToSelfHosted(result), nil
}

func (r selfHostedMutationAdapter) ConfigureImagor(ctx context.Context, input selfhostedgql.ImagorInput) (*selfhostedgql.ImagorConfigResult, error) {
	sharedInput := sharedgql.ImagorInput{
		Secret:         input.Secret,
		SignerTruncate: input.SignerTruncate,
	}
	if input.SignerType != nil {
		v := sharedgql.ImagorSignerType(*input.SignerType)
		sharedInput.SignerType = &v
	}
	result, err := r.Resolver.Mutation().ConfigureImagor(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedImagorConfigResultToSelfHosted(result), nil
}

func (r selfHostedMutationAdapter) GenerateImagorURL(ctx context.Context, imagePath string, params selfhostedgql.ImagorParamsInput) (string, error) {
	sharedParams := sharedgql.ImagorParamsInput{
		Width:         params.Width,
		Height:        params.Height,
		CropLeft:      params.CropLeft,
		CropTop:       params.CropTop,
		CropRight:     params.CropRight,
		CropBottom:    params.CropBottom,
		FitIn:         params.FitIn,
		Stretch:       params.Stretch,
		PaddingLeft:   params.PaddingLeft,
		PaddingTop:    params.PaddingTop,
		PaddingRight:  params.PaddingRight,
		PaddingBottom: params.PaddingBottom,
		HFlip:         params.HFlip,
		VFlip:         params.VFlip,
		HAlign:        params.HAlign,
		VAlign:        params.VAlign,
		Smart:         params.Smart,
		Trim:          params.Trim,
		TrimBy:        params.TrimBy,
		TrimTolerance: params.TrimTolerance,
	}
	if len(params.Filters) > 0 {
		sharedParams.Filters = make([]*sharedgql.ImagorFilterInput, 0, len(params.Filters))
		for _, filter := range params.Filters {
			if filter == nil {
				sharedParams.Filters = append(sharedParams.Filters, nil)
				continue
			}
			sharedParams.Filters = append(sharedParams.Filters, &sharedgql.ImagorFilterInput{Name: filter.Name, Args: filter.Args})
		}
	}
	return r.Resolver.Mutation().GenerateImagorURL(ctx, imagePath, sharedParams)
}

func (r selfHostedMutationAdapter) GenerateImagorURLFromTemplate(ctx context.Context, templateJSON string, imagePath *string, contextPath []string, forPreview *bool, previewMaxDimensions *selfhostedgql.DimensionsInput, skipLayerID *string, appendFilters []*selfhostedgql.ImagorFilterInput) (string, error) {
	var sharedPreview *sharedgql.DimensionsInput
	if previewMaxDimensions != nil {
		v := sharedgql.DimensionsInput(*previewMaxDimensions)
		sharedPreview = &v
	}
	sharedFilters := make([]*sharedgql.ImagorFilterInput, 0, len(appendFilters))
	for _, filter := range appendFilters {
		if filter == nil {
			sharedFilters = append(sharedFilters, nil)
			continue
		}
		v := sharedgql.ImagorFilterInput(*filter)
		sharedFilters = append(sharedFilters, &v)
	}
	return r.Resolver.Mutation().GenerateImagorURLFromTemplate(ctx, templateJSON, imagePath, contextPath, forPreview, sharedPreview, skipLayerID, sharedFilters)
}

func (r selfHostedMutationAdapter) SetUserRegistry(ctx context.Context, entry *selfhostedgql.RegistryEntryInput, entries []*selfhostedgql.RegistryEntryInput, ownerID *string) ([]*selfhostedgql.UserRegistry, error) {
	var sharedEntry *sharedgql.RegistryEntryInput
	if entry != nil {
		v := sharedgql.RegistryEntryInput(*entry)
		sharedEntry = &v
	}
	sharedEntries := make([]*sharedgql.RegistryEntryInput, 0, len(entries))
	for _, item := range entries {
		if item == nil {
			sharedEntries = append(sharedEntries, nil)
			continue
		}
		v := sharedgql.RegistryEntryInput(*item)
		sharedEntries = append(sharedEntries, &v)
	}
	result, err := r.Resolver.Mutation().SetUserRegistry(ctx, sharedEntry, sharedEntries, ownerID)
	if err != nil {
		return nil, err
	}
	return mapSharedUserRegistriesToSelfHosted(result), nil
}

func (r selfHostedMutationAdapter) DeleteUserRegistry(ctx context.Context, key *string, keys []string, ownerID *string) (bool, error) {
	return r.Resolver.Mutation().DeleteUserRegistry(ctx, key, keys, ownerID)
}

func (r selfHostedMutationAdapter) SetSystemRegistry(ctx context.Context, entry *selfhostedgql.RegistryEntryInput, entries []*selfhostedgql.RegistryEntryInput) ([]*selfhostedgql.SystemRegistry, error) {
	var sharedEntry *sharedgql.RegistryEntryInput
	if entry != nil {
		v := sharedgql.RegistryEntryInput(*entry)
		sharedEntry = &v
	}
	sharedEntries := make([]*sharedgql.RegistryEntryInput, 0, len(entries))
	for _, item := range entries {
		if item == nil {
			sharedEntries = append(sharedEntries, nil)
			continue
		}
		v := sharedgql.RegistryEntryInput(*item)
		sharedEntries = append(sharedEntries, &v)
	}
	result, err := r.Resolver.Mutation().SetSystemRegistry(ctx, sharedEntry, sharedEntries)
	if err != nil {
		return nil, err
	}
	return mapSharedSystemRegistriesToSelfHosted(result), nil
}

func (r selfHostedMutationAdapter) DeleteSystemRegistry(ctx context.Context, key *string, keys []string) (bool, error) {
	return r.Resolver.Mutation().DeleteSystemRegistry(ctx, key, keys)
}

func (r selfHostedMutationAdapter) ChangePassword(ctx context.Context, input selfhostedgql.ChangePasswordInput, userID *string) (bool, error) {
	sharedInput := sharedgql.ChangePasswordInput{
		CurrentPassword: input.CurrentPassword,
		NewPassword:     input.NewPassword,
	}
	return r.Resolver.Mutation().ChangePassword(ctx, sharedInput, userID)
}

func (r selfHostedMutationAdapter) DeactivateAccount(ctx context.Context, userID *string) (bool, error) {
	return r.Resolver.Mutation().DeactivateAccount(ctx, userID)
}

func (r selfHostedMutationAdapter) ReactivateAccount(ctx context.Context, userID string) (bool, error) {
	return r.Resolver.Mutation().ReactivateAccount(ctx, userID)
}

func (r selfHostedMutationAdapter) UnlinkAuthProvider(ctx context.Context, provider string, userID *string) (bool, error) {
	return r.Resolver.Mutation().UnlinkAuthProvider(ctx, provider, userID)
}

func (r selfHostedMutationAdapter) UpdateProfile(ctx context.Context, input selfhostedgql.UpdateProfileInput, userID *string) (*selfhostedgql.User, error) {
	sharedInput := sharedgql.UpdateProfileInput{
		DisplayName: input.DisplayName,
		Username:    input.Username,
	}
	user, err := r.Resolver.Mutation().UpdateProfile(ctx, sharedInput, userID)
	if err != nil {
		return nil, err
	}
	return mapSharedUserToSelfHosted(user), nil
}

func (r selfHostedMutationAdapter) CreateUser(ctx context.Context, input selfhostedgql.CreateUserInput) (*selfhostedgql.User, error) {
	sharedInput := sharedgql.CreateUserInput{
		DisplayName: input.DisplayName,
		Username:    input.Username,
		Password:    input.Password,
		Role:        input.Role,
	}
	user, err := r.Resolver.Mutation().CreateUser(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedUserToSelfHosted(user), nil
}
