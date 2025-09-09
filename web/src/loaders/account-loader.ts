import { getSystemRegistryObject, listSystemRegistry } from '@/api/registry-api'
import { getStorageStatus } from '@/api/storage-api'
import { listUsers } from '@/api/user-api'
import type {
  ListSystemRegistryQuery,
  ListUsersQuery,
  StorageStatusQuery,
} from '@/generated/graphql'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { getAuth } from '@/stores/auth-store'

export interface ProfileLoaderData {
  profile: {
    displayName: string
    email: string
  } | null
  breadcrumb: BreadcrumbItem
}

export interface AdminLoaderData {
  registry: Record<string, string>
  systemRegistryList: ListSystemRegistryQuery['listSystemRegistry']
  storageStatus: StorageStatusQuery['storageStatus']
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
          email: auth.profile.email || '',
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

  return {
    registry,
    systemRegistryList,
    storageStatus,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.admin',
    },
  }
}

/**
 * Load users data for the users management page
 */
export const usersLoader = async (): Promise<UsersLoaderData> => {
  const users = await listUsers()
  return {
    users,
    breadcrumb: {
      translationKey: 'navigation.breadcrumbs.users',
    },
  }
}
