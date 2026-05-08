import {
  checkFirstRun,
  embeddedGuestLogin,
  guestLogin,
  publicPreviewSession,
  refreshToken,
} from '@/api/auth-api'
import { getCurrentUser } from '@/api/user-api.ts'
import type { MeQuery } from '@/generated/graphql'
import i18n from '@/i18n'
import { createStore } from '@/lib/create-store.ts'
import { getToken, removeToken, setToken } from '@/lib/token'

const isEmbeddedMode = import.meta.env.VITE_EMBEDDED_MODE === 'true'
const isMultiTenantMode = import.meta.env.VITE_MULTI_TENANT === 'true'

export type UserProfile = MeQuery['me']

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'guest'
export type ExperienceMode = 'public-preview' | null

export interface Auth {
  state: AuthState
  accessToken: string | null
  profile: UserProfile | null
  isFirstRun: boolean | null
  multiTenant: boolean
  error: string | null
  isEmbedded: boolean
  pathPrefix: string
  experienceMode: ExperienceMode
  persistToken: boolean
}

const initialState: Auth = {
  state: 'loading',
  accessToken: null,
  profile: null,
  isFirstRun: null,
  multiTenant: isMultiTenantMode,
  error: null,
  isEmbedded: false,
  pathPrefix: '',
  experienceMode: null,
  persistToken: false,
}

function getRequestedExperienceMode(search: string): ExperienceMode {
  const value = new URLSearchParams(search).get('experience')
  return value === 'public-preview' ? value : null
}

function getPublicSpaceKeyFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/spaces\/([^/]+)/)
  if (!match) {
    return undefined
  }

  const [, encodedSpaceKey] = match
  if (!encodedSpaceKey) {
    return undefined
  }

  try {
    return decodeURIComponent(encodedSpaceKey)
  } catch {
    return encodedSpaceKey
  }
}

function shouldAttemptGuestLogin(pathname: string, multiTenant: boolean): boolean {
  if (getPublicSpaceKeyFromPath(pathname)) {
    return true
  }

  if (multiTenant) {
    return false
  }

  return true
}

function getExperienceModeFromResponse(mode: string | undefined): ExperienceMode {
  return mode === 'public-preview' ? mode : null
}

export type AuthAction =
  | {
      type: 'INIT'
      payload: {
        accessToken: string
        profile: UserProfile
        isEmbedded?: boolean
        pathPrefix?: string
        experienceMode?: ExperienceMode
        persistToken?: boolean
      }
    }
  | { type: 'LOGOUT' }
  | { type: 'LOGOUT_WITH_ERROR'; payload: { error: string } }
  | { type: 'SET_ERROR'; payload: { error: string } }
  | { type: 'SET_FIRST_RUN'; payload: { isFirstRun: boolean; multiTenant?: boolean } }
  | { type: 'CLEAR_ERROR' }

function reducer(state: Auth, action: AuthAction): Auth {
  switch (action.type) {
    case 'INIT': {
      const {
        profile,
        accessToken,
        isEmbedded = false,
        pathPrefix = '',
        experienceMode = null,
        persistToken = true,
      } = action.payload
      const authState = profile?.role === 'guest' ? 'guest' : 'authenticated'

      // Only persist to localStorage if not embedded (stateless)
      if (!isEmbedded && persistToken) {
        setToken(accessToken)
      }

      return {
        ...state,
        state: authState,
        accessToken,
        profile,
        error: null,
        isEmbedded,
        pathPrefix,
        experienceMode,
        persistToken,
      }
    }

    case 'LOGOUT':
      if (!isEmbeddedMode && state.persistToken) {
        removeToken()
      }
      return {
        ...state,
        state: 'unauthenticated',
        accessToken: null,
        profile: null,
        error: null,
        pathPrefix: '',
        experienceMode: null,
        persistToken: false,
      }

    case 'LOGOUT_WITH_ERROR':
      if (!isEmbeddedMode && state.persistToken) {
        removeToken()
      }
      return {
        ...state,
        state: 'unauthenticated',
        accessToken: null,
        profile: null,
        error: action.payload.error,
        pathPrefix: '',
        experienceMode: null,
        persistToken: false,
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload.error,
      }

    case 'SET_FIRST_RUN':
      return {
        ...state,
        isFirstRun: action.payload.isFirstRun,
        multiTenant: isMultiTenantMode || action.payload.multiTenant === true,
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      }

    default:
      return state
  }
}

