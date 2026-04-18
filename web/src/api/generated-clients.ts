import { getSdk as getSharedSdk } from '@/generated/graphql-request'
import { getGraphQLClient } from '@/lib/graphql-client'

// Transitional GraphQL SDK accessors.
// These wrappers are the seam where mode-specific generated SDKs can be adopted
// without changing every API module at once.
export function getSharedGraphQLSdk(token?: string) {
  return getSharedSdk(getGraphQLClient(token))
}

export const getSelfHostedGraphQLSdk = getSharedGraphQLSdk
export const getCloudGraphQLSdk = getSharedGraphQLSdk

export function getCloudGraphQLSdkWithClient() {
  return getCloudGraphQLSdk()
}

export function getSharedGraphQLSdkWithClient(token?: string) {
  return getSharedGraphQLSdk(token)
}
