import { getGraphQLClient } from '@/lib/graphql-client'

import type {
  DeleteSystemMetadataMutation,
  DeleteSystemMetadataMutationVariables,
  DeleteUserMetadataMutation,
  DeleteUserMetadataMutationVariables,
  GetSystemMetadataQuery,
  GetSystemMetadataQueryVariables,
  GetUserMetadataQuery,
  GetUserMetadataQueryVariables,
  ListSystemMetadataQuery,
  ListSystemMetadataQueryVariables,
  ListUserMetadataQuery,
  ListUserMetadataQueryVariables,
  SetSystemMetadataMutation,
  SetSystemMetadataMutationVariables,
  SetUserMetadataMutation,
  SetUserMetadataMutationVariables,
} from '../generated/graphql'
import { getSdk } from '../generated/graphql-request'

/**
 * List user metadata entries with optional prefix filter and owner
 */
export async function listUserMetadata(
  prefix?: string,
  ownerID?: string,
): Promise<ListUserMetadataQuery['listUserMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: ListUserMetadataQueryVariables = {
    prefix: prefix ?? null,
    ownerID: ownerID ?? null,
  }

  const result = await sdk.ListUserMetadata(variables)
  return result.listUserMetadata
}

/**
 * Get a specific user metadata entry by key and owner
 */
export async function getUserMetadata(
  key: string,
  ownerID?: string,
): Promise<GetUserMetadataQuery['getUserMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: GetUserMetadataQueryVariables = {
    key,
    ownerID: ownerID ?? null,
  }

  const result = await sdk.GetUserMetadata(variables)
  return result.getUserMetadata
}

/**
 * Set or update a user metadata entry
 */
export async function setUserMetadata(
  key: string,
  value: string,
  ownerID?: string,
): Promise<SetUserMetadataMutation['setUserMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: SetUserMetadataMutationVariables = {
    key,
    value,
    ownerID: ownerID ?? null,
  }

  const result = await sdk.SetUserMetadata(variables)
  return result.setUserMetadata
}

/**
 * Delete a user metadata entry
 */
export async function deleteUserMetadata(
  key: string,
  ownerID?: string,
): Promise<DeleteUserMetadataMutation['deleteUserMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: DeleteUserMetadataMutationVariables = {
    key,
    ownerID: ownerID ?? null,
  }

  const result = await sdk.DeleteUserMetadata(variables)
  return result.deleteUserMetadata
}

/**
 * Get user metadata as a key-value object
 */
export async function getUserMetadataObject(
  prefix?: string,
  ownerID?: string,
): Promise<Record<string, string>> {
  const metadataList = await listUserMetadata(prefix, ownerID)

  const metadataObject: Record<string, string> = {}
  for (const item of metadataList) {
    metadataObject[item.key] = item.value
  }

  return metadataObject
}

/**
 * List system metadata entries with optional prefix filter (admin only)
 */
export async function listSystemMetadata(
  prefix?: string,
): Promise<ListSystemMetadataQuery['listSystemMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: ListSystemMetadataQueryVariables = {
    prefix: prefix ?? null,
  }

  const result = await sdk.ListSystemMetadata(variables)
  return result.listSystemMetadata
}

/**
 * Get a specific system metadata entry by key (admin only)
 */
export async function getSystemMetadata(
  key: string,
): Promise<GetSystemMetadataQuery['getSystemMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: GetSystemMetadataQueryVariables = { key }
  const result = await sdk.GetSystemMetadata(variables)
  return result.getSystemMetadata
}

/**
 * Set or update a system metadata entry (admin only)
 */
export async function setSystemMetadata(
  key: string,
  value: string,
): Promise<SetSystemMetadataMutation['setSystemMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: SetSystemMetadataMutationVariables = {
    key,
    value,
  }

  const result = await sdk.SetSystemMetadata(variables)
  return result.setSystemMetadata
}

/**
 * Delete a system metadata entry (admin only)
 */
export async function deleteSystemMetadata(
  key: string,
): Promise<DeleteSystemMetadataMutation['deleteSystemMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: DeleteSystemMetadataMutationVariables = { key }
  const result = await sdk.DeleteSystemMetadata(variables)
  return result.deleteSystemMetadata
}

/**
 * Get system metadata as a key-value object (admin only)
 */
export async function getSystemMetadataObject(prefix?: string): Promise<Record<string, string>> {
  const metadataList = await listSystemMetadata(prefix)

  const metadataObject: Record<string, string> = {}
  for (const item of metadataList) {
    metadataObject[item.key] = item.value
  }

  return metadataObject
}