export const authStore = createStore(initialState, reducer)

/**
 * Initialize auth state - handles both normal and embedded modes
 */
export const initAuth = async (
  accessToken?: string,
  pathname = window.location.pathname,
  search = window.location.search,
): Promise<Auth> => {
  // In embedded mode, handle embedded token from URL
  if (isEmbeddedMode) {
    try {
      return await initEmbeddedAuth()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Embedded authentication failed'
      return authStore.dispatch({
        type: 'LOGOUT_WITH_ERROR',
        payload: { error: errorMessage },
      })
    }
  }

  // Continue with normal auth flow
  try {
    if (!accessToken && getRequestedExperienceMode(search) === 'public-preview') {
      return await initPublicPreviewAuth()
    }

    // Token priority: explicit arg → ?token= on /auth/callback (OAuth) → localStorage
    const currentAccessToken =
      accessToken ||
      (window.location.pathname === '/auth/callback'
        ? new URLSearchParams(window.location.search).get('token')
        : null) ||
      getToken()

    if (currentAccessToken) {
      // Run token validation and first-run check in parallel — zero extra latency.
      // Multi-tenant mode can be forced by env, or discovered
      // from the backend during local/private development against cloud APIs.
      const [profile, firstRunResponse] = await Promise.all([
        getCurrentUser(currentAccessToken),
        checkFirstRun().catch(() => null),
      ])
      if (firstRunResponse) {
        authStore.dispatch({
          type: 'SET_FIRST_RUN',
          payload: {
            isFirstRun: firstRunResponse.isFirstRun,
            multiTenant: firstRunResponse.multiTenant,
          },
        })
      }
      return authStore.dispatch({
        type: 'INIT',
        payload: { accessToken: currentAccessToken, profile },
      })
    }

    // Check if this is first run when no token
    let isFirstRun = false
    try {
      const firstRunResponse = await checkFirstRun()
      isFirstRun = firstRunResponse.isFirstRun
      authStore.dispatch({
        type: 'SET_FIRST_RUN',
        payload: { isFirstRun, multiTenant: firstRunResponse.multiTenant },
      })
    } catch {
      // Ignore first run check failures
    }

    // If not first run and no token, only probe guest auth on routes that can use it.
    if (!isFirstRun && shouldAttemptGuestLogin(pathname, authStore.getState().multiTenant)) {
      try {
        const guestResponse = await guestLogin(getPublicSpaceKeyFromPath(pathname))
        const profile = await getCurrentUser(guestResponse.token)
        const experienceMode = getExperienceModeFromResponse(guestResponse.mode)
        return authStore.dispatch({
          type: 'INIT',
          payload: {
            accessToken: guestResponse.token,
            profile,
            experienceMode,
            persistToken: experienceMode !== 'public-preview',
          },
        })
      } catch {
        // Guest login failed, remain unauthenticated
      }
    }

    return authStore.dispatch({ type: 'LOGOUT' })
  } catch (error) {
    // Token validation failed - check if this is a first run scenario
    // This handles the case where user has an old token but backend is fresh
    try {
      const firstRunResponse = await checkFirstRun()
      if (firstRunResponse.isFirstRun) {
        // Clear invalid token and set first run state
        if (!isEmbeddedMode) {
          removeToken()
        }
        authStore.dispatch({
          type: 'SET_FIRST_RUN',
          payload: { isFirstRun: true, multiTenant: firstRunResponse.multiTenant },
        })
        return authStore.dispatch({ type: 'LOGOUT' })
      }
    } catch {
      // If first run check also fails, proceed with normal error handling
    }
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    authStore.dispatch({ type: 'SET_ERROR', payload: { error: errorMessage } })
    return authStore.dispatch({ type: 'LOGOUT' })
  }
}

