import { redirect } from '@tanstack/react-router'

import { getAuth } from '@/stores/auth-store'

/**
 * TanStack Router loader for /auth/callback.
 *
 * By the time this runs, rootBeforeLoad has already awaited initAuth(),
 * which picked up the ?token= and authenticated the user.
 * Just throw the SPA redirect — the component handles ?error= display.
 */
export function authCallbackLoader(): void {
  const auth = getAuth()
  if (auth.state === 'authenticated') {
    throw redirect({ to: auth.multiTenant ? '/account/spaces' : '/' })
  }
}
