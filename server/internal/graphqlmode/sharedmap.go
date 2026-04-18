package graphqlmode

import (
	sharedgql "github.com/cshum/imagor-studio/server/internal/generated/gql"
	selfhostedgql "github.com/cshum/imagor-studio/server/internal/generated/gql/selfhosted"
)

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
