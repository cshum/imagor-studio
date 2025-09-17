import { redirect } from '@tanstack/react-router'

import { authStore } from '@/stores/auth-store'

/**
 * Helper function to create login redirect with current location
 */
const createLoginRedirect = (currentLocation: string) => {
  if (currentLocation && currentLocation !== '/') {
    return redirect({
      to: '/login',
      search: { redirect: currentLocation },
    })
  } else {
    return redirect({ to: '/login' })
  }
}

/**
 * Base authentication check - ensures user is authenticated
 * Redirects to login if unauthenticated, or admin-setup if first run
 */
export const requireAuth = async (context?: {
  location?: { pathname: string; search: Record<string, unknown> }
}) => {
  const currentAuth = await authStore.waitFor((state) => state.state !== 'loading')

  if (currentAuth.state === 'unauthenticated') {
    if (!currentAuth.isFirstRun) {
      // Capture current location for redirect after login
      const currentLocation = context?.location
        ? context.location.pathname
        : window.location.pathname

      throw createLoginRedirect(currentLocation)
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
export const requireAccountAuth = async (context?: {
  location?: { pathname: string; search: Record<string, unknown> }
}) => {
  const currentAuth = await authStore.waitFor((state) => state.state !== 'loading')

  if (currentAuth.state !== 'authenticated') {
    if (!currentAuth.isFirstRun) {
      // Capture current location for redirect after login
      const currentLocation = context?.location
        ? context.location.pathname
        : window.location.pathname

      throw createLoginRedirect(currentLocation)
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
export const requireAdminAccountAuth = async (context?: {
  location?: { pathname: string; search: Record<string, unknown> }
}) => {
  // First ensure user is authenticated
  await requireAccountAuth(context)

  const auth = authStore.getState()
  if (auth.profile?.role !== 'admin') {
    throw redirect({ to: '/account/profile' })
  }
  return auth
}
