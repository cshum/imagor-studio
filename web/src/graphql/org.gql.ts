import { gql } from '@/generated/gql'

export const MY_ORGANIZATION = gql(`
  query MyOrganization {
    myOrganization {
      id
      name
      slug
      ownerUserId
      plan
      planStatus
      createdAt
      updatedAt
    }
  }
`)

export const LIST_SPACES = gql(`
  query ListSpaces {
    spaces {
      orgId
      key
      name
      storageType
      bucket
      prefix
      region
      endpoint
      usePathStyle
      customDomain
      customDomainVerified
      suspended
      isShared
      signerAlgorithm
      signerTruncate
      updatedAt
    }
  }
`)

export const GET_SPACE = gql(`
  query GetSpace($key: String!) {
    space(key: $key) {
      orgId
      key
      name
      storageType
      bucket
      prefix
      region
      endpoint
      usePathStyle
      customDomain
      customDomainVerified
      suspended
      isShared
      signerAlgorithm
      signerTruncate
      updatedAt
    }
  }
`)

export const CREATE_SPACE = gql(`
  mutation CreateSpace($input: SpaceInput!) {
    createSpace(input: $input) {
      orgId
      key
      name
      storageType
      bucket
      prefix
      region
      endpoint
      usePathStyle
      customDomain
      suspended
      isShared
      signerAlgorithm
      signerTruncate
      updatedAt
    }
  }
`)

export const UPDATE_SPACE = gql(`
  mutation UpdateSpace($key: String!, $input: SpaceInput!) {
    updateSpace(key: $key, input: $input) {
      orgId
      key
      name
      storageType
      bucket
      prefix
      region
      endpoint
      usePathStyle
      customDomain
      suspended
      isShared
      signerAlgorithm
      signerTruncate
      updatedAt
    }
  }
`)

export const DELETE_SPACE = gql(`
  mutation DeleteSpace($key: String!) {
    deleteSpace(key: $key)
  }
`)
