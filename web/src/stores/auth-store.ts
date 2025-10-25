import { checkFirstRun, embeddedGuestLogin, guestLogin } from '@/api/auth-api'
import { getCurrentUser } from '@/api/user-api.ts'
import type { MeQuery } from '@/generated/graphql'
import { createStore } from '@/lib/create-store.ts'
import { getToken, removeToken, setToken } from '@/lib/token'

// Check if we're in embedded mode
const isEmbeddedMode = import.meta.env.VITE_EMBEDDED_MODE === 'true'

export type UserProfile = MeQuery['me']

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'guest'

export interface Auth {
  state: AuthState
  accessToken: string | null
  profile: UserProfile | null
  isFirstRun: boolean | null
  error: string | null
  isEmbedded: boolean
  pathPrefix: string
}

const initialState: Auth = {
  state: 'loading',
  accessToken: null,
  profile: null,
  isFirstRun: null,
  error: null,
  isEmbedded: false,
  pathPrefix: '',
}

export type AuthAction =
  | {
      type: 'INIT'
      payload: {
        accessToken: string
        profile: UserProfile
        isEmbedded?: boolean
        pathPrefix?: string
      }
    }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: { error: string } }
  | { type: 'SET_FIRST_RUN'; payload: { isFirstRun: boolean } }
  | { type: 'CLEAR_ERROR' }

function reducer(state: Auth, action: AuthAction): Auth {
  switch (action.type) {
    case 'INIT': {
      const { profile, accessToken, isEmbedded = false, pathPrefix = '' } = action.payload
      const authState = profile?.role === 'guest' ? 'guest' : 'authenticated'

      // Only persist to localStorage if not embedded (stateless)
      if (!isEmbedded) {
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
      }
    }

    case 'LOGOUT':
      removeToken()
      return {
        ...state,
        state: 'unauthenticated',
        accessToken: null,
        profile: null,
        error: null,
        pathPrefix: '',
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
export const initAuth = async (accessToken?: string): Promise<Auth> => {
  // In embedded mode, handle embedded token from URL
  if (isEmbeddedMode) {
    return await initEmbeddedAuth()
  }

  // Continue with normal auth flow
  try {
    const currentAccessToken = accessToken || getToken()

    if (currentAccessToken) {
      const profile = await getCurrentUser(currentAccessToken)
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
        payload: { isFirstRun },
      })
    } catch {
      // Ignore first run check failures
    }

    // If not first run and no token, try guest login
    if (!isFirstRun) {
      try {
        const guestResponse = await guestLogin()
        const profile = await getCurrentUser(guestResponse.token)
        return authStore.dispatch({
          type: 'INIT',
          payload: { accessToken: guestResponse.token, profile },
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
        removeToken()
        authStore.dispatch({
          type: 'SET_FIRST_RUN',
          payload: { isFirstRun: true },
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
    throw new Error(
      'Missing authentication token. Embedded mode requires a JWT token in the URL. Expected format: /?token=YOUR_JWT_TOKEN&path=image.jpg',
    )
  }

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
    },
  })
}

export const useAuthEffect = authStore.useStoreEffect

export const useAuth = () => {
  const authState = authStore.useStore()
  return {
    authState,
    initAuth,
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
