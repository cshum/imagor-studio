import { getSharedGraphQLSdkWithClient } from '@/api/generated-clients'
import type {
  ConfigureImagorMutation,
  ConfigureImagorMutationVariables,
  GenerateImagorUrlFromTemplateMutation,
  GenerateImagorUrlFromTemplateMutationVariables,
  GenerateImagorUrlMutation,
  GenerateImagorUrlMutationVariables,
  ImagorStatusQuery,
} from '@/generated/graphql'

/**
 * Get Imagor status and configuration
 */
export async function getImagorStatus(): Promise<ImagorStatusQuery['imagorStatus']> {
  const sdk = getSharedGraphQLSdkWithClient()
  const result = await sdk.ImagorStatus()
  return result.imagorStatus
}

/**
 * Configure Imagor
 */
export async function configureImagor(
  variables: ConfigureImagorMutationVariables,
): Promise<ConfigureImagorMutation['configureImagor']> {
  const sdk = getSharedGraphQLSdkWithClient()
  const result = await sdk.ConfigureImagor(variables)
  return result.configureImagor
}

/**
 * Generate Imagor URL for image transformations
 */
export async function generateImagorUrl(
  variables: GenerateImagorUrlMutationVariables,
  signal?: AbortSignal,
): Promise<GenerateImagorUrlMutation['generateImagorUrl']> {
  const sdk = getSharedGraphQLSdkWithClient()
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
  const sdk = getSharedGraphQLSdkWithClient()
  const result = await sdk.GenerateImagorUrlFromTemplate(variables, undefined, signal)
  return result.generateImagorUrlFromTemplate
}
