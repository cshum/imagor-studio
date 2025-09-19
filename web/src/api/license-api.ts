import { getGraphQLClient } from '@/lib/graphql-client'

import type {
  ActivateLicenseMutation,
  ActivateLicenseMutationVariables,
  GetLicenseStatusQuery,
} from '../generated/graphql'
import { getSdk } from '../generated/graphql-request'

/**
 * Get current license status
 */
export async function getLicenseStatus(): Promise<GetLicenseStatusQuery['licenseStatus']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.GetLicenseStatus()
  return result.licenseStatus
}

/**
 * Activate license with the provided key
 */
export async function activateLicense(
  key: string,
): Promise<ActivateLicenseMutation['activateLicense']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: ActivateLicenseMutationVariables = {
    key,
  }

  const result = await sdk.ActivateLicense(variables)
  return result.activateLicense
}
