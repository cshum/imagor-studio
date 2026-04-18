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
