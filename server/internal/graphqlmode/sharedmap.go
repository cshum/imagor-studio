package graphqlmode

import (
	sharedgql "github.com/cshum/imagor-studio/server/internal/generated/gql"
	cloudgql "github.com/cshum/imagor-studio/server/internal/generated/gql/cloud"
	selfhostedgql "github.com/cshum/imagor-studio/server/internal/generated/gql/selfhosted"
)

func mapSharedAuthProviderToCloud(provider *sharedgql.AuthProvider) *cloudgql.AuthProvider {
	if provider == nil {
		return nil
	}
	return &cloudgql.AuthProvider{
		Provider: provider.Provider,
		Email:    provider.Email,
		LinkedAt: provider.LinkedAt,
	}
}

func mapSharedUserToCloud(user *sharedgql.User) *cloudgql.User {
	if user == nil {
		return nil
	}
	authProviders := make([]*cloudgql.AuthProvider, 0, len(user.AuthProviders))
	for _, provider := range user.AuthProviders {
		authProviders = append(authProviders, mapSharedAuthProviderToCloud(provider))
	}
	return &cloudgql.User{
		ID:            user.ID,
		DisplayName:   user.DisplayName,
		Username:      user.Username,
		Role:          user.Role,
		IsActive:      user.IsActive,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     user.UpdatedAt,
		Email:         user.Email,
		PendingEmail:  user.PendingEmail,
		EmailVerified: user.EmailVerified,
		HasPassword:   user.HasPassword,
		AvatarURL:     user.AvatarURL,
		AuthProviders: authProviders,
	}
}

func mapSharedUserListToCloud(list *sharedgql.UserList) *cloudgql.UserList {
	if list == nil {
		return nil
	}
	items := make([]*cloudgql.User, 0, len(list.Items))
	for _, user := range list.Items {
		items = append(items, mapSharedUserToCloud(user))
	}
	return &cloudgql.UserList{Items: items, TotalCount: list.TotalCount}
}

func mapSharedUserRegistryToCloud(registry *sharedgql.UserRegistry) *cloudgql.UserRegistry {
	if registry == nil {
		return nil
	}
	return &cloudgql.UserRegistry{Key: registry.Key, Value: registry.Value, IsEncrypted: registry.IsEncrypted}
}

func mapSharedUserRegistriesToCloud(registries []*sharedgql.UserRegistry) []*cloudgql.UserRegistry {
	result := make([]*cloudgql.UserRegistry, 0, len(registries))
	for _, registry := range registries {
		result = append(result, mapSharedUserRegistryToCloud(registry))
	}
	return result
}

func mapSharedSystemRegistryToCloud(registry *sharedgql.SystemRegistry) *cloudgql.SystemRegistry {
	if registry == nil {
		return nil
	}
	return &cloudgql.SystemRegistry{
		Key:                  registry.Key,
		Value:                registry.Value,
		IsEncrypted:          registry.IsEncrypted,
		IsOverriddenByConfig: registry.IsOverriddenByConfig,
	}
}

func mapSharedSystemRegistriesToCloud(registries []*sharedgql.SystemRegistry) []*cloudgql.SystemRegistry {
	result := make([]*cloudgql.SystemRegistry, 0, len(registries))
	for _, registry := range registries {
		result = append(result, mapSharedSystemRegistryToCloud(registry))
	}
	return result
}

func mapSharedFileStorageConfigToCloud(config *sharedgql.FileStorageConfig) *cloudgql.FileStorageConfig {
	if config == nil {
		return nil
	}
	return &cloudgql.FileStorageConfig{BaseDir: config.BaseDir, MkdirPermissions: config.MkdirPermissions, WritePermissions: config.WritePermissions}
}

func mapSharedS3StorageConfigToCloud(config *sharedgql.S3StorageConfig) *cloudgql.S3StorageConfig {
	if config == nil {
		return nil
	}
	return &cloudgql.S3StorageConfig{Bucket: config.Bucket, Region: config.Region, Endpoint: config.Endpoint, ForcePathStyle: config.ForcePathStyle, BaseDir: config.BaseDir}
}

