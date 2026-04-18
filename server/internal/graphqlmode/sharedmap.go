package graphqlmode

import (
	sharedgql "github.com/cshum/imagor-studio/server/internal/generated/gql"
	selfhostedgql "github.com/cshum/imagor-studio/server/internal/generated/gql/selfhosted"
)

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
