import type {
  AddOrgMemberByEmailMutation,
  AddOrgMemberByEmailMutationVariables,
  AddOrgMemberMutation,
  AddOrgMemberMutationVariables,
  AddSpaceMemberMutation,
  AddSpaceMemberMutationVariables,
  CancelOrgInvitationMutation,
  CancelOrgInvitationMutationVariables,
  CreateBillingPortalSessionMutation,
  CreateBillingPortalSessionMutationVariables,
  CreateCheckoutSessionMutation,
  CreateCheckoutSessionMutationVariables,
  CreateSpaceMutation,
  CreateSpaceMutationVariables,
  DeleteOrganizationMutation,
  DeleteSpaceMutation,
  DeleteSpaceMutationVariables,
  DeleteSpaceRegistryMutation,
  DeleteSpaceRegistryMutationVariables,
  GetSpaceQuery,
  GetSpaceRegistryQuery,
  GetUsageSummaryQuery,
  InviteOrgMemberMutation,
  InviteOrgMemberMutationVariables,
  InviteSpaceMemberMutation,
  InviteSpaceMemberMutationVariables,
  LeaveOrganizationMutation,
  LeaveSpaceMutation,
  LeaveSpaceMutationVariables,
  ListOrgInvitationsQuery,
  ListOrgMembersQuery,
  ListSpaceInvitationsQuery,
  ListSpaceMembersQuery,
  ListSpacesQuery,
  MyOrganizationQuery,
  RemoveOrgMemberMutation,
  RemoveOrgMemberMutationVariables,
  RemoveSpaceMemberMutation,
  RemoveSpaceMemberMutationVariables,
  SetSpaceRegistryMutation,
  SetSpaceRegistryMutationVariables,
  SpaceKeyExistsQuery,
  TransferOrganizationOwnershipMutation,
  TransferOrganizationOwnershipMutationVariables,
  UpdateOrgMemberRoleMutation,
  UpdateOrgMemberRoleMutationVariables,
  UpdateSpaceMemberRoleMutation,
  UpdateSpaceMemberRoleMutationVariables,
  UpdateSpaceMutation,
  UpdateSpaceMutationVariables,
} from '@/generated/graphql'
import { getSdk } from '@/generated/graphql-request'
import { getGraphQLClient } from '@/lib/graphql-client'

export type SpaceItem = ListSpacesQuery['spaces'][number]

const spaceQueryCache = new Map<string, Promise<GetSpaceQuery['space']>>()

const setCachedSpace = (key: string, space: GetSpaceQuery['space']) => {
  if (!space) {
    spaceQueryCache.delete(key)
    return
  }

  spaceQueryCache.set(key, Promise.resolve(space))
}

const invalidateCachedSpace = (key?: string | null) => {
  if (!key) {
    return
  }

  spaceQueryCache.delete(key)
}

export async function listSpaces(): Promise<ListSpacesQuery['spaces']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.ListSpaces()
  return result.spaces
}

export async function getMyOrganization(): Promise<MyOrganizationQuery['myOrganization']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.MyOrganization()
  return result.myOrganization
}

export async function getUsageSummary(): Promise<GetUsageSummaryQuery['usageSummary']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.GetUsageSummary()
  return result.usageSummary
}

export async function createCheckoutSession(
  variables: CreateCheckoutSessionMutationVariables,
): Promise<CreateCheckoutSessionMutation['createCheckoutSession']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.CreateCheckoutSession(variables)
  return result.createCheckoutSession
}

export async function createBillingPortalSession(
  variables: CreateBillingPortalSessionMutationVariables,
): Promise<CreateBillingPortalSessionMutation['createBillingPortalSession']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.CreateBillingPortalSession(variables)
  return result.createBillingPortalSession
}

export async function createSpace(
  variables: CreateSpaceMutationVariables,
): Promise<CreateSpaceMutation['createSpace']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.CreateSpace(variables)
  invalidateCachedSpace(result.createSpace.key)
  return result.createSpace
}

export async function updateSpace(
  variables: UpdateSpaceMutationVariables,
): Promise<UpdateSpaceMutation['updateSpace']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.UpdateSpace(variables)
  invalidateCachedSpace(variables.key)
  invalidateCachedSpace(result.updateSpace.key)
  return result.updateSpace
}

export async function getSpace(key: string): Promise<GetSpaceQuery['space']> {
  const cachedSpace = spaceQueryCache.get(key)
  if (cachedSpace) {
    return cachedSpace
  }

  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const request = sdk
    .GetSpace({ key })
    .then((result) => {
      if (!result.space) {
        spaceQueryCache.delete(key)
        return result.space
      }

      setCachedSpace(key, result.space)
      if (result.space.key !== key) {
        setCachedSpace(result.space.key, result.space)
      }

      return result.space
    })
    .catch((error) => {
      spaceQueryCache.delete(key)
      throw error
    })

  spaceQueryCache.set(key, request)
  return request
}

export async function deleteSpace(
  variables: DeleteSpaceMutationVariables,
): Promise<DeleteSpaceMutation['deleteSpace']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.DeleteSpace(variables)
  invalidateCachedSpace(variables.key)
  return result.deleteSpace
}