func mapSharedStorageStatusToCloud(status *sharedgql.StorageStatus) *cloudgql.StorageStatus {
	if status == nil {
		return nil
	}
	return &cloudgql.StorageStatus{
		Configured:           status.Configured,
		Type:                 status.Type,
		LastUpdated:          status.LastUpdated,
		IsOverriddenByConfig: status.IsOverriddenByConfig,
		FileConfig:           mapSharedFileStorageConfigToCloud(status.FileConfig),
		S3Config:             mapSharedS3StorageConfigToCloud(status.S3Config),
	}
}

func mapSharedThumbnailUrlsToCloud(urls *sharedgql.ThumbnailUrls) *cloudgql.ThumbnailUrls {
	if urls == nil {
		return nil
	}
	return &cloudgql.ThumbnailUrls{Grid: urls.Grid, Preview: urls.Preview, Full: urls.Full, Original: urls.Original, Meta: urls.Meta}
}

func mapSharedFileItemToCloud(item *sharedgql.FileItem) *cloudgql.FileItem {
	if item == nil {
		return nil
	}
	return &cloudgql.FileItem{Name: item.Name, Path: item.Path, Size: item.Size, IsDirectory: item.IsDirectory, ModifiedTime: item.ModifiedTime, ThumbnailUrls: mapSharedThumbnailUrlsToCloud(item.ThumbnailUrls)}
}

func mapSharedFileListToCloud(list *sharedgql.FileList) *cloudgql.FileList {
	if list == nil {
		return nil
	}
	items := make([]*cloudgql.FileItem, 0, len(list.Items))
	for _, item := range list.Items {
		items = append(items, mapSharedFileItemToCloud(item))
	}
	return &cloudgql.FileList{Items: items, TotalCount: list.TotalCount}
}

func mapSharedFileStatToCloud(stat *sharedgql.FileStat) *cloudgql.FileStat {
	if stat == nil {
		return nil
	}
	return &cloudgql.FileStat{Name: stat.Name, Path: stat.Path, Size: stat.Size, IsDirectory: stat.IsDirectory, ModifiedTime: stat.ModifiedTime, Etag: stat.Etag, ThumbnailUrls: mapSharedThumbnailUrlsToCloud(stat.ThumbnailUrls)}
}

func mapSharedLicenseStatusToCloud(status *sharedgql.LicenseStatus) *cloudgql.LicenseStatus {
	if status == nil {
		return nil
	}
	return &cloudgql.LicenseStatus{IsLicensed: status.IsLicensed, LicenseType: status.LicenseType, Email: status.Email, Message: status.Message, IsOverriddenByConfig: status.IsOverriddenByConfig, SupportMessage: status.SupportMessage, MaskedLicenseKey: status.MaskedLicenseKey, ActivatedAt: status.ActivatedAt}
}

func mapSharedImagorConfigToCloud(config *sharedgql.ImagorConfig) *cloudgql.ImagorConfig {
	if config == nil {
		return nil
	}
	return &cloudgql.ImagorConfig{HasSecret: config.HasSecret, SignerType: cloudgql.ImagorSignerType(config.SignerType), SignerTruncate: config.SignerTruncate}
}

func mapSharedImagorStatusToCloud(status *sharedgql.ImagorStatus) *cloudgql.ImagorStatus {
	if status == nil {
		return nil
	}
	return &cloudgql.ImagorStatus{Configured: status.Configured, LastUpdated: status.LastUpdated, IsOverriddenByConfig: status.IsOverriddenByConfig, Config: mapSharedImagorConfigToCloud(status.Config)}
}

func mapSharedEmailChangeRequestResultToCloud(result *sharedgql.EmailChangeRequestResult) *cloudgql.EmailChangeRequestResult {
	if result == nil {
		return nil
	}
	return &cloudgql.EmailChangeRequestResult{Email: result.Email, VerificationRequired: result.VerificationRequired}
}

