import { getSdk as getSelfHostedSdk } from '@/generated/selfhosted/graphql-request'
import { getSdk as getCloudSdk } from '@/generated/cloud/graphql-request'
import { getGraphQLClient } from '@/lib/graphql-client'

// Transitional GraphQL SDK accessors.
// These wrappers are the seam where mode-specific generated SDKs can be adopted
// without changing every API module at once.
export function getSharedGraphQLSdk(token?: string) {
  return getSelfHostedSdk(getGraphQLClient(token))
}

export function getSelfHostedGraphQLSdk(token?: string) {
  return getSelfHostedSdk(getGraphQLClient(token))
}

export function getCloudGraphQLSdk(token?: string) {
  return getCloudSdk(getGraphQLClient(token))
}

export function getCloudGraphQLSdkWithClient() {
  return getCloudGraphQLSdk()
}

export function getSharedGraphQLSdkWithClient(token?: string) {
  return getSharedGraphQLSdk(token)
}
