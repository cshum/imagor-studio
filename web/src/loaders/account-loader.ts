import { getImagorStatus } from '@/api/imagor-api'
import { getLicenseStatus, type LicenseStatus } from '@/api/license-api'
import { getMyOrganization, getSpace, listSpaces } from '@/api/org-api'
import { getSystemRegistryObject, listSystemRegistry } from '@/api/registry-api'
import { getStorageStatus } from '@/api/storage-api'
import { listUsers } from '@/api/user-api'
import type {
  GetSpaceQuery,
  ImagorStatusQuery,
  ListSpacesQuery,
  ListSystemRegistryQuery,
  ListUsersQuery,
  StorageStatusQuery,
} from '@/generated/graphql'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { getAuth } from '@/stores/auth-store'

export interface ProfileLoaderData {
  profile: {
    displayName: string
    username: string
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
        }
      : null,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.profile',
    },
  }
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
  const [registry, systemRegistryList] = await Promise.all([
    getSystemRegistryObject(),
    listSystemRegistry(),
  ])
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

export interface SpacesLoaderData {
  spaces: ListSpacesQuery['spaces']
  currentOrganizationId: string | null
  breadcrumb: BreadcrumbItem
}

/**
 * Load spaces data for the spaces management page
 */
export const spacesLoader = async (): Promise<SpacesLoaderData> => {
  const [spaces, organization] = await Promise.all([listSpaces(), getMyOrganization()])
  return {
    spaces,
    currentOrganizationId: organization?.id ?? null,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.spaces',
    },
  }
}

export interface SpaceSettingsLoaderData {
  space: NonNullable<GetSpaceQuery['space']>
  breadcrumb: BreadcrumbItem
}

/**
 * Load a single space for the space settings page
 */
export const spaceSettingsLoader = async ({
  params,
}: {
  params: { spaceKey: string }
}): Promise<SpaceSettingsLoaderData> => {
  const space = await getSpace(params.spaceKey)
  if (!space) {
    throw new Error(`Space "${params.spaceKey}" not found`)
  }
  return {
    space,
    breadcrumb: {
      label: space.name,
    },
  }
}
