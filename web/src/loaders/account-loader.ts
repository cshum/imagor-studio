import { getCurrentUser } from '@/api/user-api'
import { getSystemRegistry } from '@/api/registry-api'
import { getAuth } from '@/stores/auth-store'

export interface ProfileLoaderData {
  profile: {
    displayName: string
    email: string
  } | null
}

export interface AdminLoaderData {
  guestModeEnabled: boolean
}

/**
 * Load profile data for the profile page
 */
export const profileLoader = async (): Promise<ProfileLoaderData> => {
  try {
    // Try to get fresh profile data from API
    const auth = getAuth()
    if (auth.accessToken) {
      const profile = await getCurrentUser(auth.accessToken)
      if (profile) {
        return {
          profile: {
            displayName: profile.displayName || '',
            email: profile.email || '',
          },
        }
      }
    }
    
    // Fallback to auth state if no token or profile
    return {
      profile: auth.profile ? {
        displayName: auth.profile.displayName || '',
        email: auth.profile.email || '',
      } : null,
    }
  } catch (error) {
    console.warn('Failed to load profile data:', error)
    
    // Fallback to auth state on error
    const auth = getAuth()
    return {
      profile: auth.profile ? {
        displayName: auth.profile.displayName || '',
        email: auth.profile.email || '',
      } : null,
    }
  }
}

/**
 * Load admin settings for the admin page
 */
export const adminLoader = async (): Promise<AdminLoaderData> => {
  try {
    // Fetch system registry settings
    const guestModeRegistry = await getSystemRegistry('auth.enableGuestMode')
    
    return {
      guestModeEnabled: guestModeRegistry?.value === 'true',
    }
  } catch (error) {
    console.warn('Failed to load admin settings:', error)
    
    // Default to false if we can't load the setting
    return {
      guestModeEnabled: false,
    }
  }
}
