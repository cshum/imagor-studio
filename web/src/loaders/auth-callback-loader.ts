import { login } from '@/stores/auth-store'

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

  // Persist the token and navigate away via a full-page reload.
  // login() calls setToken() then window.location.replace('/') so the
  // module-level initAuth() restarts cleanly with the token in localStorage.
  // The return value below is never reached but satisfies TypeScript.
  login(token)
  return {}
}
