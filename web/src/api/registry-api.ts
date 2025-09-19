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
 * Display value for a registry entry, showing dots for encrypted values
 */
export function displayRegistryValue(entry: { value: string; isEncrypted: boolean }): string {
  if (entry.isEncrypted) {
    return '••••••••' // Always show dots for encrypted
  }
  return entry.value || '(empty)'
}

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
    keys: undefined,
    ownerID: ownerID ?? undefined,
  }

  const result = await sdk.GetUserRegistry(variables)
  return result.getUserRegistry
}

/**
 * Get multiple user registry entries by keys and owner
 */
export async function getUserRegistryMultiple(
  keys: string[],
  ownerID?: string,
): Promise<GetUserRegistryQuery['getUserRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: GetUserRegistryQueryVariables = {
    key: undefined,
    keys,
    ownerID: ownerID ?? undefined,
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
  isEncrypted: boolean = false,
  ownerID?: string,
): Promise<SetUserRegistryMutation['setUserRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: SetUserRegistryMutationVariables = {
    entry: { key, value, isEncrypted },
    entries: undefined,
    ownerID: ownerID ?? undefined,
  }

  const result = await sdk.SetUserRegistry(variables)
  return result.setUserRegistry
}

/**
 * Set or update multiple user registry entries
 */
export async function setUserRegistryMultiple(
  entries: Array<{ key: string; value: string; isEncrypted?: boolean }>,
  ownerID?: string,
): Promise<SetUserRegistryMutation['setUserRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const entriesWithEncryption = entries.map((entry) => ({
    key: entry.key,
    value: entry.value,
    isEncrypted: entry.isEncrypted ?? false,
  }))

  const variables: SetUserRegistryMutationVariables = {
    entry: undefined,
    entries: entriesWithEncryption,
    ownerID: ownerID ?? undefined,
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
 * Get user registry as a key-value object (excludes encrypted entries)
 */
export async function getUserRegistryObject(
  prefix?: string,
  ownerID?: string,
): Promise<Record<string, string>> {
  const registryList = await listUserRegistry(prefix, ownerID)

  const registryObject: Record<string, string> = {}
  for (const item of registryList) {
    // Skip encrypted entries - they're write-only
    if (!item.isEncrypted) {
      registryObject[item.key] = item.value
    }
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

  const variables: GetSystemRegistryQueryVariables = {
    key,
    keys: undefined,
  }
  const result = await sdk.GetSystemRegistry(variables)
  return result.getSystemRegistry
}

/**
 * Get multiple system registry entries by keys (admin only)
 */
export async function getSystemRegistryMultiple(
  keys: string[],
): Promise<GetSystemRegistryQuery['getSystemRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: GetSystemRegistryQueryVariables = {
    key: undefined,
    keys,
  }
  const result = await sdk.GetSystemRegistry(variables)
  return result.getSystemRegistry
}

/**
 * Set or update a system registry entry (admin only, single value)
 */
export async function setSystemRegistry(
  key: string,
  value: string,
  isEncrypted: boolean = false,
): Promise<SetSystemRegistryMutation['setSystemRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: SetSystemRegistryMutationVariables = {
    entry: { key, value, isEncrypted },
    entries: undefined,
  }

  const result = await sdk.SetSystemRegistry(variables)
  return result.setSystemRegistry
}

/**
 * Set or update multiple system registry entries (admin only)
 */
export async function setSystemRegistryMultiple(
  entries: Array<{ key: string; value: string; isEncrypted?: boolean }>,
): Promise<SetSystemRegistryMutation['setSystemRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const entriesWithEncryption = entries.map((entry) => ({
    key: entry.key,
    value: entry.value,
    isEncrypted: entry.isEncrypted ?? false,
  }))

  const variables: SetSystemRegistryMutationVariables = {
    entry: undefined,
    entries: entriesWithEncryption,
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
 * Get system registry as a key-value object (admin only, excludes encrypted entries)
 */
export async function getSystemRegistryObject(prefix?: string): Promise<Record<string, string>> {
  const registryList = await listSystemRegistry(prefix)

  const registryObject: Record<string, string> = {}
  for (const item of registryList) {
    // Skip encrypted entries - they're write-only
    if (!item.isEncrypted) {
      registryObject[item.key] = item.value
    }
  }

  return registryObject
}

/**
 * Set system registry from a key-value object (admin only)
 */
export async function setSystemRegistryObject(
  registryObject: Record<string, string>,
): Promise<SetSystemRegistryMutation['setSystemRegistry']> {
  const sdk = getSdk(getGraphQLClient())

  const entries = Object.entries(registryObject).map(([key, value]) => ({
    key,
    value,
    isEncrypted: false,
  }))
  const result = await sdk.SetSystemRegistry({
    entry: undefined,
    entries,
  })
  return result.setSystemRegistry
}

/**
 * Activate license with the provided key (REST API)
 */
export async function activateLicense(key: string): Promise<{
  isLicensed: boolean
  licenseType?: string
  email?: string
  message: string
  supportMessage?: string
}> {
  const response = await fetch('/api/public/activate-license', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key }),
  })

  if (!response.ok) {
    throw new Error(`Failed to activate license: ${response.statusText}`)
  }

  return response.json()
}