func mapSharedStorageConfigResultToCloud(result *sharedgql.StorageConfigResult) *cloudgql.StorageConfigResult {
	if result == nil {
		return nil
	}
	return &cloudgql.StorageConfigResult{Success: result.Success, Timestamp: result.Timestamp, Message: result.Message}
}

func mapSharedStorageTestResultToCloud(result *sharedgql.StorageTestResult) *cloudgql.StorageTestResult {
	if result == nil {
		return nil
	}
	return &cloudgql.StorageTestResult{Success: result.Success, Message: result.Message, Details: result.Details}
}

func mapSharedImagorConfigResultToCloud(result *sharedgql.ImagorConfigResult) *cloudgql.ImagorConfigResult {
	if result == nil {
		return nil
	}
	return &cloudgql.ImagorConfigResult{Success: result.Success, Timestamp: result.Timestamp, Message: result.Message}
}

func mapSharedTemplateResultToCloud(result *sharedgql.TemplateResult) *cloudgql.TemplateResult {
	if result == nil {
		return nil
	}
	return &cloudgql.TemplateResult{Success: result.Success, TemplatePath: result.TemplatePath, PreviewPath: result.PreviewPath, Message: result.Message}
}

func mapSharedOrganizationToCloud(org *sharedgql.Organization) *cloudgql.Organization {
	if org == nil {
		return nil
	}
	return &cloudgql.Organization{
		ID:          org.ID,
		Name:        org.Name,
		Slug:        org.Slug,
		OwnerUserID: org.OwnerUserID,
		Plan:        org.Plan,
		PlanStatus:  org.PlanStatus,
		CreatedAt:   org.CreatedAt,
		UpdatedAt:   org.UpdatedAt,
	}
}

func mapSharedSpaceToCloud(space *sharedgql.Space) *cloudgql.Space {
	if space == nil {
		return nil
	}
	return &cloudgql.Space{
		ID:                   space.ID,
		OrgID:                space.OrgID,
		Key:                  space.Key,
		Name:                 space.Name,
		StorageType:          space.StorageType,
		Bucket:               space.Bucket,
		Prefix:               space.Prefix,
		Region:               space.Region,
		Endpoint:             space.Endpoint,
		UsePathStyle:         space.UsePathStyle,
		CustomDomain:         space.CustomDomain,
		CustomDomainVerified: space.CustomDomainVerified,
		Suspended:            space.Suspended,
		IsShared:             space.IsShared,
		SignerAlgorithm:      space.SignerAlgorithm,
		SignerTruncate:       space.SignerTruncate,
		CanManage:            space.CanManage,
		CanDelete:            space.CanDelete,
		CanLeave:             space.CanLeave,
		UpdatedAt:            space.UpdatedAt,
	}
}

func mapSharedSpacesToCloud(spaces []*sharedgql.Space) []*cloudgql.Space {
	result := make([]*cloudgql.Space, 0, len(spaces))
	for _, space := range spaces {
		result = append(result, mapSharedSpaceToCloud(space))
	}
	return result
}

func mapSharedOrgMemberToCloud(member *sharedgql.OrgMember) *cloudgql.OrgMember {
	if member == nil {
		return nil
	}
	return &cloudgql.OrgMember{
		UserID:      member.UserID,
		Username:    member.Username,
		DisplayName: member.DisplayName,
		Role:        member.Role,
		CreatedAt:   member.CreatedAt,
	}
}

func mapSharedOrgMembersToCloud(members []*sharedgql.OrgMember) []*cloudgql.OrgMember {
	result := make([]*cloudgql.OrgMember, 0, len(members))
	for _, member := range members {
		result = append(result, mapSharedOrgMemberToCloud(member))
	}
	return result
}

