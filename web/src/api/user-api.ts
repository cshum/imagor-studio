import { getSharedGraphQLSdk } from '@/api/generated-clients'

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
  ReactivateAccountMutation,
  ReactivateAccountMutationVariables,
  RequestEmailChangeMutation,
  RequestEmailChangeMutationVariables,
  UnlinkAuthProviderMutation,
  UnlinkAuthProviderMutationVariables,
  UpdateProfileMutation,
  UpdateProfileMutationVariables,
} from '../generated/graphql'

/**
 * Get current user information
 */
export async function getCurrentUser(token?: string): Promise<MeQuery['me']> {
  const sdk = getSharedGraphQLSdk(token)
  const result = await sdk.Me()
  return result.me
}

/**
 * Get user by ID (admin only)
 */
export async function getUser(id: string): Promise<GetUserQuery['user']> {
  const sdk = getSharedGraphQLSdk()
  const variables: GetUserQueryVariables = { id }
  const result = await sdk.GetUser(variables)
  return result.user
}

/**
 * List users with pagination and search (admin only)
 */
export async function listUsers(
  offset?: number,
  limit?: number,
  search?: string,
): Promise<ListUsersQuery['users']> {
  const sdk = getSharedGraphQLSdk()
  const variables: ListUsersQueryVariables = { offset, limit, search }
  const result = await sdk.ListUsers(variables)
  return result.users
}

/**
 * Update user profile (self or admin)
 */
export async function updateProfile(
  { displayName, username }: { displayName?: string; username?: string },
  userId?: string,
): Promise<UpdateProfileMutation['updateProfile']> {
  const sdk = getSharedGraphQLSdk()
  const variables: UpdateProfileMutationVariables = {
    input: {
      displayName: displayName ?? null,
      username: username ?? null,
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
  const sdk = getSharedGraphQLSdk()
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
 * Request email change (self or admin)
 */
export async function requestEmailChange(
  email: string,
  userId?: string,
): Promise<RequestEmailChangeMutation['requestEmailChange']> {
  const sdk = getSharedGraphQLSdk()
  const variables: RequestEmailChangeMutationVariables = {
    email,
    userId: userId ?? null,
  }
  const result = await sdk.RequestEmailChange(variables)
  return result.requestEmailChange
}

/**
 * Unlink auth provider (self or admin)
 */
export async function unlinkAuthProvider(
  provider: string,
  userId?: string,
): Promise<UnlinkAuthProviderMutation['unlinkAuthProvider']> {
  const sdk = getSharedGraphQLSdk()
  const variables: UnlinkAuthProviderMutationVariables = {
    provider,
    userId: userId ?? null,
  }
  const result = await sdk.UnlinkAuthProvider(variables)
  return result.unlinkAuthProvider
}

/**
 * Deactivate account (self or admin)
 */
export async function deactivateAccount(
  userId?: string,
): Promise<DeactivateAccountMutation['deactivateAccount']> {
  const sdk = getSharedGraphQLSdk()
  const variables: DeactivateAccountMutationVariables = {
    userId: userId ?? null,
  }
  const result = await sdk.DeactivateAccount(variables)
  return result.deactivateAccount
}

/**
 * Reactivate a deactivated account (admin only)
 */
export async function reactivateAccount(
  userId: string,
): Promise<ReactivateAccountMutation['reactivateAccount']> {
  const sdk = getSharedGraphQLSdk()
  const variables: ReactivateAccountMutationVariables = { userId }
  const result = await sdk.ReactivateAccount(variables)
  return result.reactivateAccount
}

/**
 * Create new user (admin only)
 */
export async function createUser(input: {
  displayName: string
  username: string
  password: string
  role: string
}): Promise<CreateUserMutation['createUser']> {
  const sdk = getSharedGraphQLSdk()
  const variables: CreateUserMutationVariables = { input }
  const result = await sdk.CreateUser(variables)
  return result.createUser
}
