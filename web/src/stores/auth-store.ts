import { createStore } from '@/lib/create-store.ts'
import { initializeCloudAuth } from '@/cloud/auth'
import { removeToken, setToken } from '@/lib/token'
import { initializeEmbeddedAuth } from '@/stores/auth/embedded'
import { isEmbeddedMode } from '@/stores/auth/runtime'
import { initializeSelfHostedAuth } from '@/stores/auth/selfhosted'
import { Auth, AuthAction, initialAuthState } from '@/stores/auth/shared'

export type { Auth } from '@/stores/auth/shared'

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
      if (!isEmbeddedMode) {
        removeToken()
      }
      return {
        ...state,
        state: 'unauthenticated',
        accessToken: null,
        profile: null,
        error: null,
        pathPrefix: '',
      }

    case 'LOGOUT_WITH_ERROR':
      if (!isEmbeddedMode) {
        removeToken()
      }
      return {
        ...state,
        state: 'unauthenticated',
        accessToken: null,
        profile: null,
        error: action.payload.error,
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
        multiTenant: action.payload.multiTenant ?? state.multiTenant,
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

export const authStore = createStore(initialAuthState, reducer)

/**
 * Initialize auth state - handles both normal and embedded modes
 */
export const initAuth = async (accessToken?: string): Promise<Auth> => {
  if (isEmbeddedMode) {
    try {
      return await initializeEmbeddedAuth(authStore.dispatch)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Embedded authentication failed'
      return authStore.dispatch({
        type: 'LOGOUT_WITH_ERROR',
        payload: { error: errorMessage },
      })
    }
  }

  const currentState = authStore.getState()
  if (currentState.multiTenant) {
    return initializeCloudAuth(authStore.dispatch, accessToken)
  }

  return initializeSelfHostedAuth(authStore.dispatch, accessToken)
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
