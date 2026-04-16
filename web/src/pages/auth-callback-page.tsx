import { Loader2 } from 'lucide-react'

import type { AuthCallbackLoaderResult } from '@/loaders/auth-callback-loader'

interface AuthCallbackPageProps {
  loaderData: AuthCallbackLoaderResult
}

export function AuthCallbackPage({ loaderData }: AuthCallbackPageProps) {
  if (loaderData.error) {
    return (
      <div className='min-h-screen-safe flex flex-col items-center justify-center gap-4'>
        <p className='text-destructive text-sm'>{loaderData.error}</p>
        <a href='/login' className='text-primary text-sm underline'>
          Back to login
        </a>
      </div>
    )
  }

  // Renders briefly while window.location.replace('/') finishes navigating.
  return (
    <div className='min-h-screen-safe flex flex-col items-center justify-center gap-4'>
      <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
      <p className='text-muted-foreground text-sm'>Signing you in…</p>
    </div>
  )
}