export async function deleteOrganization(): Promise<
  DeleteOrganizationMutation['deleteOrganization']
> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.DeleteOrganization()
  return result.deleteOrganization
}

export async function getSpaceRegistry(
  spaceID: string,
  keys?: string[],
): Promise<GetSpaceRegistryQuery['spaceRegistry']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.GetSpaceRegistry({ spaceID, keys })
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
  spaceID: string,
  values: Record<string, string>,
): Promise<void> {
  const entries = Object.entries(values).map(([key, value]) => ({
    key,
    value,
    isEncrypted: false,
  }))
  if (entries.length === 0) return
  await setSpaceRegistry({ spaceID, entries })
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
export type OrgInvitationItem = ListOrgInvitationsQuery['orgInvitations'][number]
export type SpaceMemberItem = ListSpaceMembersQuery['spaceMembers'][number]
export type SpaceInvitationItem = ListSpaceInvitationsQuery['spaceInvitations'][number]
export type OrgInviteResultItem = InviteOrgMemberMutation['inviteOrgMember']
export type SpaceInviteResultItem = InviteSpaceMemberMutation['inviteSpaceMember']

export async function listOrgMembers(): Promise<ListOrgMembersQuery['orgMembers']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.ListOrgMembers()
  return result.orgMembers
}

export async function listOrgInvitations(): Promise<ListOrgInvitationsQuery['orgInvitations']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.ListOrgInvitations()
  return result.orgInvitations
}

export async function addOrgMember(
  variables: AddOrgMemberMutationVariables,
): Promise<AddOrgMemberMutation['addOrgMember']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.AddOrgMember(variables)
  return result.addOrgMember
}

export async function addOrgMemberByEmail(
  variables: AddOrgMemberByEmailMutationVariables,
): Promise<AddOrgMemberByEmailMutation['addOrgMemberByEmail']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.AddOrgMemberByEmail(variables)
  return result.addOrgMemberByEmail
}

export async function inviteOrgMember(
  variables: InviteOrgMemberMutationVariables,
): Promise<InviteOrgMemberMutation['inviteOrgMember']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.InviteOrgMember(variables)
  return result.inviteOrgMember
}

export async function cancelOrgInvitation(
  variables: CancelOrgInvitationMutationVariables,
): Promise<CancelOrgInvitationMutation['cancelOrgInvitation']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.CancelOrgInvitation(variables)
  return result.cancelOrgInvitation
}

export async function listSpaceMembers(
  spaceID: string,
): Promise<ListSpaceMembersQuery['spaceMembers']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.ListSpaceMembers({ spaceID })
  return result.spaceMembers
}

export async function listSpaceInvitations(
  spaceID: string,
): Promise<ListSpaceInvitationsQuery['spaceInvitations']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.ListSpaceInvitations({ spaceID })
  return result.spaceInvitations
}

export async function addSpaceMember(
  variables: AddSpaceMemberMutationVariables,
): Promise<AddSpaceMemberMutation['addSpaceMember']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.AddSpaceMember(variables)
  return result.addSpaceMember
}

export async function inviteSpaceMember(
  variables: InviteSpaceMemberMutationVariables,
): Promise<InviteSpaceMemberMutation['inviteSpaceMember']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.InviteSpaceMember(variables)
  return result.inviteSpaceMember
}

export async function removeOrgMember(
  variables: RemoveOrgMemberMutationVariables,
): Promise<RemoveOrgMemberMutation['removeOrgMember']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.RemoveOrgMember(variables)
  return result.removeOrgMember
}

export async function leaveOrganization(): Promise<LeaveOrganizationMutation['leaveOrganization']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.LeaveOrganization()
  return result.leaveOrganization
}

export async function removeSpaceMember(
  variables: RemoveSpaceMemberMutationVariables,
): Promise<RemoveSpaceMemberMutation['removeSpaceMember']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.RemoveSpaceMember(variables)
  return result.removeSpaceMember
}

export async function leaveSpace(
  variables: LeaveSpaceMutationVariables,
): Promise<LeaveSpaceMutation['leaveSpace']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.LeaveSpace(variables)
  return result.leaveSpace
}

export async function updateOrgMemberRole(
  variables: UpdateOrgMemberRoleMutationVariables,
): Promise<UpdateOrgMemberRoleMutation['updateOrgMemberRole']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.UpdateOrgMemberRole(variables)
  return result.updateOrgMemberRole
}

export async function transferOrganizationOwnership(
  variables: TransferOrganizationOwnershipMutationVariables,
): Promise<TransferOrganizationOwnershipMutation['transferOrganizationOwnership']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.TransferOrganizationOwnership(variables)
  return result.transferOrganizationOwnership
}

export async function updateSpaceMemberRole(
  variables: UpdateSpaceMemberRoleMutationVariables,
): Promise<UpdateSpaceMemberRoleMutation['updateSpaceMemberRole']> {
  const client = getGraphQLClient()
  const sdk = getSdk(client)
  const result = await sdk.UpdateSpaceMemberRole(variables)
  return result.updateSpaceMemberRole
}
