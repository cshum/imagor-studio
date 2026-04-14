import type {
  CreateSpaceMutation,
  CreateSpaceMutationVariables,
  DeleteSpaceMutation,
  DeleteSpaceMutationVariables,
  GetSpaceQuery,
  ListSpacesQuery,
  UpdateSpaceMutation,
  UpdateSpaceMutationVariables,
} from '@/generated/graphql'
import { getSdk } from '@/generated/graphql-request'
import { getGraphQLClient } from '@/lib/graphql-client'

export type SpaceItem = ListSpacesQuery['spaces'][number]

export async function listSpaces(): Promise<ListSpacesQuery['spaces']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.ListSpaces()
  return result.spaces
}

export async function createSpace(
  variables: CreateSpaceMutationVariables,
): Promise<CreateSpaceMutation['createSpace']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.CreateSpace(variables)
  return result.createSpace
}

export async function updateSpace(
  variables: UpdateSpaceMutationVariables,
): Promise<UpdateSpaceMutation['updateSpace']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.UpdateSpace(variables)
  return result.updateSpace
}

export async function getSpace(key: string): Promise<GetSpaceQuery['space']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.GetSpace({ key })
  return result.space
}

export async function deleteSpace(
  variables: DeleteSpaceMutationVariables,
): Promise<DeleteSpaceMutation['deleteSpace']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.DeleteSpace(variables)
  return result.deleteSpace
}
