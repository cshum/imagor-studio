package graphqlmode

import (
	"context"

	"github.com/99designs/gqlgen/graphql"
	sharedgql "github.com/cshum/imagor-studio/server/internal/generated/gql"
	cloudgql "github.com/cshum/imagor-studio/server/internal/generated/gql/cloud"
	"github.com/cshum/imagor-studio/server/internal/resolver"
)

type cloudRootAdapter struct{ *resolver.Resolver }
type cloudMutationAdapter struct{ *resolver.Resolver }
type cloudQueryAdapter struct{ *resolver.Resolver }

func (r cloudRootAdapter) Mutation() cloudgql.MutationResolver {
	return cloudMutationAdapter{Resolver: r.Resolver}
}

func (r cloudRootAdapter) Query() cloudgql.QueryResolver {
	return cloudQueryAdapter{Resolver: r.Resolver}
}

func (r cloudQueryAdapter) ListFiles(ctx context.Context, path string, spaceKey *string, offset *int, limit *int, onlyFiles *bool, onlyFolders *bool, extensions *string, showHidden *bool, sortBy *cloudgql.SortOption, sortOrder *cloudgql.SortOrder) (*cloudgql.FileList, error) {
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
	return mapSharedFileListToCloud(list), nil
}

func (r cloudQueryAdapter) StatFile(ctx context.Context, path string, spaceKey *string) (*cloudgql.FileStat, error) {
	stat, err := r.Resolver.Query().StatFile(ctx, path, spaceKey)
	if err != nil {
		return nil, err
	}
	return mapSharedFileStatToCloud(stat), nil
}

