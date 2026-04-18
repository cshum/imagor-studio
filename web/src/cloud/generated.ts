import { getSdk as getCloudSdk } from '@/generated/cloud/graphql-request'
import { getGraphQLClient } from '@/lib/graphql-client'

export function getCloudGraphQLSdk(token?: string) {
  return getCloudSdk(getGraphQLClient(token))
}

export function getCloudGraphQLSdkWithClient() {
  return getCloudGraphQLSdk()
}
