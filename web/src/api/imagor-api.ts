import type {
  ConfigureEmbeddedImagorMutation,
  ConfigureExternalImagorMutation,
  ConfigureExternalImagorMutationVariables,
  GenerateImagorUrlMutation,
  GenerateImagorUrlMutationVariables,
  GenerateImagorUrlFromTemplateMutation,
  GenerateImagorUrlFromTemplateMutationVariables,
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
): Promise<GenerateImagorUrlMutation['generateImagorUrl']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.GenerateImagorUrl(variables, undefined, signal)
  return result.generateImagorUrl
}

/**
 * Generate Imagor URL from template JSON (backend conversion).
 * Handles all URL generation: preview, copy URL, download (via appendFilters), thumbnail.
 */
export async function generateImagorUrlFromTemplate(
  variables: GenerateImagorUrlFromTemplateMutationVariables,
  signal?: AbortSignal,
): Promise<GenerateImagorUrlFromTemplateMutation['generateImagorUrlFromTemplate']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.GenerateImagorUrlFromTemplate(variables, undefined, signal)
  return result.generateImagorUrlFromTemplate
}
