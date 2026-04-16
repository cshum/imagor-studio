import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { setToken } from '@/lib/token'

export function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    const token = params.get('token')

    if (errorParam) {
      setError('Authentication failed: ' + errorParam.replace(/_/g, ' '))
      return
    }

    if (!token) {
      setError('Authentication failed: no token received.')
      return
    }

    // Store token then do a full-page redirect.
    // This avoids a race condition between the module-level initAuth() call in
    // router.tsx (which runs concurrently on app startup with no token) and
    // calling initAuth(token) here — if the module-level one dispatches LOGOUT
    // after our INIT, the user would get immediately signed out.
    // A hard redirect lets the single module-level initAuth() pick up the token
    // from localStorage cleanly on the next page load.
    setToken(token)
    window.location.replace('/')
  }, [])

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

  return (
    <div className='min-h-screen-safe flex flex-col items-center justify-center gap-4'>
      <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
      <p className='text-muted-foreground text-sm'>Signing you in…</p>
    </div>
  )
}
