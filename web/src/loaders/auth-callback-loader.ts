import { redirect } from '@tanstack/react-router'
import { getAuth } from '@/stores/auth-store'

export interface AuthCallbackLoaderResult {
  error?: string
}

/**
 * TanStack Router loader for the OAuth /auth/callback route.
 *
 * By the time this loader runs, rootBeforeLoad has already awaited
 * initAuth(), which detected the ?token= in the URL and authenticated
 * the user.  We just read the already-settled auth state and redirect.
 *
 *   1. Success  → throw redirect to /account/spaces (SaaS) or / (self-hosted)
 *   2. Error    → return { error } so the component renders an error state
 *   3. No token → return { error } with a generic message
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

  const auth = getAuth()
  if (auth.state === 'authenticated') {
    throw redirect({ to: auth.multiTenant ? '/account/spaces' : '/' })
  }

  return { error: `Authentication failed: ${auth.error ?? 'unknown error'}` }
}
