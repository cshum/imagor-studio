import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { initAuth } from '@/stores/auth-store'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      setError('Authentication failed: no token received.')
      return
    }

    initAuth(token)
      .then(() => {
        navigate({ to: '/account/spaces', replace: true })
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Authentication failed.')
      })
  }, [navigate])

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
