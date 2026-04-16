import type {
  AddOrgMemberMutation,
  AddOrgMemberMutationVariables,
  CreateSpaceMutation,
  CreateSpaceMutationVariables,
  DeleteSpaceMutation,
  DeleteSpaceMutationVariables,
  DeleteSpaceRegistryMutation,
  DeleteSpaceRegistryMutationVariables,
  GetSpaceQuery,
  GetSpaceRegistryQuery,
  ListOrgMembersQuery,
  ListSpacesQuery,
  RemoveOrgMemberMutation,
  RemoveOrgMemberMutationVariables,
  SetSpaceRegistryMutation,
  SetSpaceRegistryMutationVariables,
  SpaceKeyExistsQuery,
  UpdateOrgMemberRoleMutation,
  UpdateOrgMemberRoleMutationVariables,
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

export async function getSpaceRegistry(
  spaceKey: string,
  keys?: string[],
): Promise<GetSpaceRegistryQuery['spaceRegistry']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.GetSpaceRegistry({ spaceKey, keys })
  return result.spaceRegistry
}

export async function setSpaceRegistry(
  variables: SetSpaceRegistryMutationVariables,
): Promise<SetSpaceRegistryMutation['setSpaceRegistry']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.SetSpaceRegistry(variables)
  return result.setSpaceRegistry
}

export async function deleteSpaceRegistry(
  variables: DeleteSpaceRegistryMutationVariables,
): Promise<DeleteSpaceRegistryMutation['deleteSpaceRegistry']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.DeleteSpaceRegistry(variables)
  return result.deleteSpaceRegistry
}

/** Convenience: save a map of {key → value} to the space-scoped registry */
export async function setSpaceRegistryObject(
  spaceKey: string,
  values: Record<string, string>,
): Promise<void> {
  const entries = Object.entries(values).map(([key, value]) => ({
    key,
    value,
    isEncrypted: false,
  }))
  if (entries.length === 0) return
  await setSpaceRegistry({ spaceKey, entries })
}

/** Returns true when the given space key is already taken (globally unique). */
export async function checkSpaceKey(key: string): Promise<SpaceKeyExistsQuery['spaceKeyExists']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.SpaceKeyExists({ key })
  return result.spaceKeyExists
}

// ── Org member management ────────────────────────────────────────────────────

export type OrgMemberItem = ListOrgMembersQuery['orgMembers'][number]

export async function listOrgMembers(): Promise<ListOrgMembersQuery['orgMembers']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.ListOrgMembers()
  return result.orgMembers
}

export async function addOrgMember(
  variables: AddOrgMemberMutationVariables,
): Promise<AddOrgMemberMutation['addOrgMember']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.AddOrgMember(variables)
  return result.addOrgMember
}

export async function removeOrgMember(
  variables: RemoveOrgMemberMutationVariables,
): Promise<RemoveOrgMemberMutation['removeOrgMember']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.RemoveOrgMember(variables)
  return result.removeOrgMember
}

export async function updateOrgMemberRole(
  variables: UpdateOrgMemberRoleMutationVariables,
): Promise<UpdateOrgMemberRoleMutation['updateOrgMemberRole']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.UpdateOrgMemberRole(variables)
  return result.updateOrgMemberRole
}
