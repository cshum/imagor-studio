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
      id
      orgId
      key
      name
      storageUsageBytes
      processingUsageCount
      storageMode
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
      imagorCORSOrigins
      canManage
      canDelete
      canLeave
      updatedAt
    }
  }
`)

export const GET_USAGE_SUMMARY = gql(`
  query GetUsageSummary {
    usageSummary {
      usedSpaces
      maxSpaces
      usedHostedStorageBytes
      storageLimitGB
      usedTransforms
      transformsLimit
      periodStart
      periodEnd
    }
  }
`)

export const CREATE_CHECKOUT_SESSION = gql(`
  mutation CreateCheckoutSession($plan: String!, $successURL: String!, $cancelURL: String!) {
    createCheckoutSession(plan: $plan, successURL: $successURL, cancelURL: $cancelURL) {
      url
    }
  }
`)

export const CREATE_BILLING_PORTAL_SESSION = gql(`
  mutation CreateBillingPortalSession($returnURL: String!) {
    createBillingPortalSession(returnURL: $returnURL) {
      url
    }
  }
`)

export const GET_SPACE = gql(`
  query GetSpace($key: String!) {
    space(key: $key) {
      id
      orgId
      key
      name
      storageUsageBytes
      storageMode
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
      imagorCORSOrigins
      canManage
      canDelete
      canLeave
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
      storageMode
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
      imagorCORSOrigins
      canManage
      canDelete
      canLeave
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
      storageMode
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
      imagorCORSOrigins
      canManage
      canDelete
      canLeave
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
  query GetSpaceRegistry($spaceID: String!, $keys: [String!]) {
    spaceRegistry(spaceID: $spaceID, keys: $keys) {
      key
      value
      isEncrypted
    }
  }
`)

export const SET_SPACE_REGISTRY = gql(`
  mutation SetSpaceRegistry($spaceID: String!, $entries: [RegistryEntryInput!]) {
    setSpaceRegistry(spaceID: $spaceID, entries: $entries) {
      key
      value
      isEncrypted
    }
  }
`)

export const DELETE_SPACE_REGISTRY = gql(`
  mutation DeleteSpaceRegistry($spaceID: String!, $keys: [String!]!) {
    deleteSpaceRegistry(spaceID: $spaceID, keys: $keys)
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
      email
      avatarUrl
      role
      createdAt
    }
  }
`)

export const LIST_SPACE_MEMBERS = gql(`
  query ListSpaceMembers($spaceID: String!) {
    spaceMembers(spaceID: $spaceID) {
      userId
      username
      displayName
      email
      avatarUrl
      role
      roleSource
      canChangeRole
      canRemove
      createdAt
    }
  }
`)

export const LIST_SPACE_INVITATIONS = gql(`
  query ListSpaceInvitations($spaceID: String!) {
    spaceInvitations(spaceID: $spaceID) {
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

export const ADD_ORG_MEMBER_BY_EMAIL = gql(`
  mutation AddOrgMemberByEmail($email: String!, $role: String!) {
    addOrgMemberByEmail(email: $email, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`)

export const ADD_SPACE_MEMBER = gql(`
  mutation AddSpaceMember($spaceID: String!, $userId: ID!, $role: String!) {
    addSpaceMember(spaceID: $spaceID, userId: $userId, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`)

export const INVITE_SPACE_MEMBER = gql(`
  mutation InviteSpaceMember($spaceID: String!, $email: String!, $role: String!) {
    inviteSpaceMember(spaceID: $spaceID, email: $email, role: $role) {
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
  mutation RemoveSpaceMember($spaceID: String!, $userId: ID!) {
    removeSpaceMember(spaceID: $spaceID, userId: $userId)
  }
`)

export const LEAVE_SPACE = gql(`
  mutation LeaveSpace($spaceID: String!) {
    leaveSpace(spaceID: $spaceID)
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
  mutation UpdateSpaceMemberRole($spaceID: String!, $userId: ID!, $role: String!) {
    updateSpaceMemberRole(spaceID: $spaceID, userId: $userId, role: $role) {
      userId
      username
      displayName
      role
      createdAt
    }
  }
`)
