import { gql } from '@/generated'

export const RegistryFragment = gql(`
  fragment RegistryInfo on UserRegistry {
    key
    value
    isEncrypted
  }
`)

export const SystemRegistryFragment = gql(`
  fragment SystemRegistryInfo on SystemRegistry {
    key
    value
    isEncrypted
    isOverriddenByConfig
  }
`)

// User Registry Queries
export const ListUserRegistryQuery = gql(`
  query ListUserRegistry($prefix: String, $ownerID: String) {
    listUserRegistry(prefix: $prefix, ownerID: $ownerID) {
      ...RegistryInfo
    }
  }
`)

export const GetUserRegistryQuery = gql(`
  query GetUserRegistry($key: String, $keys: [String!], $ownerID: String) {
    getUserRegistry(key: $key, keys: $keys, ownerID: $ownerID) {
      ...RegistryInfo
    }
  }
`)

// System Registry Queries
export const ListSystemRegistryQuery = gql(`
  query ListSystemRegistry($prefix: String) {
    listSystemRegistry(prefix: $prefix) {
      ...SystemRegistryInfo
    }
  }
`)

export const GetSystemRegistryQuery = gql(`
  query GetSystemRegistry($key: String, $keys: [String!]) {
    getSystemRegistry(key: $key, keys: $keys) {
      ...SystemRegistryInfo
    }
  }
`)

// User Registry Mutations
export const SetUserRegistryMutation = gql(`
  mutation SetUserRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!], $ownerID: String) {
    setUserRegistry(entry: $entry, entries: $entries, ownerID: $ownerID) {
      ...RegistryInfo
    }
  }
`)

export const DeleteUserRegistryMutation = gql(`
  mutation DeleteUserRegistry($key: String!, $ownerID: String) {
    deleteUserRegistry(key: $key, ownerID: $ownerID)
  }
`)

// System Registry Mutations (admin only)
export const SetSystemRegistryMutation = gql(`
  mutation SetSystemRegistry($entry: RegistryEntryInput, $entries: [RegistryEntryInput!]) {
    setSystemRegistry(entry: $entry, entries: $entries) {
      ...SystemRegistryInfo
    }
  }
`)

export const DeleteSystemRegistryMutation = gql(`
  mutation DeleteSystemRegistry($key: String!) {
    deleteSystemRegistry(key: $key)
  }
`)

// License Status Query
export const LicenseStatusQuery = gql(`
  query LicenseStatus {
    licenseStatus {
      isLicensed
      licenseType
      email
      message
      isOverriddenByConfig
      supportMessage
      maskedLicenseKey
      activatedAt
    }
  }
`)
