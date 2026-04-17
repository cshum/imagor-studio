import { Loader2 } from 'lucide-react'

/**
 * Rendered only in error cases — the loader throws a redirect on success.
 * Reads ?error= and ?token= directly from the URL (no loaderData needed).
 */
export function AuthCallbackPage() {
  const params = new URLSearchParams(window.location.search)
  const errorParam = params.get('error')

  const error = errorParam
    ? 'Authentication failed: ' + errorParam.replace(/_/g, ' ')
    : !params.get('token')
      ? 'Authentication failed: no token received.'
      : null

  if (error) {
    return (
      <div className='min-h-screen-safe flex flex-col items-center justify-center gap-4'>
        <p className='text-destructive text-sm'>{error}</p>
        <a href='/login' className='text-primary text-sm underline'>
          Back to login
        </a>
      </div>
    )
  }

  // Briefly visible while initAuth completes (e.g. slow network).
  return (
    <div className='min-h-screen-safe flex flex-col items-center justify-center gap-4'>
      <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
      <p className='text-muted-foreground text-sm'>Signing you in…</p>
    </div>
  )
}
