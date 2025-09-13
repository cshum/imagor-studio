import type {
  ConfigureEmbeddedImagorMutation,
  ConfigureExternalImagorMutation,
  ConfigureExternalImagorMutationVariables,
  ImagorStatusQuery,
} from '@/generated/graphql'
import { getSdk } from '@/generated/graphql-request'
import { getGraphQLClient } from '@/lib/graphql-client'

/**
 * Get Imagor status and configuration
 */
export async function getImagorStatus(): Promise<ImagorStatusQuery['imagorStatus']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.ImagorStatus()
  return result.imagorStatus
}

/**
 * Configure embedded Imagor
 */
export async function configureEmbeddedImagor(): Promise<
  ConfigureEmbeddedImagorMutation['configureEmbeddedImagor']
> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.ConfigureEmbeddedImagor()
  return result.configureEmbeddedImagor
}

/**
 * Configure external Imagor
 */
export async function configureExternalImagor(
  variables: ConfigureExternalImagorMutationVariables,
): Promise<ConfigureExternalImagorMutation['configureExternalImagor']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.ConfigureExternalImagor(variables)
  return result.configureExternalImagor
}
