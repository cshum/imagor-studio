import { getGraphQLClient } from '@/lib/graphql-client'

import type {
  DeleteSystemRegistryMutation,
  DeleteSystemRegistryMutationVariables,
  DeleteUserRegistryMutation,
  DeleteUserRegistryMutationVariables,
  GetSystemRegistryQuery,
  GetSystemRegistryQueryVariables,
  GetUserRegistryQuery,
  GetUserRegistryQueryVariables,
  ListSystemRegistryQuery,
  ListSystemRegistryQueryVariables,
  ListUserRegistryQuery,
  ListUserRegistryQueryVariables,
  SetSystemRegistryMutation,
  SetSystemRegistryMutationVariables,
  SetUserRegistryMutation,
  SetUserRegistryMutationVariables,
} from '../generated/graphql'
import { getSdk } from '../generated/graphql-request'

/**
 * List user registry entries with optional prefix filter and owner
 */
export async function listUserRegistry(
  prefix?: string,
  ownerID?: string,
): Promise<ListUserRegistryQuery['listUserRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: ListUserRegistryQueryVariables = {
    prefix: prefix ?? null,
    ownerID: ownerID ?? null,
  }

  const result = await sdk.ListUserRegistry(variables)
  return result.listUserRegistry
}

/**
 * Get a specific user registry entry by key and owner
 */
export async function getUserRegistry(
  key: string,
  ownerID?: string,
): Promise<GetUserRegistryQuery['getUserRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: GetUserRegistryQueryVariables = {
    key,
    ownerID: ownerID ?? null,
  }

  const result = await sdk.GetUserRegistry(variables)
  return result.getUserRegistry
}

/**
 * Set or update a user registry entry (single value)
 */
export async function setUserRegistry(
  key: string,
  value: string,
  ownerID?: string,
): Promise<SetUserRegistryMutation['setUserRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: SetUserRegistryMutationVariables = {
    entries: [{ key, value }],
    ownerID: ownerID ?? null,
  }

  const result = await sdk.SetUserRegistry(variables)
  return result.setUserRegistry
}

/**
 * Set or update multiple user registry entries
 */
export async function setUserRegistryMultiple(
  entries: Array<{ key: string; value: string }>,
  ownerID?: string,
): Promise<SetUserRegistryMutation['setUserRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: SetUserRegistryMutationVariables = {
    entries,
    ownerID: ownerID ?? null,
  }

  const result = await sdk.SetUserRegistry(variables)
  return result.setUserRegistry
}

/**
 * Delete a user registry entry
 */
export async function deleteUserRegistry(
  key: string,
  ownerID?: string,
): Promise<DeleteUserRegistryMutation['deleteUserRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: DeleteUserRegistryMutationVariables = {
    key,
    ownerID: ownerID ?? null,
  }

  const result = await sdk.DeleteUserRegistry(variables)
  return result.deleteUserRegistry
}

/**
 * Get user registry as a key-value object
 */
export async function getUserRegistryObject(
  prefix?: string,
  ownerID?: string,
): Promise<Record<string, string>> {
  const registryList = await listUserRegistry(prefix, ownerID)

  const registryObject: Record<string, string> = {}
  for (const item of registryList) {
    registryObject[item.key] = item.value
  }

  return registryObject
}

/**
 * List system registry entries with optional prefix filter (admin only)
 */
export async function listSystemRegistry(
  prefix?: string,
): Promise<ListSystemRegistryQuery['listSystemRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: ListSystemRegistryQueryVariables = {
    prefix: prefix ?? null,
  }

  const result = await sdk.ListSystemRegistry(variables)
  return result.listSystemRegistry
}

/**
 * Get a specific system registry entry by key (admin only)
 */
export async function getSystemRegistry(
  key: string,
): Promise<GetSystemRegistryQuery['getSystemRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: GetSystemRegistryQueryVariables = { key }
  const result = await sdk.GetSystemRegistry(variables)
  return result.getSystemRegistry
}

/**
 * Set or update a system registry entry (admin only, single value)
 */
export async function setSystemRegistry(
  key: string,
  value: string,
): Promise<SetSystemRegistryMutation['setSystemRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: SetSystemRegistryMutationVariables = {
    entries: [{ key, value }],
  }

  const result = await sdk.SetSystemRegistry(variables)
  return result.setSystemRegistry
}

/**
 * Set or update multiple system registry entries (admin only)
 */
export async function setSystemRegistryMultiple(
  entries: Array<{ key: string; value: string }>,
): Promise<SetSystemRegistryMutation['setSystemRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: SetSystemRegistryMutationVariables = {
    entries,
  }

  const result = await sdk.SetSystemRegistry(variables)
  return result.setSystemRegistry
}

/**
 * Delete a system registry entry (admin only)
 */
export async function deleteSystemRegistry(
  key: string,
): Promise<DeleteSystemRegistryMutation['deleteSystemRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: DeleteSystemRegistryMutationVariables = { key }
  const result = await sdk.DeleteSystemRegistry(variables)
  return result.deleteSystemRegistry
}

/**
 * Get system registry as a key-value object (admin only)
 */
export async function getSystemRegistryObject(prefix?: string): Promise<Record<string, string>> {
  const registryList = await listSystemRegistry(prefix)

  const registryObject: Record<string, string> = {}
  for (const item of registryList) {
    registryObject[item.key] = item.value
  }

  return registryObject
}
