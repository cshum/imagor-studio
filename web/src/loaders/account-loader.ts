import { getImagorStatus } from '@/api/imagor-api'
import { getLicenseStatus, type LicenseStatus } from '@/api/license-api'
import { getSpace, listSpaces } from '@/api/org-api'
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
  breadcrumb: BreadcrumbItem
}

/**
 * Load spaces data for the spaces management page
 */
export const spacesLoader = async (): Promise<SpacesLoaderData> => {
  const spaces = await listSpaces()
  return {
    spaces,
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