func (r cloudQueryAdapter) StorageStatus(ctx context.Context) (*cloudgql.StorageStatus, error) {
	status, err := r.Resolver.Query().StorageStatus(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedStorageStatusToCloud(status), nil
}

func (r cloudQueryAdapter) ImagorStatus(ctx context.Context) (*cloudgql.ImagorStatus, error) {
	status, err := r.Resolver.Query().ImagorStatus(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedImagorStatusToCloud(status), nil
}

func (r cloudQueryAdapter) ListUserRegistry(ctx context.Context, prefix *string, ownerID *string) ([]*cloudgql.UserRegistry, error) {
	registries, err := r.Resolver.Query().ListUserRegistry(ctx, prefix, ownerID)
	if err != nil {
		return nil, err
	}
	return mapSharedUserRegistriesToCloud(registries), nil
}

func (r cloudQueryAdapter) GetUserRegistry(ctx context.Context, key *string, keys []string, ownerID *string) ([]*cloudgql.UserRegistry, error) {
	registries, err := r.Resolver.Query().GetUserRegistry(ctx, key, keys, ownerID)
	if err != nil {
		return nil, err
	}
	return mapSharedUserRegistriesToCloud(registries), nil
}

func (r cloudQueryAdapter) ListSystemRegistry(ctx context.Context, prefix *string) ([]*cloudgql.SystemRegistry, error) {
	registries, err := r.Resolver.Query().ListSystemRegistry(ctx, prefix)
	if err != nil {
		return nil, err
	}
	return mapSharedSystemRegistriesToCloud(registries), nil
}

func (r cloudQueryAdapter) GetSystemRegistry(ctx context.Context, key *string, keys []string) ([]*cloudgql.SystemRegistry, error) {
	registries, err := r.Resolver.Query().GetSystemRegistry(ctx, key, keys)
	if err != nil {
		return nil, err
	}
	return mapSharedSystemRegistriesToCloud(registries), nil
}

func (r cloudQueryAdapter) LicenseStatus(ctx context.Context) (*cloudgql.LicenseStatus, error) {
	status, err := r.Resolver.Query().LicenseStatus(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedLicenseStatusToCloud(status), nil
}

func (r cloudQueryAdapter) Me(ctx context.Context) (*cloudgql.User, error) {
	user, err := r.Resolver.Query().Me(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedUserToCloud(user), nil
}

func (r cloudQueryAdapter) User(ctx context.Context, id string) (*cloudgql.User, error) {
	user, err := r.Resolver.Query().User(ctx, id)
	if err != nil {
		return nil, err
	}
	return mapSharedUserToCloud(user), nil
}

func (r cloudQueryAdapter) Users(ctx context.Context, offset *int, limit *int, search *string) (*cloudgql.UserList, error) {
	users, err := r.Resolver.Query().Users(ctx, offset, limit, search)
	if err != nil {
		return nil, err
	}
	return mapSharedUserListToCloud(users), nil
}

func (r cloudQueryAdapter) MyOrganization(ctx context.Context) (*cloudgql.Organization, error) {
	org, err := r.Resolver.Query().MyOrganization(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedOrganizationToCloud(org), nil
}

func (r cloudQueryAdapter) Spaces(ctx context.Context) ([]*cloudgql.Space, error) {
	spaces, err := r.Resolver.Query().Spaces(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedSpacesToCloud(spaces), nil
}

func (r cloudQueryAdapter) Space(ctx context.Context, key string) (*cloudgql.Space, error) {
	space, err := r.Resolver.Query().Space(ctx, key)
	if err != nil {
		return nil, err
	}
	return mapSharedSpaceToCloud(space), nil
}

func (r cloudQueryAdapter) SpaceRegistry(ctx context.Context, spaceKey string, keys []string) ([]*cloudgql.UserRegistry, error) {
	registries, err := r.Resolver.Query().SpaceRegistry(ctx, spaceKey, keys)
	if err != nil {
		return nil, err
	}
	return mapSharedUserRegistriesToCloud(registries), nil
}

func (r cloudQueryAdapter) OrgMembers(ctx context.Context) ([]*cloudgql.OrgMember, error) {
	members, err := r.Resolver.Query().OrgMembers(ctx)
	if err != nil {
		return nil, err
	}
	return mapSharedOrgMembersToCloud(members), nil
}

func (r cloudQueryAdapter) SpaceMembers(ctx context.Context, spaceKey string) ([]*cloudgql.SpaceMember, error) {
	members, err := r.Resolver.Query().SpaceMembers(ctx, spaceKey)
	if err != nil {
		return nil, err
	}
	return mapSharedSpaceMembersToCloud(members), nil
}

func (r cloudQueryAdapter) SpaceInvitations(ctx context.Context, spaceKey string) ([]*cloudgql.SpaceInvitation, error) {
	invitations, err := r.Resolver.Query().SpaceInvitations(ctx, spaceKey)
	if err != nil {
		return nil, err
	}
	return mapSharedSpaceInvitationsToCloud(invitations), nil
}

func (r cloudQueryAdapter) SpaceKeyExists(ctx context.Context, key string) (bool, error) {
	return r.Resolver.Query().SpaceKeyExists(ctx, key)
}

func (r cloudMutationAdapter) UploadFile(ctx context.Context, path string, spaceKey *string, content graphql.Upload) (bool, error) {
	return r.Resolver.Mutation().UploadFile(ctx, path, spaceKey, content)
}

func (r cloudMutationAdapter) DeleteFile(ctx context.Context, path string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().DeleteFile(ctx, path, spaceKey)
}

func (r cloudMutationAdapter) CreateFolder(ctx context.Context, path string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().CreateFolder(ctx, path, spaceKey)
}

func (r cloudMutationAdapter) CopyFile(ctx context.Context, sourcePath string, destPath string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().CopyFile(ctx, sourcePath, destPath, spaceKey)
}

func (r cloudMutationAdapter) MoveFile(ctx context.Context, sourcePath string, destPath string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().MoveFile(ctx, sourcePath, destPath, spaceKey)
}

func (r cloudMutationAdapter) SaveTemplate(ctx context.Context, input cloudgql.SaveTemplateInput, spaceKey *string) (*cloudgql.TemplateResult, error) {
	sharedInput := sharedgql.SaveTemplateInput{Name: input.Name, Description: input.Description, DimensionMode: sharedgql.DimensionMode(input.DimensionMode), TemplateJSON: input.TemplateJSON, SourceImagePath: input.SourceImagePath, SavePath: input.SavePath, Overwrite: input.Overwrite}
	result, err := r.Resolver.Mutation().SaveTemplate(ctx, sharedInput, spaceKey)
	if err != nil {
		return nil, err
	}
	return mapSharedTemplateResultToCloud(result), nil
}

func (r cloudMutationAdapter) RegenerateTemplatePreview(ctx context.Context, templatePath string, spaceKey *string) (bool, error) {
	return r.Resolver.Mutation().RegenerateTemplatePreview(ctx, templatePath, spaceKey)
}

func (r cloudMutationAdapter) ConfigureFileStorage(ctx context.Context, input cloudgql.FileStorageInput) (*cloudgql.StorageConfigResult, error) {
	sharedInput := sharedgql.FileStorageInput(input)
	result, err := r.Resolver.Mutation().ConfigureFileStorage(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedStorageConfigResultToCloud(result), nil
}

func (r cloudMutationAdapter) ConfigureS3Storage(ctx context.Context, input cloudgql.S3StorageInput) (*cloudgql.StorageConfigResult, error) {
	sharedInput := sharedgql.S3StorageInput(input)
	result, err := r.Resolver.Mutation().ConfigureS3Storage(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedStorageConfigResultToCloud(result), nil
}

func (r cloudMutationAdapter) TestStorageConfig(ctx context.Context, input cloudgql.StorageConfigInput) (*cloudgql.StorageTestResult, error) {
	sharedInput := sharedgql.StorageConfigInput{Type: sharedgql.StorageType(input.Type)}
	if input.FileConfig != nil {
		sharedInput.FileConfig = &sharedgql.FileStorageInput{BaseDir: input.FileConfig.BaseDir, MkdirPermissions: input.FileConfig.MkdirPermissions, WritePermissions: input.FileConfig.WritePermissions}
	}
	if input.S3Config != nil {
		sharedInput.S3Config = &sharedgql.S3StorageInput{Bucket: input.S3Config.Bucket, Region: input.S3Config.Region, Endpoint: input.S3Config.Endpoint, ForcePathStyle: input.S3Config.ForcePathStyle, AccessKeyID: input.S3Config.AccessKeyID, SecretAccessKey: input.S3Config.SecretAccessKey, SessionToken: input.S3Config.SessionToken, BaseDir: input.S3Config.BaseDir}
	}
	result, err := r.Resolver.Mutation().TestStorageConfig(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedStorageTestResultToCloud(result), nil
}

func (r cloudMutationAdapter) ConfigureImagor(ctx context.Context, input cloudgql.ImagorInput) (*cloudgql.ImagorConfigResult, error) {
	sharedInput := sharedgql.ImagorInput{Secret: input.Secret, SignerTruncate: input.SignerTruncate}
	if input.SignerType != nil {
		v := sharedgql.ImagorSignerType(*input.SignerType)
		sharedInput.SignerType = &v
	}
	result, err := r.Resolver.Mutation().ConfigureImagor(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedImagorConfigResultToCloud(result), nil
}

func (r cloudMutationAdapter) GenerateImagorURL(ctx context.Context, imagePath string, params cloudgql.ImagorParamsInput) (string, error) {
	sharedParams := sharedgql.ImagorParamsInput{Width: params.Width, Height: params.Height, CropLeft: params.CropLeft, CropTop: params.CropTop, CropRight: params.CropRight, CropBottom: params.CropBottom, FitIn: params.FitIn, Stretch: params.Stretch, PaddingLeft: params.PaddingLeft, PaddingTop: params.PaddingTop, PaddingRight: params.PaddingRight, PaddingBottom: params.PaddingBottom, HFlip: params.HFlip, VFlip: params.VFlip, HAlign: params.HAlign, VAlign: params.VAlign, Smart: params.Smart, Trim: params.Trim, TrimBy: params.TrimBy, TrimTolerance: params.TrimTolerance}
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

func (r cloudMutationAdapter) GenerateImagorURLFromTemplate(ctx context.Context, templateJSON string, imagePath *string, contextPath []string, forPreview *bool, previewMaxDimensions *cloudgql.DimensionsInput, skipLayerID *string, appendFilters []*cloudgql.ImagorFilterInput) (string, error) {
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

func (r cloudMutationAdapter) SetUserRegistry(ctx context.Context, entry *cloudgql.RegistryEntryInput, entries []*cloudgql.RegistryEntryInput, ownerID *string) ([]*cloudgql.UserRegistry, error) {
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
	return mapSharedUserRegistriesToCloud(result), nil
}

func (r cloudMutationAdapter) DeleteUserRegistry(ctx context.Context, key *string, keys []string, ownerID *string) (bool, error) {
	return r.Resolver.Mutation().DeleteUserRegistry(ctx, key, keys, ownerID)
}

func (r cloudMutationAdapter) SetSystemRegistry(ctx context.Context, entry *cloudgql.RegistryEntryInput, entries []*cloudgql.RegistryEntryInput) ([]*cloudgql.SystemRegistry, error) {
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
	return mapSharedSystemRegistriesToCloud(result), nil
}

func (r cloudMutationAdapter) DeleteSystemRegistry(ctx context.Context, key *string, keys []string) (bool, error) {
	return r.Resolver.Mutation().DeleteSystemRegistry(ctx, key, keys)
}

func (r cloudMutationAdapter) UpdateProfile(ctx context.Context, input cloudgql.UpdateProfileInput, userID *string) (*cloudgql.User, error) {
	sharedInput := sharedgql.UpdateProfileInput{DisplayName: input.DisplayName, Username: input.Username}
	user, err := r.Resolver.Mutation().UpdateProfile(ctx, sharedInput, userID)
	if err != nil {
		return nil, err
	}
	return mapSharedUserToCloud(user), nil
}

func (r cloudMutationAdapter) RequestEmailChange(ctx context.Context, email string, userID *string) (*cloudgql.EmailChangeRequestResult, error) {
	result, err := r.Resolver.Mutation().RequestEmailChange(ctx, email, userID)
	if err != nil {
		return nil, err
	}
	return mapSharedEmailChangeRequestResultToCloud(result), nil
}

func (r cloudMutationAdapter) ChangePassword(ctx context.Context, input cloudgql.ChangePasswordInput, userID *string) (bool, error) {
	sharedInput := sharedgql.ChangePasswordInput{CurrentPassword: input.CurrentPassword, NewPassword: input.NewPassword}
	return r.Resolver.Mutation().ChangePassword(ctx, sharedInput, userID)
}

func (r cloudMutationAdapter) DeactivateAccount(ctx context.Context, userID *string) (bool, error) {
	return r.Resolver.Mutation().DeactivateAccount(ctx, userID)
}

func (r cloudMutationAdapter) ReactivateAccount(ctx context.Context, userID string) (bool, error) {
	return r.Resolver.Mutation().ReactivateAccount(ctx, userID)
}

func (r cloudMutationAdapter) UnlinkAuthProvider(ctx context.Context, provider string, userID *string) (bool, error) {
	return r.Resolver.Mutation().UnlinkAuthProvider(ctx, provider, userID)
}

func (r cloudMutationAdapter) CreateUser(ctx context.Context, input cloudgql.CreateUserInput) (*cloudgql.User, error) {
	sharedInput := sharedgql.CreateUserInput{DisplayName: input.DisplayName, Username: input.Username, Password: input.Password, Role: input.Role}
	user, err := r.Resolver.Mutation().CreateUser(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedUserToCloud(user), nil
}

func (r cloudMutationAdapter) CreateSpace(ctx context.Context, input cloudgql.SpaceInput) (*cloudgql.Space, error) {
	sharedInput := sharedgql.SpaceInput{Key: input.Key, Name: input.Name, StorageType: input.StorageType, Bucket: input.Bucket, Prefix: input.Prefix, Region: input.Region, Endpoint: input.Endpoint, AccessKeyID: input.AccessKeyID, SecretKey: input.SecretKey, UsePathStyle: input.UsePathStyle, CustomDomain: input.CustomDomain, IsShared: input.IsShared, SignerAlgorithm: input.SignerAlgorithm, SignerTruncate: input.SignerTruncate, ImagorSecret: input.ImagorSecret}
	space, err := r.Resolver.Mutation().CreateSpace(ctx, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedSpaceToCloud(space), nil
}

func (r cloudMutationAdapter) UpdateSpace(ctx context.Context, key string, input cloudgql.SpaceInput) (*cloudgql.Space, error) {
	sharedInput := sharedgql.SpaceInput{Key: input.Key, Name: input.Name, StorageType: input.StorageType, Bucket: input.Bucket, Prefix: input.Prefix, Region: input.Region, Endpoint: input.Endpoint, AccessKeyID: input.AccessKeyID, SecretKey: input.SecretKey, UsePathStyle: input.UsePathStyle, CustomDomain: input.CustomDomain, IsShared: input.IsShared, SignerAlgorithm: input.SignerAlgorithm, SignerTruncate: input.SignerTruncate, ImagorSecret: input.ImagorSecret}
	space, err := r.Resolver.Mutation().UpdateSpace(ctx, key, sharedInput)
	if err != nil {
		return nil, err
	}
	return mapSharedSpaceToCloud(space), nil
}

func (r cloudMutationAdapter) DeleteSpace(ctx context.Context, key string) (bool, error) {
	return r.Resolver.Mutation().DeleteSpace(ctx, key)
}

func (r cloudMutationAdapter) SetSpaceRegistry(ctx context.Context, spaceKey string, entries []*cloudgql.RegistryEntryInput) ([]*cloudgql.UserRegistry, error) {
	sharedEntries := make([]*sharedgql.RegistryEntryInput, 0, len(entries))
	for _, item := range entries {
		if item == nil {
			sharedEntries = append(sharedEntries, nil)
			continue
		}
		v := sharedgql.RegistryEntryInput(*item)
		sharedEntries = append(sharedEntries, &v)
	}
	result, err := r.Resolver.Mutation().SetSpaceRegistry(ctx, spaceKey, sharedEntries)
	if err != nil {
		return nil, err
	}
	return mapSharedUserRegistriesToCloud(result), nil
}

func (r cloudMutationAdapter) DeleteSpaceRegistry(ctx context.Context, spaceKey string, keys []string) (bool, error) {
	return r.Resolver.Mutation().DeleteSpaceRegistry(ctx, spaceKey, keys)
}

func (r cloudMutationAdapter) AddOrgMember(ctx context.Context, username string, role string) (*cloudgql.OrgMember, error) {
	member, err := r.Resolver.Mutation().AddOrgMember(ctx, username, role)
	if err != nil {
		return nil, err
	}
	return mapSharedOrgMemberToCloud(member), nil
}

func (r cloudMutationAdapter) AddOrgMemberByEmail(ctx context.Context, email string, role string) (*cloudgql.OrgMember, error) {
	member, err := r.Resolver.Mutation().AddOrgMemberByEmail(ctx, email, role)
	if err != nil {
		return nil, err
	}
	return mapSharedOrgMemberToCloud(member), nil
}

func (r cloudMutationAdapter) AddSpaceMember(ctx context.Context, spaceKey string, userID string, role string) (*cloudgql.SpaceMember, error) {
	member, err := r.Resolver.Mutation().AddSpaceMember(ctx, spaceKey, userID, role)
	if err != nil {
		return nil, err
	}
	return mapSharedSpaceMemberToCloud(member), nil
}

func (r cloudMutationAdapter) InviteSpaceMember(ctx context.Context, spaceKey string, email string, role string) (*cloudgql.SpaceInviteResult, error) {
	result, err := r.Resolver.Mutation().InviteSpaceMember(ctx, spaceKey, email, role)
	if err != nil {
		return nil, err
	}
	return mapSharedSpaceInviteResultToCloud(result), nil
}

func (r cloudMutationAdapter) RemoveOrgMember(ctx context.Context, userID string) (bool, error) {
	return r.Resolver.Mutation().RemoveOrgMember(ctx, userID)
}

func (r cloudMutationAdapter) RemoveSpaceMember(ctx context.Context, spaceKey string, userID string) (bool, error) {
	return r.Resolver.Mutation().RemoveSpaceMember(ctx, spaceKey, userID)
}

func (r cloudMutationAdapter) LeaveSpace(ctx context.Context, spaceKey string) (bool, error) {
	return r.Resolver.Mutation().LeaveSpace(ctx, spaceKey)
}

func (r cloudMutationAdapter) UpdateOrgMemberRole(ctx context.Context, userID string, role string) (*cloudgql.OrgMember, error) {
	member, err := r.Resolver.Mutation().UpdateOrgMemberRole(ctx, userID, role)
	if err != nil {
		return nil, err
	}
	return mapSharedOrgMemberToCloud(member), nil
}

func (r cloudMutationAdapter) UpdateSpaceMemberRole(ctx context.Context, spaceKey string, userID string, role string) (*cloudgql.SpaceMember, error) {
	member, err := r.Resolver.Mutation().UpdateSpaceMemberRole(ctx, spaceKey, userID, role)
	if err != nil {
		return nil, err
	}
	return mapSharedSpaceMemberToCloud(member), nil
}