func mapSharedSpaceMemberToCloud(member *sharedgql.SpaceMember) *cloudgql.SpaceMember {
	if member == nil {
		return nil
	}
	return &cloudgql.SpaceMember{
		UserID:        member.UserID,
		Username:      member.Username,
		DisplayName:   member.DisplayName,
		Email:         member.Email,
		AvatarURL:     member.AvatarURL,
		Role:          member.Role,
		RoleSource:    member.RoleSource,
		CanChangeRole: member.CanChangeRole,
		CanRemove:     member.CanRemove,
		CreatedAt:     member.CreatedAt,
	}
}

func mapSharedSpaceMembersToCloud(members []*sharedgql.SpaceMember) []*cloudgql.SpaceMember {
	result := make([]*cloudgql.SpaceMember, 0, len(members))
	for _, member := range members {
		result = append(result, mapSharedSpaceMemberToCloud(member))
	}
	return result
}

func mapSharedSpaceInvitationToCloud(invitation *sharedgql.SpaceInvitation) *cloudgql.SpaceInvitation {
	if invitation == nil {
		return nil
	}
	return &cloudgql.SpaceInvitation{
		ID:        invitation.ID,
		Email:     invitation.Email,
		Role:      invitation.Role,
		CreatedAt: invitation.CreatedAt,
		ExpiresAt: invitation.ExpiresAt,
	}
}

func mapSharedSpaceInvitationsToCloud(invitations []*sharedgql.SpaceInvitation) []*cloudgql.SpaceInvitation {
	result := make([]*cloudgql.SpaceInvitation, 0, len(invitations))
	for _, invitation := range invitations {
		result = append(result, mapSharedSpaceInvitationToCloud(invitation))
	}
	return result
}

func mapSharedSpaceInviteResultToCloud(result *sharedgql.SpaceInviteResult) *cloudgql.SpaceInviteResult {
	if result == nil {
		return nil
	}
	return &cloudgql.SpaceInviteResult{
		Status:     result.Status,
		Member:     mapSharedSpaceMemberToCloud(result.Member),
		Invitation: mapSharedSpaceInvitationToCloud(result.Invitation),
	}
}

func mapSharedAuthProviderToSelfHosted(provider *sharedgql.AuthProvider) *selfhostedgql.AuthProvider {
	if provider == nil {
		return nil
	}
	return &selfhostedgql.AuthProvider{
		Provider: provider.Provider,
		Email:    provider.Email,
		LinkedAt: provider.LinkedAt,
	}
}

func mapSharedUserToSelfHosted(user *sharedgql.User) *selfhostedgql.User {
	if user == nil {
		return nil
	}
	authProviders := make([]*selfhostedgql.AuthProvider, 0, len(user.AuthProviders))
	for _, provider := range user.AuthProviders {
		authProviders = append(authProviders, mapSharedAuthProviderToSelfHosted(provider))
	}
	return &selfhostedgql.User{
		ID:            user.ID,
		DisplayName:   user.DisplayName,
		Username:      user.Username,
		Role:          user.Role,
		IsActive:      user.IsActive,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     user.UpdatedAt,
		Email:         user.Email,
		PendingEmail:  user.PendingEmail,
		EmailVerified: user.EmailVerified,
		HasPassword:   user.HasPassword,
		AvatarURL:     user.AvatarURL,
		AuthProviders: authProviders,
	}
}

func mapSharedUserListToSelfHosted(list *sharedgql.UserList) *selfhostedgql.UserList {
	if list == nil {
		return nil
	}
	items := make([]*selfhostedgql.User, 0, len(list.Items))
	for _, user := range list.Items {
		items = append(items, mapSharedUserToSelfHosted(user))
	}
	return &selfhostedgql.UserList{
		Items:      items,
		TotalCount: list.TotalCount,
	}
}

func mapSharedUserRegistryToSelfHosted(registry *sharedgql.UserRegistry) *selfhostedgql.UserRegistry {
	if registry == nil {
		return nil
	}
	return &selfhostedgql.UserRegistry{
		Key:         registry.Key,
		Value:       registry.Value,
		IsEncrypted: registry.IsEncrypted,
	}
}