/**
 * Logout user
 */
export const logout = async (): Promise<Auth> => {
  return authStore.dispatch({ type: 'LOGOUT' })
}

/**
 * Refresh the current authenticated session token and profile.
 * If refresh fails, the current session is cleared.
 */
export const refreshAuthSession = async (): Promise<Auth> => {
  const currentAuth = authStore.getState()

  if (currentAuth.state !== 'authenticated' || currentAuth.isEmbedded) {
    return currentAuth
  }

  const currentToken = currentAuth.accessToken || getToken()
  if (!currentToken) {
    return authStore.dispatch({ type: 'LOGOUT' })
  }

  try {
    const response = await refreshToken(currentToken)
    const profile = await getCurrentUser(response.token)

    return authStore.dispatch({
      type: 'INIT',
      payload: {
        accessToken: response.token,
        profile,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    authStore.dispatch({ type: 'SET_ERROR', payload: { error: errorMessage } })
    return authStore.dispatch({ type: 'LOGOUT' })
  }
}

/**
 * Get current auth state
 */
export const getAuth = (): Auth => {
  return authStore.getState()
}

/**
 * Clear auth error
 */
export const clearAuthError = (): Auth => {
  return authStore.dispatch({ type: 'CLEAR_ERROR' })
}

/**
 * Initialize embedded auth by parsing JWT token from URL
 */
export const initEmbeddedAuth = async (): Promise<Auth> => {
  // Parse token from current URL
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')

  if (!token) {
    throw new Error(i18n.t('auth.embedded.tokenMissing'))
  }

  try {
    // Call /api/auth/embedded-guest with JWT
    const response = await embeddedGuestLogin(token)

    // Get user profile with session token
    const profile = await getCurrentUser(response.token)

    // Dispatch unified init action with embedded flag and path prefix
    return authStore.dispatch({
      type: 'INIT',
      payload: {
        accessToken: response.token,
        profile,
        isEmbedded: true,
        pathPrefix: response.pathPrefix || '',
        persistToken: false,
      },
    })
  } catch (error) {
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      if (
        errorMessage.includes('invalid') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('unauthorized')
      ) {
        throw new Error(i18n.t('auth.embedded.tokenInvalid'))
      }
    }
    // Generic authentication failure
    throw new Error(i18n.t('auth.embedded.authenticationFailed'))
  }
}

/**
 * Initialize a non-persistent public preview auth session.
 */
export const initPublicPreviewAuth = async (): Promise<Auth> => {
  try {
    const response = await publicPreviewSession()
    const profile = await getCurrentUser(response.token)

    return authStore.dispatch({
      type: 'INIT',
      payload: {
        accessToken: response.token,
        profile,
        experienceMode: 'public-preview',
        persistToken: false,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Public preview authentication failed'
    return authStore.dispatch({
      type: 'LOGOUT_WITH_ERROR',
      payload: { error: errorMessage },
    })
  }
}

export const useAuthEffect = authStore.useStoreEffect

export const useAuth = () => {
  const authState = authStore.useStore()
  return {
    authState,
    initAuth,
    initPublicPreviewAuth,
    refreshAuthSession,
    logout,
    clearAuthError,
  }
}

/**
 * Check if a path is accessible based on the current user's path prefix
 */
export const isPathAccessible = (auth: Auth, requestedPath: string): boolean => {
  // If no path prefix is set, allow all paths (backward compatibility)
  if (!auth.pathPrefix) {
    return true
  }

  // Normalize paths for comparison
  const normalizedRequested = '/' + requestedPath.replace(/^\/+/, '')
  const normalizedPrefix = '/' + auth.pathPrefix.replace(/^\/+/, '').replace(/\/+$/, '')

  // Root prefix allows access to all paths
  if (normalizedPrefix === '/') {
    return true
  }

  // Check if the requested path starts with the allowed prefix
  return normalizedRequested.startsWith(normalizedPrefix)
}
