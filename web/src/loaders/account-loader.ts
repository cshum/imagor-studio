import { getSystemRegistryObject } from '@/api/registry-api'
import { listUsers } from '@/api/user-api'
import type { ListUsersQuery } from '@/generated/graphql'
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
      label: 'Profile',
    },
  }
}

/**
 * Load admin settings for the admin page
 */
export const adminLoader = async (): Promise<AdminLoaderData> => {
  const registry = await getSystemRegistryObject()
  return {
    registry,
    breadcrumb: {
      label: 'Admin',
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
      label: 'Users',
    },
  }
}
