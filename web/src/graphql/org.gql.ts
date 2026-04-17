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

export const GET_SPACE_REGISTRY = gql(`
  query GetSpaceRegistry($spaceKey: String!, $keys: [String!]) {
    spaceRegistry(spaceKey: $spaceKey, keys: $keys) {
      key
      value
      isEncrypted
    }
  }
`)

export const SET_SPACE_REGISTRY = gql(`
  mutation SetSpaceRegistry($spaceKey: String!, $entries: [RegistryEntryInput!]) {
    setSpaceRegistry(spaceKey: $spaceKey, entries: $entries) {
      key
      value
      isEncrypted
    }
  }
`)

export const DELETE_SPACE_REGISTRY = gql(`
  mutation DeleteSpaceRegistry($spaceKey: String!, $keys: [String!]!) {
    deleteSpaceRegistry(spaceKey: $spaceKey, keys: $keys)
  }
`)

export const SPACE_KEY_EXISTS = gql(`
  query SpaceKeyExists($key: String!) {
    spaceKeyExists(key: $key)
  }
`)

export const LIST_ORG_MEMBERS = gql(`
  query ListOrgMembers {
    orgMembers {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`)

export const LIST_SPACE_MEMBERS = gql(`
  query ListSpaceMembers($spaceKey: String!) {
    spaceMembers(spaceKey: $spaceKey) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`)

export const LIST_SPACE_INVITATIONS = gql(`
  query ListSpaceInvitations($spaceKey: String!) {
    spaceInvitations(spaceKey: $spaceKey) {
      id
      email
      role
      createdAt
      expiresAt
    }
  }
`)

export const ADD_ORG_MEMBER = gql(`
  mutation AddOrgMember($username: String!, $role: String!) {
    addOrgMember(username: $username, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`)

export const ADD_SPACE_MEMBER = gql(`
  mutation AddSpaceMember($spaceKey: String!, $userId: ID!, $role: String!) {
    addSpaceMember(spaceKey: $spaceKey, userId: $userId, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`)

export const INVITE_SPACE_MEMBER = gql(`
  mutation InviteSpaceMember($spaceKey: String!, $email: String!, $role: String!) {
    inviteSpaceMember(spaceKey: $spaceKey, email: $email, role: $role) {
      status
      member {
        userId
        username
        displayName
        role
        createdAt
      }
      invitation {
        id
        email
        role
        createdAt
        expiresAt
      }
    }
  }
`)

export const REMOVE_ORG_MEMBER = gql(`
  mutation RemoveOrgMember($userId: ID!) {
    removeOrgMember(userId: $userId)
  }
`)

export const REMOVE_SPACE_MEMBER = gql(`
  mutation RemoveSpaceMember($spaceKey: String!, $userId: ID!) {
    removeSpaceMember(spaceKey: $spaceKey, userId: $userId)
  }
`)

export const UPDATE_ORG_MEMBER_ROLE = gql(`
  mutation UpdateOrgMemberRole($userId: ID!, $role: String!) {
    updateOrgMemberRole(userId: $userId, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`)

export const UPDATE_SPACE_MEMBER_ROLE = gql(`
  mutation UpdateSpaceMemberRole($spaceKey: String!, $userId: ID!, $role: String!) {
    updateSpaceMemberRole(spaceKey: $spaceKey, userId: $userId, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`)
