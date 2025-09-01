import { redirect } from '@tanstack/react-router'
import { authStore } from '@/stores/auth-store'

/**
 * Base authentication check - ensures user is authenticated
 * Redirects to login if unauthenticated, or admin-setup if first run
 */
export const requireAuth = async () => {
  const currentAuth = await authStore.waitFor((state) => state.state !== 'loading')
  
  if (currentAuth.state === 'unauthenticated') {
    if (!currentAuth.isFirstRun) {
      throw redirect({ to: '/login' })
    } else {
      throw redirect({ to: '/admin-setup' })
    }
  }
  
  return currentAuth
}

/**
 * Authentication check for account pages - stricter than base auth
 * Requires full authentication (not guest)
 */
export const requireAccountAuth = async () => {
  const currentAuth = await authStore.waitFor((state) => state.state !== 'loading')
  
  if (currentAuth.state !== 'authenticated') {
    if (!currentAuth.isFirstRun) {
      throw redirect({ to: '/login' })
    } else {
      throw redirect({ to: '/admin-setup' })
    }
  }
  
  return currentAuth
}

/**
 * Combined auth and admin check for admin routes
 * First ensures authentication, then checks admin role
 */
export const requireAdminAccountAuth = async () => {
  // First ensure user is authenticated
  await requireAccountAuth()

  const auth = authStore.getState()
  if (auth.profile?.role !== 'admin') {
    throw redirect({ to: '/account/profile' })
  }
  return auth
}
