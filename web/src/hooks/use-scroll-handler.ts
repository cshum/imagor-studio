import { useEffect, useRef, useState } from 'react'

import { getPosition, setPosition } from '@/stores/scroll-position-store'

export const useScrollHandler = (
  scrollKey: string, // Unique identifier for this scroll context
  debounceDelay: number = 10,
) => {
  const [scrollPosition, setScrollPosition] = useState<number>(0) // Use state for scroll position
  const [isScrolling, setIsScrolling] = useState<boolean>(false) // Track scrolling state
  const debounceTimeoutRef = useRef<number | null>(null)

  // Store options in ref to avoid stale closures
  const optionsRef = useRef({
    scrollKey,
    debounceDelay,
  })

  useEffect(() => {
    optionsRef.current = {
      scrollKey,
      debounceDelay,
    }
  }, [scrollKey, debounceDelay])

  useEffect(() => {
    const handleScroll = () => {
      const { debounceDelay } = optionsRef.current

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      setIsScrolling(true) // Set scrolling to true when scrolling starts

      const executeScrollHandling = () => {
        const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop
        setScrollPosition(currentScrollPosition)
        setPosition(optionsRef.current.scrollKey, currentScrollPosition)
        setIsScrolling(false)
      }

      if (debounceDelay > 0) {
        // Debounce the scroll handling
        debounceTimeoutRef.current = window.setTimeout(() => {
          executeScrollHandling()
        }, debounceDelay)
      } else {
        // Handle scroll immediately
        executeScrollHandling()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return {
    scrollPosition,
    isScrolling,
  }
}

export const restoreScrollPosition = (scrollKey: string) => {
  const savedPosition = getPosition(scrollKey)
  if (savedPosition > 0) {
    const scrollHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
    )
    const clientHeight = window.innerHeight
    const maxScrollPosition = scrollHeight - clientHeight

    // Only restore if the saved position is valid for current content
    const positionToRestore = Math.min(savedPosition, Math.max(0, maxScrollPosition))

    if (positionToRestore > 0) {
      window.scrollTo({ top: positionToRestore, behavior: 'instant' })
    } else {
      // Content is too short for saved position, reset to top
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }
}
