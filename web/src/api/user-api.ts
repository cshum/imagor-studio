import { getGraphQLClient } from '@/lib/graphql-client'

import type {
  ChangePasswordMutation,
  ChangePasswordMutationVariables,
  CreateUserMutation,
  CreateUserMutationVariables,
  DeactivateAccountMutation,
  DeactivateAccountMutationVariables,
  GetUserQuery,
  GetUserQueryVariables,
  ListUsersQuery,
  ListUsersQueryVariables,
  MeQuery,
  UpdateProfileMutation,
  UpdateProfileMutationVariables,
} from '../generated/graphql'
import { getSdk } from '../generated/graphql-request'

/**
 * Get current user information
 */
export async function getCurrentUser(token?: string): Promise<MeQuery['me']> {
  const sdk = getSdk(getGraphQLClient(token))
  const result = await sdk.Me()
  return result.me
}

/**
 * Get user by ID (admin only)
 */
export async function getUser(id: string): Promise<GetUserQuery['user']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: GetUserQueryVariables = { id }
  const result = await sdk.GetUser(variables)
  return result.user
}

/**
 * List users with pagination (admin only)
 */
export async function listUsers(
  offset: number = 0,
  limit: number = 20,
): Promise<ListUsersQuery['users']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: ListUsersQueryVariables = { offset, limit }
  const result = await sdk.ListUsers(variables)
  return result.users
}

/**
 * Update user profile (self or admin)
 */
export async function updateProfile(
  { displayName, email }: { displayName?: string; email?: string },
  userId?: string,
): Promise<UpdateProfileMutation['updateProfile']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: UpdateProfileMutationVariables = {
    input: {
      displayName: displayName ?? null,
      email: email ?? null,
    },
    userId: userId ?? null,
  }
  const result = await sdk.UpdateProfile(variables)
  return result.updateProfile
}

/**
 * Change password (self or admin)
 */
export async function changePassword(
  currentPassword: string | undefined,
  newPassword: string,
  userId?: string,
): Promise<ChangePasswordMutation['changePassword']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: ChangePasswordMutationVariables = {
    input: {
      currentPassword: currentPassword ?? null,
      newPassword,
    },
    userId: userId ?? null,
  }
  const result = await sdk.ChangePassword(variables)
  return result.changePassword
}

/**
 * Deactivate account (self or admin)
 */
export async function deactivateAccount(
  userId?: string,
): Promise<DeactivateAccountMutation['deactivateAccount']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: DeactivateAccountMutationVariables = {
    userId: userId ?? null,
  }
  const result = await sdk.DeactivateAccount(variables)
  return result.deactivateAccount
}

/**
 * Create new user (admin only)
 */
export async function createUser(input: {
  displayName: string
  email: string
  password: string
  role: string
}): Promise<CreateUserMutation['createUser']> {
  const sdk = getSdk(getGraphQLClient())
  const variables: CreateUserMutationVariables = { input }
  const result = await sdk.CreateUser(variables)
  return result.createUser
}
