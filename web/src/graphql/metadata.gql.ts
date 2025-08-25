import { gql } from '@/generated'

export const MetadataFragment = gql(`
  fragment MetadataInfo on Metadata {
    key
    value
    ownerID
    createdAt
    updatedAt
  }
`)

// User Metadata Queries
export const ListUserMetadataQuery = gql(`
  query ListUserMetadata($prefix: String, $ownerID: String) {
    listUserMetadata(prefix: $prefix, ownerID: $ownerID) {
      ...MetadataInfo
    }
  }
`)

export const GetUserMetadataQuery = gql(`
  query GetUserMetadata($key: String!, $ownerID: String) {
    getUserMetadata(key: $key, ownerID: $ownerID) {
      ...MetadataInfo
    }
  }
`)

// System Metadata Queries
export const ListSystemMetadataQuery = gql(`
  query ListSystemMetadata($prefix: String) {
    listSystemMetadata(prefix: $prefix) {
      ...MetadataInfo
    }
  }
`)

export const GetSystemMetadataQuery = gql(`
  query GetSystemMetadata($key: String!) {
    getSystemMetadata(key: $key) {
      ...MetadataInfo
    }
  }
`)

// User Metadata Mutations
export const SetUserMetadataMutation = gql(`
  mutation SetUserMetadata($key: String!, $value: String!, $ownerID: String) {
    setUserMetadata(key: $key, value: $value, ownerID: $ownerID) {
      ...MetadataInfo
    }
  }
`)

export const DeleteUserMetadataMutation = gql(`
  mutation DeleteUserMetadata($key: String!, $ownerID: String) {
    deleteUserMetadata(key: $key, ownerID: $ownerID)
  }
`)

// System Metadata Mutations (admin only)
export const SetSystemMetadataMutation = gql(`
  mutation SetSystemMetadata($key: String!, $value: String!) {
    setSystemMetadata(key: $key, value: $value) {
      ...MetadataInfo
    }
  }
`)

export const DeleteSystemMetadataMutation = gql(`
  mutation DeleteSystemMetadata($key: String!) {
    deleteSystemMetadata(key: $key)
  }
`)
