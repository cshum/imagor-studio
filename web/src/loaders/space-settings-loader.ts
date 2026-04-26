import { getSpaceRegistry, listSpaceInvitations, listSpaceMembers } from '@/api/org-api'
import type { GetSpaceQuery } from '@/generated/graphql'
import type { BreadcrumbItem } from '@/hooks/use-breadcrumb'

type SpaceSettingsRouteContext = {
  space: NonNullable<GetSpaceQuery['space']>
}

export interface SpaceRegistryLoaderData {
  [key: string]: string
}

interface SpaceRegistrySectionLoaderData {
  registry: SpaceRegistryLoaderData
  breadcrumb: BreadcrumbItem
}

export interface SpaceMembersLoaderData {
  spaceMembers: Awaited<ReturnType<typeof listSpaceMembers>>
  invitations: Awaited<ReturnType<typeof listSpaceInvitations>>
  breadcrumb: BreadcrumbItem
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
}): Promise<SpaceRegistrySectionLoaderData> => {
  return {
    registry: await getSpaceRegistryMap(context.space.id),
    breadcrumb: { translationKey: 'pages.spaceSettings.sections.general' },
  }
}

export const spaceSecuritySectionLoader = async ({
  context,
}: {
  context: SpaceSettingsRouteContext
}): Promise<SpaceRegistrySectionLoaderData> => {
  return {
    registry: await getSpaceRegistryMap(context.space.id),
    breadcrumb: { translationKey: 'pages.spaceSettings.sections.imagor' },
  }
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
    return {
      spaceMembers,
      invitations,
      breadcrumb: { translationKey: 'pages.spaceSettings.sections.members' },
    }
  } catch {
    return {
      spaceMembers: [],
      invitations: [],
      breadcrumb: { translationKey: 'pages.spaceSettings.sections.members' },
    }
  }
}
