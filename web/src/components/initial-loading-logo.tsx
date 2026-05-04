import { useEffect, useState } from 'react'

import { appRouter } from '@/router.tsx'

const routesWithoutInitialLoadingLogo = new Set(['/login', '/register', '/terms', '/privacy'])

let hasCompletedInitialRoute = false

const markInitialRouteComplete = () => {
  hasCompletedInitialRoute = true
}

const hasResolvedInitialRoute = () => {
  return (
    !appRouter.state.isLoading &&
    (appRouter.state.pendingMatches?.length ?? 0) === 0 &&
    appRouter.state.matches.length > 0
  )
}

const shouldShowInitialLoadingLogo = () => {
  if (typeof window === 'undefined') {
    return false
  }

  return !routesWithoutInitialLoadingLogo.has(window.location.pathname)
}

const useInitialLoadingLogoVisibility = () => {
  const [isVisible, setIsVisible] = useState(() => {
    return !(
      typeof window === 'undefined' ||
      hasCompletedInitialRoute ||
      !shouldShowInitialLoadingLogo()
    )
  })

  useEffect(() => {
    if (!shouldShowInitialLoadingLogo()) {
      setIsVisible(false)
      return
    }

    if (hasCompletedInitialRoute) {
      setIsVisible(false)
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    if (hasResolvedInitialRoute()) {
      markInitialRouteComplete()
      setIsVisible(false)
      return
    }

    const unsubscribe = appRouter.subscribe('onResolved', () => {
      markInitialRouteComplete()
      setIsVisible(false)
      unsubscribe()
    })

    return unsubscribe
  }, [])

  return isVisible
}

export function InitialLoadingLogo() {
  const isVisible = useInitialLoadingLogoVisibility()

  if (!isVisible) {
    return null
  }

  return (
    <div className='boot-shell'>
      <div aria-label='Loading Imagor Studio' className='boot-splash' role='status'>
        <svg
          aria-hidden='true'
          className='boot-logo'
          fill='none'
          viewBox='0 0 512 512'
          xmlns='http://www.w3.org/2000/svg'
        >
          <g stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='16'>
            <path
              className='boot-spinner'
              d='M168 96H344C383.765 96 416 128.235 416 168V344C416 383.765 383.765 416 344 416H168C128.235 416 96 383.765 96 344V168C96 128.235 128.235 96 168 96Z'
              pathLength='100'
            />
            <path d='M187 325L325 187' />
          </g>
        </svg>
      </div>
    </div>
  )
}
