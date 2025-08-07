import { getGraphQLClient } from '@/lib/graphql-client'

import type {
  DeleteMetadataMutation,
  DeleteMetadataMutationVariables,
  GetMetadataQuery,
  GetMetadataQueryVariables,
  ListMetadataQuery,
  ListMetadataQueryVariables,
  SetMetadataMutation,
  SetMetadataMutationVariables,
} from '../generated/graphql'
import { getSdk } from '../generated/graphql-request'

/**
 * List metadata entries with optional prefix filter
 */
export async function listMetadata(prefix?: string): Promise<ListMetadataQuery['listMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: ListMetadataQueryVariables = {
    prefix: prefix ?? null,
  }

  const result = await sdk.ListMetadata(variables)
  return result.listMetadata
}

/**
 * Get a specific metadata entry by key
 */
export async function getMetadata(key: string): Promise<GetMetadataQuery['getMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: GetMetadataQueryVariables = { key }
  const result = await sdk.GetMetadata(variables)
  return result.getMetadata
}

/**
 * Set or update a metadata entry
 */
export async function setMetadata(
  key: string,
  value: string,
): Promise<SetMetadataMutation['setMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: SetMetadataMutationVariables = {
    key,
    value,
  }

  const result = await sdk.SetMetadata(variables)
  return result.setMetadata
}

/**
 * Delete a metadata entry
 */
export async function deleteMetadata(
  key: string,
): Promise<DeleteMetadataMutation['deleteMetadata']> {
  const sdk = getSdk(getGraphQLClient())

  const variables: DeleteMetadataMutationVariables = { key }
  const result = await sdk.DeleteMetadata(variables)
  return result.deleteMetadata
}

/**
 * Get metadata as a key-value object
 */
export async function getMetadataObject(prefix?: string): Promise<Record<string, string>> {
  const metadataList = await listMetadata(prefix)

  const metadataObject: Record<string, string> = {}
  for (const item of metadataList) {
    metadataObject[item.key] = item.value
  }

  return metadataObject
}

/**
 * Set multiple metadata entries at once
 */
export async function setMultipleMetadata(
  entries: Array<{ key: string; value: string }>,
): Promise<Array<SetMetadataMutation['setMetadata']>> {
  const promises = entries.map(({ key, value }) => setMetadata(key, value))
  return Promise.all(promises)
}

/**
 * Delete multiple metadata entries
 */
export async function deleteMultipleMetadata(keys: string[]): Promise<boolean[]> {
  const promises = keys.map((key) => deleteMetadata(key))
  return Promise.all(promises)
}

/**
 * Check if a metadata key exists
 */
export async function hasMetadata(key: string): Promise<boolean> {
  try {
    const metadata = await getMetadata(key)
    return metadata !== null
  } catch (error) {
    return false
  }
}

/**
 * Update metadata only if it exists
 */
export async function updateMetadata(key: string, value: string): Promise<boolean> {
  const exists = await hasMetadata(key)
  if (exists) {
    await setMetadata(key, value)
    return true
  }
  return false
}

/**
 * Get metadata with fallback value
 */
export async function getMetadataWithDefault(key: string, defaultValue: string): Promise<string> {
  try {
    const metadata = await getMetadata(key)
    return metadata?.value ?? defaultValue
  } catch (error) {
    return defaultValue
  }
}

/**
 * Search metadata by key pattern
 */
export async function searchMetadata(pattern: string): Promise<ListMetadataQuery['listMetadata']> {
  // For now, we'll use prefix search as the backend supports it
  // In the future, this could be enhanced with more sophisticated pattern matching
  return listMetadata(pattern)
}

/**
 * Get metadata statistics
 */
export async function getMetadataStats(prefix?: string) {
  const metadataList = await listMetadata(prefix)

  return {
    totalCount: metadataList.length,
    keys: metadataList.map((item) => item.key),
    totalValueLength: metadataList.reduce((sum, item) => sum + item.value.length, 0),
    averageValueLength:
      metadataList.length > 0
        ? metadataList.reduce((sum, item) => sum + item.value.length, 0) / metadataList.length
        : 0,
  }
}
