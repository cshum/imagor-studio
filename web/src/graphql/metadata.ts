import { gql } from '@/generated'

export const MetadataFragment = gql(`
  fragment MetadataInfo on Metadata {
    key
    value
    createdAt
    updatedAt
  }
`)

export const ListMetadataQuery = gql(`
  query ListMetadata($prefix: String) {
    listMetadata(prefix: $prefix) {
      ...MetadataInfo
    }
  }
`)

export const GetMetadataQuery = gql(`
  query GetMetadata($key: String!) {
    getMetadata(key: $key) {
      ...MetadataInfo
    }
  }
`)

export const SetMetadataMutation = gql(`
  mutation SetMetadata($key: String!, $value: String!) {
    setMetadata(key: $key, value: $value) {
      ...MetadataInfo
    }
  }
`)

export const DeleteMetadataMutation = gql(`
  mutation DeleteMetadata($key: String!) {
    deleteMetadata(key: $key)
  }
`)
