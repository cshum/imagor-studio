import { gql } from '@/generated'

export const UserFragment = gql(`
  fragment UserInfo on User {
    id
    displayName
    username
    role
    isActive
    createdAt
    updatedAt
    email
    pendingEmail
    emailVerified
    hasPassword
    avatarUrl
    authProviders {
      provider
      email
      linkedAt
    }
  }
`)

export const MeQuery = gql(`
  query Me {
    me {
      ...UserInfo
    }
  }
`)

export const GetUserQuery = gql(`
  query GetUser($id: ID!) {
    user(id: $id) {
      ...UserInfo
    }
  }
`)

export const ListUsersQuery = gql(`
  query ListUsers($offset: Int = 0, $limit: Int = 0, $search: String) {
    users(offset: $offset, limit: $limit, search: $search) {
      items {
        ...UserInfo
      }
      totalCount
    }
  }
`)

export const UpdateProfileMutation = gql(`
  mutation UpdateProfile($input: UpdateProfileInput!, $userId: ID) {
    updateProfile(input: $input, userId: $userId) {
      ...UserInfo
    }
  }
`)

export const ChangePasswordMutation = gql(`
  mutation ChangePassword($input: ChangePasswordInput!, $userId: ID) {
    changePassword(input: $input, userId: $userId)
  }
`)

export const RequestEmailChangeMutation = gql(`
  mutation RequestEmailChange($email: String!, $userId: ID) {
    requestEmailChange(email: $email, userId: $userId) {
      email
      verificationRequired
    }
  }
`)

export const UnlinkAuthProviderMutation = gql(`
  mutation UnlinkAuthProvider($provider: String!, $userId: ID) {
    unlinkAuthProvider(provider: $provider, userId: $userId)
  }
`)

export const DeactivateAccountMutation = gql(`
  mutation DeactivateAccount($userId: ID) {
    deactivateAccount(userId: $userId)
  }
`)

export const ReactivateAccountMutation = gql(`
  mutation ReactivateAccount($userId: ID!) {
    reactivateAccount(userId: $userId)
  }
`)

export const CreateUserMutation = gql(`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...UserInfo
    }
  }
`)
