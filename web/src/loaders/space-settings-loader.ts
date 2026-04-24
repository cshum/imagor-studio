import { getSpaceRegistry, listSpaceInvitations, listSpaceMembers } from '@/api/org-api'
import type { GetSpaceQuery } from '@/generated/graphql'

type SpaceSettingsRouteContext = {
  space: NonNullable<GetSpaceQuery['space']>
}

export interface SpaceRegistryLoaderData {
  [key: string]: string
}

export interface SpaceMembersLoaderData {
  spaceMembers: Awaited<ReturnType<typeof listSpaceMembers>>
  invitations: Awaited<ReturnType<typeof listSpaceInvitations>>
}

const getSpaceRegistryMap = async (spaceID: string): Promise<SpaceRegistryLoaderData> => {
  try {
    const entries = await getSpaceRegistry(spaceID)
    return Object.fromEntries(entries.map((entry) => [entry.key, entry.value]))
  } catch {
    return {}
  }
}

export const spaceGeneralSectionLoader = async ({
  context,
}: {
  context: SpaceSettingsRouteContext
}): Promise<SpaceRegistryLoaderData> => {
  return getSpaceRegistryMap(context.space.id)
}

export const spaceSecuritySectionLoader = async ({
  context,
}: {
  context: SpaceSettingsRouteContext
}): Promise<SpaceRegistryLoaderData> => {
  return getSpaceRegistryMap(context.space.id)
}

export const spaceMembersSectionLoader = async ({
  context,
}: {
  context: SpaceSettingsRouteContext
}): Promise<SpaceMembersLoaderData> => {
  try {
    const [spaceMembers, invitations] = await Promise.all([
      listSpaceMembers(context.space.id),
      listSpaceInvitations(context.space.id),
    ])
    return { spaceMembers, invitations }
  } catch {
    return { spaceMembers: [], invitations: [] }
  }
}
