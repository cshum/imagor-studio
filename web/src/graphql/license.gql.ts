import { gql } from '@/generated'

export const GET_LICENSE_STATUS = gql(`
  query GetLicenseStatus {
    licenseStatus {
      isLicensed
      licenseType
      email
      message
      supportMessage
    }
  }
`)

export const ACTIVATE_LICENSE = gql(`
  mutation ActivateLicense($key: String!) {
    activateLicense(key: $key) {
      isLicensed
      licenseType
      email
      message
      supportMessage
    }
  }
`)
