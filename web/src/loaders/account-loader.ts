import { redirect } from '@tanstack/react-router'

import { getImagorStatus } from '@/api/imagor-api'
import { getLicenseStatus, type LicenseStatus } from '@/api/license-api'
import {
  getMyOrganization,
  getUsageSummary,
  listOrgInvitations,
  listOrgMembers,
  listSpaces,
} from '@/api/org-api'
import {
  getSystemRegistryMultiple,
  getSystemRegistryObject,
  listSystemRegistry,
} from '@/api/registry-api'
import { getStorageStatus } from '@/api/storage-api'
import { listUsers } from '@/api/user-api'
import type {
  GetSpaceQuery,
  GetUsageSummaryQuery,
  ImagorStatusQuery,
  ListOrgMembersQuery,
  ListSpacesQuery,
  ListSystemRegistryQuery,
  ListUsersQuery,
  MyOrganizationQuery,
  StorageStatusQuery,
} from '@/generated/graphql'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { resolveSpace } from '@/lib/space'
import { getAuth } from '@/stores/auth-store'

export interface ProfileLoaderData {
  profile: {
    displayName: string
    username: string
    email: string | null
    pendingEmail: string | null
    emailVerified: boolean
    hasPassword: boolean
    avatarUrl: string | null
    authProviders: Array<{ provider: string; email: string | null; linkedAt: string }>
  } | null
  breadcrumb: BreadcrumbItem
}

export interface AdminLoaderData {
  registry: Record<string, string>
  systemRegistryList: ListSystemRegistryQuery['listSystemRegistry']
  storageStatus: StorageStatusQuery['storageStatus']
  imagorStatus: ImagorStatusQuery['imagorStatus']
  licenseStatus: LicenseStatus
  breadcrumb: BreadcrumbItem
}

// Per-section loader data types for admin sub-routes
export interface AdminGeneralLoaderData {
  registry: Record<string, string>
  systemRegistryList: ListSystemRegistryQuery['listSystemRegistry']
  breadcrumb: BreadcrumbItem
}

export interface AdminStorageLoaderData {
  storageStatus: StorageStatusQuery['storageStatus']
  breadcrumb: BreadcrumbItem
}

export interface AdminImagorLoaderData {
  imagorStatus: ImagorStatusQuery['imagorStatus']
  registry: Record<string, string>
  systemRegistryList: ListSystemRegistryQuery['listSystemRegistry']
  breadcrumb: BreadcrumbItem
}

export interface AdminLicenseLoaderData {
  licenseStatus: LicenseStatus
  breadcrumb: BreadcrumbItem
}

export interface UsersLoaderData {
  users: ListUsersQuery['users']
  breadcrumb: BreadcrumbItem
}

export interface BillingLoaderData {
  organization: MyOrganizationQuery['myOrganization']
  usageSummary: GetUsageSummaryQuery['usageSummary']
  breadcrumb: BreadcrumbItem
}

export interface BillingSearch {
  portal_returned?: boolean
}

export interface OrgMembersLoaderData {
  organization: MyOrganizationQuery['myOrganization']
  members: ListOrgMembersQuery['orgMembers']
  invitations: import('@/generated/graphql').ListOrgInvitationsQuery['orgInvitations']
  breadcrumb: BreadcrumbItem
}

interface OrganizationLoaderOptions {
  organization?: MyOrganizationQuery['myOrganization']
}

const ADMIN_GENERAL_REGISTRY_KEYS = [
  'config.app_home_title',
  'config.allow_guest_mode',
  'config.app_default_language',
  'config.app_default_sort_by',
  'config.app_default_sort_order',
  'config.app_show_file_names',
] as const

/**
 * Load profile data for the profile page
 */
export const profileLoader = async (): Promise<ProfileLoaderData> => {
  const auth = getAuth()
  return {
    profile: auth.profile
      ? {
          displayName: auth.profile.displayName || '',
          username: auth.profile.username || '',
          email: auth.profile.email ?? null,
          pendingEmail: auth.profile.pendingEmail ?? null,
          emailVerified: auth.profile.emailVerified ?? false,
          hasPassword: auth.profile.hasPassword ?? false,
          avatarUrl: auth.profile.avatarUrl ?? null,
          authProviders: auth.profile.authProviders ?? [],
        }
      : null,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.account',
    },
  }
}

export const billingValidateSearch = (search: Record<string, unknown>): BillingSearch => {
  const portalReturned =
    search.portal_returned === true ||
    search.portal_returned === 'true' ||
    search.portal_returned === '1'

  return portalReturned ? { portal_returned: true } : {}
}

/**
 * Load admin settings for the admin page
 */