func mapSharedUserRegistriesToSelfHosted(registries []*sharedgql.UserRegistry) []*selfhostedgql.UserRegistry {
	result := make([]*selfhostedgql.UserRegistry, 0, len(registries))
	for _, registry := range registries {
		result = append(result, mapSharedUserRegistryToSelfHosted(registry))
	}
	return result
}

func mapSharedSystemRegistryToSelfHosted(registry *sharedgql.SystemRegistry) *selfhostedgql.SystemRegistry {
	if registry == nil {
		return nil
	}
	return &selfhostedgql.SystemRegistry{
		Key:                  registry.Key,
		Value:                registry.Value,
		IsEncrypted:          registry.IsEncrypted,
		IsOverriddenByConfig: registry.IsOverriddenByConfig,
	}
}

func mapSharedSystemRegistriesToSelfHosted(registries []*sharedgql.SystemRegistry) []*selfhostedgql.SystemRegistry {
	result := make([]*selfhostedgql.SystemRegistry, 0, len(registries))
	for _, registry := range registries {
		result = append(result, mapSharedSystemRegistryToSelfHosted(registry))
	}
	return result
}

func mapSharedFileStorageConfigToSelfHosted(config *sharedgql.FileStorageConfig) *selfhostedgql.FileStorageConfig {
	if config == nil {
		return nil
	}
	return &selfhostedgql.FileStorageConfig{
		BaseDir:          config.BaseDir,
		MkdirPermissions: config.MkdirPermissions,
		WritePermissions: config.WritePermissions,
	}
}

func mapSharedS3StorageConfigToSelfHosted(config *sharedgql.S3StorageConfig) *selfhostedgql.S3StorageConfig {
	if config == nil {
		return nil
	}
	return &selfhostedgql.S3StorageConfig{
		Bucket:         config.Bucket,
		Region:         config.Region,
		Endpoint:       config.Endpoint,
		ForcePathStyle: config.ForcePathStyle,
		BaseDir:        config.BaseDir,
	}
}

func mapSharedStorageStatusToSelfHosted(status *sharedgql.StorageStatus) *selfhostedgql.StorageStatus {
	if status == nil {
		return nil
	}
	return &selfhostedgql.StorageStatus{
		Configured:           status.Configured,
		Type:                 status.Type,
		LastUpdated:          status.LastUpdated,
		IsOverriddenByConfig: status.IsOverriddenByConfig,
		FileConfig:           mapSharedFileStorageConfigToSelfHosted(status.FileConfig),
		S3Config:             mapSharedS3StorageConfigToSelfHosted(status.S3Config),
	}
}

func mapSharedThumbnailUrlsToSelfHosted(urls *sharedgql.ThumbnailUrls) *selfhostedgql.ThumbnailUrls {
	if urls == nil {
		return nil
	}
	return &selfhostedgql.ThumbnailUrls{
		Grid:     urls.Grid,
		Preview:  urls.Preview,
		Full:     urls.Full,
		Original: urls.Original,
		Meta:     urls.Meta,
	}
}

func mapSharedFileItemToSelfHosted(item *sharedgql.FileItem) *selfhostedgql.FileItem {
	if item == nil {
		return nil
	}
	return &selfhostedgql.FileItem{
		Name:          item.Name,
		Path:          item.Path,
		Size:          item.Size,
		IsDirectory:   item.IsDirectory,
		ModifiedTime:  item.ModifiedTime,
		ThumbnailUrls: mapSharedThumbnailUrlsToSelfHosted(item.ThumbnailUrls),
	}
}

func mapSharedFileListToSelfHosted(list *sharedgql.FileList) *selfhostedgql.FileList {
	if list == nil {
		return nil
	}
	items := make([]*selfhostedgql.FileItem, 0, len(list.Items))
	for _, item := range list.Items {
		items = append(items, mapSharedFileItemToSelfHosted(item))
	}
	return &selfhostedgql.FileList{
		Items:      items,
		TotalCount: list.TotalCount,
	}
}

