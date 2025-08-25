import { checkFirstRun } from '@/api/auth-api'
import { getCurrentUser } from '@/api/user-api'
import type { MeQuery } from '@/generated/graphql'
import { createStore } from '@/lib/create-store.ts'
import { getToken, removeToken, setToken } from '@/lib/token'

type UserProfile = MeQuery['me']

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'guest'

interface Auth {
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

const authStore = createStore(initialState, reducer)

/**
 * Initialize auth state from existing token or provided token
 */
const initAuth = async (accessToken?: string): Promise<Auth> => {
  try {
    const currentAccessToken = accessToken || getAuth().accessToken

    if (currentAccessToken) {
      const profile = await getCurrentUser()
      return authStore.dispatch({
        type: 'INIT',
        payload: { accessToken: currentAccessToken, profile },
      })
    }

    // Check if this is first run when no token
    try {
      const firstRunResponse = await checkFirstRun()
      authStore.dispatch({
        type: 'SET_FIRST_RUN',
        payload: { isFirstRun: firstRunResponse.isFirstRun },
      })
    } catch {
      // Ignore first run check failures
    }

    return authStore.dispatch({ type: 'LOGOUT' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    authStore.dispatch({ type: 'SET_ERROR', payload: { error: errorMessage } })
    return authStore.dispatch({ type: 'LOGOUT' })
  }
}

/**
 * Logout user
 */
const logout = async (): Promise<Auth> => {
  return authStore.dispatch({ type: 'LOGOUT' })
}

/**
 * Get current auth state
 */
const getAuth = (): Auth => {
  return authStore.getState()
}

/**
 * Clear auth error
 */
const clearAuthError = (): Auth => {
  return authStore.dispatch({ type: 'CLEAR_ERROR' })
}

const useAuthEffect = authStore.useStoreEffect

const useAuth = () => {
  const authState = authStore.useStore()
  return {
    authState,
    initAuth,
    logout,
    clearAuthError,
  }
}

export { initAuth, logout, getAuth, clearAuthError, useAuth, useAuthEffect }

export type { Auth, UserProfile }
