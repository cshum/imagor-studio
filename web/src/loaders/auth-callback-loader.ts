import { setToken } from '@/lib/token'

export interface AuthCallbackLoaderResult {
  error?: string
}

/**
 * TanStack Router loader for the OAuth /auth/callback route.
 *
 * Reads `?token=` and `?error=` from the URL search string and does one of:
 *   1. Success  → persists the token to localStorage, then replaces the
 *                 current history entry with "/" via a full-page reload.
 *                 A hard reload (not a SPA navigation) is used to avoid a
 *                 race condition: the module-level initAuth() in router.tsx
 *                 already started with no token.  If we did a SPA redirect
 *                 after calling initAuth(token), the no-token initAuth() could
 *                 later dispatch LOGOUT and overwrite our freshly set session.
 *                 Reloading from "/" lets the single initAuth() call pick up
 *                 the stored token cleanly.
 *   2. Error    → returns { error } so the component can render an error state.
 *   3. No token → returns { error } with a generic message.
 */
export function authCallbackLoader(searchStr: string): AuthCallbackLoaderResult {
  const params = new URLSearchParams(searchStr)
  const errorParam = params.get('error')
  const token = params.get('token')

  if (errorParam) {
    return { error: 'Authentication failed: ' + errorParam.replace(/_/g, ' ') }
  }

  if (!token) {
    return { error: 'Authentication failed: no token received.' }
  }

  // Store the token then immediately leave this route via a full-page reload.
  // The loader return value below is never reached because the browser navigates
  // away, but it satisfies TypeScript's return-type requirement.
  setToken(token)
  window.location.replace('/')
  return {}
}
