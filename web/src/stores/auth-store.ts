import { checkFirstRun, guestLogin } from '@/api/auth-api'
import { getCurrentUser } from '@/api/user-api.ts'
import type { MeQuery } from '@/generated/graphql'
import { createStore } from '@/lib/create-store.ts'
import { getToken, removeToken, setToken } from '@/lib/token'

export type UserProfile = MeQuery['me']

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'guest'

export interface Auth {
  state: AuthState
  accessToken: string | null
  profile: UserProfile | null
  isFirstRun: boolean | null
  error: string | null
}

const initialState: Auth = {
  state: 'loading',
  accessToken: getToken(),
  profile: null,
  isFirstRun: null,
  error: null,
}

export type AuthAction =
  | { type: 'INIT'; payload: { accessToken: string; profile: UserProfile } }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: { error: string } }
  | { type: 'SET_FIRST_RUN'; payload: { isFirstRun: boolean } }
  | { type: 'CLEAR_ERROR' }

function reducer(state: Auth, action: AuthAction): Auth {
  switch (action.type) {
    case 'INIT': {
      const { profile, accessToken } = action.payload
      const authState = profile?.role === 'guest' ? 'guest' : 'authenticated'

      setToken(accessToken)

      return {
        ...state,
        state: authState,
        accessToken,
        profile,
        error: null,
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
 * Initialize auth state from existing token or provided token
 */
export const initAuth = async (accessToken?: string): Promise<Auth> => {
  try {
    const currentAccessToken = accessToken || getAuth().accessToken

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
