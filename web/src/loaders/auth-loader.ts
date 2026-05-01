import { redirect } from '@tanstack/react-router'

import { getMyOrganization } from '@/api/org-api'
import type { MyOrganizationQuery } from '@/generated/graphql'
import { appendSearchParams } from '@/lib/route-search'
import { authStore } from '@/stores/auth-store'

const isEmbeddedMode = import.meta.env.VITE_EMBEDDED_MODE === 'true'
export const WORKSPACE_REQUIRED_PATH = '/account/workspace-required'

type AuthRouteLocation = {
  pathname: string
  search: Record<string, unknown>
}

type OrganizationAuthContext = {
  location?: AuthRouteLocation
  organization?: MyOrganizationQuery['myOrganization']
}

const waitForResolvedAuth = () => authStore.waitFor((state) => state.state !== 'loading')

/**
 * Helper function to create login redirect with current location
 * In embedded mode, throws an error instead of redirecting
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
export const requireAuth = async (context?: { location?: AuthRouteLocation }) => {
  const currentAuth = await waitForResolvedAuth()

  if (currentAuth.state === 'unauthenticated') {
    // If embedded mode and there's an error, throw it
    if (isEmbeddedMode && currentAuth.error) {
      throw new Error(currentAuth.error)
    }

    if (!currentAuth.isFirstRun) {
      // Capture current location for redirect after login
      const currentLocation = context?.location
        ? appendSearchParams(context.location.pathname, context.location.search)
        : `${window.location.pathname}${window.location.search}`

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
export const requireAccountAuth = async (context?: { location?: AuthRouteLocation }) => {
  const currentAuth = await waitForResolvedAuth()

  if (currentAuth.state !== 'authenticated') {
    if (!currentAuth.isFirstRun) {
      // Capture current location for redirect after login
      const currentLocation = context?.location
        ? appendSearchParams(context.location.pathname, context.location.search)
        : `${window.location.pathname}${window.location.search}`

      throw createLoginRedirect(currentLocation)
    } else {
      throw redirect({ to: '/admin-setup' })
    }
  }

  return currentAuth
}

const ensureOrganization = async (organization?: MyOrganizationQuery['myOrganization']) => {
  const nextOrganization = organization === undefined ? await getMyOrganization() : organization
  if (!nextOrganization) {
    throw redirect({ to: WORKSPACE_REQUIRED_PATH })
  }
  return nextOrganization
}

const isOrganizationAdminRole = (role?: string | null) => role === 'owner' || role === 'admin'

/**
 * Authentication check for multi-tenant account pages that require an active organization.
 */
export const requireOrganizationAccountAuth = async (context?: OrganizationAuthContext) => {
  const auth = await requireAccountAuth(context)
  if (auth.multiTenant) {
    await ensureOrganization(context?.organization)
  }
  return auth
}

/**
 * Admin account auth plus organization requirement for multi-tenant routes.
 */
export const requireOrganizationAdminAccountAuth = async (context?: OrganizationAuthContext) => {
  const auth = await requireAccountAuth(context)
  if (!auth.multiTenant) {
    return requireAdminAccountAuth(context)
  }

  const nextOrganization = await ensureOrganization(context?.organization)
  if (!isOrganizationAdminRole(nextOrganization.currentUserRole)) {
    throw redirect({ to: '/account/organization/members' })
  }

  return auth
}

/**
 * Lets the workspace-required route redirect back into the app once an organization exists.
 */
export const redirectAuthenticatedUsersWithOrganization = async (context?: {
  location?: AuthRouteLocation
}) => {
  const auth = await requireAccountAuth(context)
  if (!auth.multiTenant) {
    throw redirect({ to: '/' })
  }

  const organization = await getMyOrganization()
  if (!organization) {
    return auth
  }

  throw redirect({ to: '/' })
}

/**
 * Authentication check for image editor - allows embedded guests or delegates to requireAccountAuth
 */
export const requireImageEditorAuth = async (context?: { location?: AuthRouteLocation }) => {
  const currentAuth = await waitForResolvedAuth()

  // Handle embedded mode
  if (currentAuth.isEmbedded) {
    // If embedded auth failed, throw the error instead of redirecting
    if (currentAuth.state === 'unauthenticated' && currentAuth.error) {
      throw new Error(currentAuth.error)
    }
    // Allow successful embedded guests to access image editor directly
    return currentAuth
  }

  // For non-embedded users, use the existing account auth logic
  return requireAccountAuth(context)
}

/**
 * Image editor auth check for self-hosted-only root editor routes.
 * Multi-tenant users must use the space-scoped editor routes instead.
 */
export const requireSelfHostedImageEditorAuth = async (context?: {
  location?: AuthRouteLocation
}) => {
  const auth = await requireImageEditorAuth(context)
  if (auth.multiTenant) {
    throw redirect({ to: '/' })
  }
  return auth
}

/**
 * Combined auth and admin check for admin routes
 * First ensures authentication, then checks admin role
 */
export const requireAdminAccountAuth = async (context?: { location?: AuthRouteLocation }) => {
  // First ensure user is authenticated
  await requireAccountAuth(context)

  const auth = authStore.getState()
  if (auth.profile?.role !== 'admin') {
    throw redirect({ to: '/account/profile' })
  }
  return auth
}

/**
 * Admin-only auth check for self-hosted account routes.
 * Multi-tenant users are redirected back to the profile page because these pages
 * are product-scoped to the self-hosted admin surface.
 */
export const requireSelfHostedAdminAccountAuth = async (context?: {
  location?: AuthRouteLocation
}) => {
  const auth = await requireAdminAccountAuth(context)
  if (auth.multiTenant) {
    throw redirect({ to: '/account/profile' })
  }
  return auth
}
