import type {
  ConfigureEmbeddedImagorMutation,
  ConfigureExternalImagorMutation,
  ConfigureExternalImagorMutationVariables,
  GenerateImagorUrlMutation,
  GenerateImagorUrlMutationVariables,
  GenerateImagorUrlsMutation,
  GenerateImagorUrlsMutationVariables,
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

/**
 * Generate Imagor URL for image transformations
 */
export async function generateImagorUrl(
  variables: GenerateImagorUrlMutationVariables,
  signal?: AbortSignal,
): Promise<string> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.GenerateImagorUrl(variables, undefined, signal)
  return result.generateImagorUrl
}

/**
 * Generate multiple Imagor URLs in bulk
 */
export async function generateImagorUrlsBulk(
  variables: GenerateImagorUrlsMutationVariables,
  signal?: AbortSignal,
): Promise<string[]> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.GenerateImagorUrls(variables, undefined, signal)
  return result.generateImagorUrls
}
