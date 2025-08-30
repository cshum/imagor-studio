import { listUsers } from '@/api/user-api'
import { getSystemRegistryObject } from '@/api/registry-api'
import { getAuth } from '@/stores/auth-store'
import type { ListUsersQuery } from '@/generated/graphql'

export interface ProfileLoaderData {
  profile: {
    displayName: string
    email: string
  } | null
}

export interface AdminLoaderData {
  registry: Record<string, string>
}

export interface UsersLoaderData {
  users: ListUsersQuery['users']
}

/**
 * Load profile data for the profile page
 */
export const profileLoader = async (): Promise<ProfileLoaderData> => {
  const auth = getAuth()
  return {
    profile: auth.profile ? {
      displayName: auth.profile.displayName || '',
      email: auth.profile.email || '',
    } : null,
  }
}

/**
 * Load admin settings for the admin page
 */
export const adminLoader = async (): Promise<AdminLoaderData> => {
  const registry = await getSystemRegistryObject()
  return { registry }
}

/**
 * Load users data for the users management page
 */
export const usersLoader = async (): Promise<UsersLoaderData> => {
    const users = await listUsers()
    return {
      users,
    }
}