export const adminLoader = async (): Promise<AdminLoaderData> => {
  const registry = await getSystemRegistryObject()

  // Get all system registry entries with override information
  const systemRegistryList = await listSystemRegistry()

  // Get storage status
  const storageStatus = await getStorageStatus()

  // Get imagor status
  const imagorStatus = await getImagorStatus()

  // Get license status
  const licenseStatus = await getLicenseStatus()

  return {
    registry,
    systemRegistryList,
    storageStatus,
    imagorStatus,
    licenseStatus,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.admin',
    },
  }
}

/** Load general settings for the admin general sub-route */
export const adminGeneralLoader = async (): Promise<AdminGeneralLoaderData> => {
  const systemRegistryList = await getSystemRegistryMultiple([...ADMIN_GENERAL_REGISTRY_KEYS])
  const registry = Object.fromEntries(
    systemRegistryList
      .filter((entry) => !entry.isEncrypted)
      .map((entry) => [entry.key, entry.value]),
  )

  return {
    registry,
    systemRegistryList,
    breadcrumb: { translationKey: 'pages.admin.sections.general' },
  }
}

/** Load storage status for the admin storage sub-route */
export const adminStorageLoader = async (): Promise<AdminStorageLoaderData> => {
  return {
    storageStatus: await getStorageStatus(),
    breadcrumb: { translationKey: 'pages.admin.sections.storage' },
  }
}

/** Load imagor status for the admin imagor sub-route */
export const adminImagorLoader = async (): Promise<AdminImagorLoaderData> => {
  return {
    imagorStatus: await getImagorStatus(),
    registry: await getSystemRegistryObject(),
    systemRegistryList: await listSystemRegistry(),
    breadcrumb: { translationKey: 'pages.admin.sections.imagor' },
  }
}

/** Load license status for the admin license sub-route */
export const adminLicenseLoader = async (): Promise<AdminLicenseLoaderData> => {
  return {
    licenseStatus: await getLicenseStatus(),
    breadcrumb: { translationKey: 'pages.admin.sections.license' },
  }
}

/**
 * Load users data for the users management page
 */
export const usersLoader = async ({
  search = '',
}: { search?: string } = {}): Promise<UsersLoaderData> => {
  const users = await listUsers(undefined, undefined, search || undefined)
  return {
    users,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.users',
    },
  }
}

export const billingLoader = async ({
  organization: providedOrganization,
}: OrganizationLoaderOptions = {}): Promise<BillingLoaderData> => {
  const organization =
    providedOrganization === undefined ? await getMyOrganization() : providedOrganization
  const usageSummary = await getUsageSummary()

  return {
    organization,
    usageSummary,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.billing',
    },
  }
}

const isOrganizationAdminRole = (role?: string | null) => role === 'owner' || role === 'admin'

export const orgMembersLoader = async ({
  organization: providedOrganization,
}: OrganizationLoaderOptions = {}): Promise<OrgMembersLoaderData> => {
  const organization =
    providedOrganization === undefined ? await getMyOrganization() : providedOrganization
  const [members, invitations] = await Promise.all([
    listOrgMembers(),
    isOrganizationAdminRole(organization?.currentUserRole)
      ? listOrgInvitations()
      : Promise.resolve([]),
  ])

  return {
    organization,
    members,
    invitations,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.organizationMembers',
    },
  }
}

export interface SpacesLoaderData {
  spaces: ListSpacesQuery['spaces']
  usageSummary: GetUsageSummaryQuery['usageSummary']
  currentOrganizationId: string | null
  currentOrganizationRole: string | null
  currentOrganizationPlan: string | null
  currentOrganizationPlanStatus: string | null
  breadcrumb: BreadcrumbItem
}

/**
 * Load spaces data for the spaces management page
 */
export const spacesLoader = async (): Promise<SpacesLoaderData> => {
  const [spaces, organization, usageSummary] = await Promise.all([
    listSpaces(),
    getMyOrganization(),
    getUsageSummary(),
  ])
  return {
    spaces,
    usageSummary,
    currentOrganizationId: organization?.id ?? null,
    currentOrganizationRole: organization?.currentUserRole ?? null,
    currentOrganizationPlan: organization?.plan ?? null,
    currentOrganizationPlanStatus: organization?.planStatus ?? null,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.spaces',
    },
  }
}

export interface SpaceSettingsRouteContextData {
  space: NonNullable<GetSpaceQuery['space']>
  breadcrumb: BreadcrumbItem
}

/**
 * Resolve the shared space context for the space settings route tree.
 */
export const resolveSpaceSettingsRouteContext = async ({
  params,
}: {
  params: { routeSpaceKey: string }
}): Promise<SpaceSettingsRouteContextData> => {
  const space = await resolveSpace(params.routeSpaceKey)
  if (!space.canManage) {
    throw redirect({ to: '/spaces/$spaceKey', params: { spaceKey: params.routeSpaceKey } })
  }
  return {
    space,
    breadcrumb: {
      label: space.name,
    },
  }
}