func mapSharedFileStatToSelfHosted(stat *sharedgql.FileStat) *selfhostedgql.FileStat {
	if stat == nil {
		return nil
	}
	return &selfhostedgql.FileStat{
		Name:          stat.Name,
		Path:          stat.Path,
		Size:          stat.Size,
		IsDirectory:   stat.IsDirectory,
		ModifiedTime:  stat.ModifiedTime,
		Etag:          stat.Etag,
		ThumbnailUrls: mapSharedThumbnailUrlsToSelfHosted(stat.ThumbnailUrls),
	}
}

func mapSharedLicenseStatusToSelfHosted(status *sharedgql.LicenseStatus) *selfhostedgql.LicenseStatus {
	if status == nil {
		return nil
	}
	return &selfhostedgql.LicenseStatus{
		IsLicensed:           status.IsLicensed,
		LicenseType:          status.LicenseType,
		Email:                status.Email,
		Message:              status.Message,
		IsOverriddenByConfig: status.IsOverriddenByConfig,
		SupportMessage:       status.SupportMessage,
		MaskedLicenseKey:     status.MaskedLicenseKey,
		ActivatedAt:          status.ActivatedAt,
	}
}

func mapSharedImagorConfigToSelfHosted(config *sharedgql.ImagorConfig) *selfhostedgql.ImagorConfig {
	if config == nil {
		return nil
	}
	return &selfhostedgql.ImagorConfig{
		HasSecret:      config.HasSecret,
		SignerType:     selfhostedgql.ImagorSignerType(config.SignerType),
		SignerTruncate: config.SignerTruncate,
	}
}

func mapSharedImagorStatusToSelfHosted(status *sharedgql.ImagorStatus) *selfhostedgql.ImagorStatus {
	if status == nil {
		return nil
	}
	return &selfhostedgql.ImagorStatus{
		Configured:           status.Configured,
		LastUpdated:          status.LastUpdated,
		IsOverriddenByConfig: status.IsOverriddenByConfig,
		Config:               mapSharedImagorConfigToSelfHosted(status.Config),
	}
}

func mapSharedEmailChangeRequestResultToSelfHosted(result *sharedgql.EmailChangeRequestResult) *selfhostedgql.EmailChangeRequestResult {
	if result == nil {
		return nil
	}
	return &selfhostedgql.EmailChangeRequestResult{
		Email:                result.Email,
		VerificationRequired: result.VerificationRequired,
	}
}

func mapSharedStorageConfigResultToSelfHosted(result *sharedgql.StorageConfigResult) *selfhostedgql.StorageConfigResult {
	if result == nil {
		return nil
	}
	return &selfhostedgql.StorageConfigResult{
		Success:   result.Success,
		Timestamp: result.Timestamp,
		Message:   result.Message,
	}
}

func mapSharedStorageTestResultToSelfHosted(result *sharedgql.StorageTestResult) *selfhostedgql.StorageTestResult {
	if result == nil {
		return nil
	}
	return &selfhostedgql.StorageTestResult{
		Success: result.Success,
		Message: result.Message,
		Details: result.Details,
	}
}

func mapSharedImagorConfigResultToSelfHosted(result *sharedgql.ImagorConfigResult) *selfhostedgql.ImagorConfigResult {
	if result == nil {
		return nil
	}
	return &selfhostedgql.ImagorConfigResult{
		Success:   result.Success,
		Timestamp: result.Timestamp,
		Message:   result.Message,
	}
}

func mapSharedTemplateResultToSelfHosted(result *sharedgql.TemplateResult) *selfhostedgql.TemplateResult {
	if result == nil {
		return nil
	}
	return &selfhostedgql.TemplateResult{
		Success:      result.Success,
		TemplatePath: result.TemplatePath,
		PreviewPath:  result.PreviewPath,
		Message:      result.Message,
	}
}
