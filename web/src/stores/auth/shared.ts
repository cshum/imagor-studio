import type { MeQuery } from '@/types/generated-shared'

export type UserProfile = MeQuery['me']

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'guest'

export interface Auth {
  state: AuthState
  accessToken: string | null
  profile: UserProfile | null
  isFirstRun: boolean | null
  multiTenant: boolean
  error: string | null
  isEmbedded: boolean
  pathPrefix: string
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
  | { type: 'LOGOUT_WITH_ERROR'; payload: { error: string } }
  | { type: 'SET_ERROR'; payload: { error: string } }
  | { type: 'SET_FIRST_RUN'; payload: { isFirstRun: boolean; multiTenant?: boolean } }
  | { type: 'CLEAR_ERROR' }

export const initialAuthState: Auth = {
  state: 'loading',
  accessToken: null,
  profile: null,
  isFirstRun: null,
  multiTenant: false,
  error: null,
  isEmbedded: false,
  pathPrefix: '',
}
