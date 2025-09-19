import { getSdk } from '@/generated/graphql-request'
import { getBaseUrl } from '@/lib/api-utils'
import { getGraphQLClient } from '@/lib/graphql-client'

const BASE_URL = getBaseUrl()

export interface LicenseStatus {
  isLicensed: boolean
  licenseType?: string
  features: string[]
  email?: string
  message: string
  isOverriddenByConfig: boolean
  supportMessage?: string
  maskedLicenseKey?: string
  activatedAt?: string
}

/**
 * Get license status with full details (authenticated admin) - uses GraphQL
 */
export const getLicenseStatus = async (): Promise<LicenseStatus> => {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.LicenseStatus()
  
  return {
    isLicensed: result.licenseStatus.isLicensed,
    licenseType: result.licenseStatus.licenseType || undefined,
    features: result.licenseStatus.features,
    email: result.licenseStatus.email || undefined,
    message: result.licenseStatus.message,
    isOverriddenByConfig: result.licenseStatus.isOverriddenByConfig,
    supportMessage: result.licenseStatus.supportMessage || undefined,
    maskedLicenseKey: result.licenseStatus.maskedLicenseKey || undefined,
    activatedAt: result.licenseStatus.activatedAt || undefined,
  }
}

/**
 * Get public license status (no authentication required) - uses REST
 */
export const getPublicLicenseStatus = async (): Promise<LicenseStatus> => {
  const response = await fetch(`${BASE_URL}/api/public/license-status`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get license status: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Activate a license key - uses REST
 */
export const activateLicense = async (licenseKey: string): Promise<LicenseStatus> => {
  const response = await fetch(`${BASE_URL}/api/public/activate-license`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: licenseKey }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to activate license: ${response.statusText}`)
  }

  return response.json()
}
