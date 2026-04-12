import type {
  ConfigureEmbeddedImagorMutation,
  ConfigureEmbeddedImagorMutationVariables,
  GenerateImagorUrlFromTemplateMutation,
  GenerateImagorUrlFromTemplateMutationVariables,
  GenerateImagorUrlMutation,
  GenerateImagorUrlMutationVariables,
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
 * Configure embedded Imagor (always embedded mode)
 */
export async function configureEmbeddedImagor(
  variables: ConfigureEmbeddedImagorMutationVariables,
): Promise<ConfigureEmbeddedImagorMutation['configureEmbeddedImagor']> {
  const sdk = getSdk(getGraphQLClient())
  const result = await sdk.ConfigureEmbeddedImagor(variables)
  return result.configureEmbeddedImagor
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
