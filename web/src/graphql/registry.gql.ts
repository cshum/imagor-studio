import { gql } from '@/generated'

export const RegistryFragment = gql(`
  fragment RegistryInfo on Registry {
    key
    value
    ownerID
    createdAt
    updatedAt
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
  query GetUserRegistry($key: String!, $ownerID: String) {
    getUserRegistry(key: $key, ownerID: $ownerID) {
      ...RegistryInfo
    }
  }
`)

// System Registry Queries
export const ListSystemRegistryQuery = gql(`
  query ListSystemRegistry($prefix: String) {
    listSystemRegistry(prefix: $prefix) {
      ...RegistryInfo
    }
  }
`)

export const GetSystemRegistryQuery = gql(`
  query GetSystemRegistry($key: String!) {
    getSystemRegistry(key: $key) {
      ...RegistryInfo
    }
  }
`)

// User Registry Mutations
export const SetUserRegistryMutation = gql(`
  mutation SetUserRegistry($key: String!, $value: String!, $ownerID: String) {
    setUserRegistry(key: $key, value: $value, ownerID: $ownerID) {
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
  mutation SetSystemRegistry($key: String!, $value: String!) {
    setSystemRegistry(key: $key, value: $value) {
      ...RegistryInfo
    }
  }
`)

export const DeleteSystemRegistryMutation = gql(`
  mutation DeleteSystemRegistry($key: String!) {
    deleteSystemRegistry(key: $key)
  }
`)
