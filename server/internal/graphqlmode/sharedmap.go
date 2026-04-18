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
