import { useCallback, useEffect, useRef, useState } from 'react'

import { getPosition, setPosition } from '@/stores/scroll-position-store'

export const useScrollHandler = (
  scrollKey: string, // Unique identifier for this scroll context
  debounceDelay: number = 0, // Default debounce delay is 0, meaning no debounce
) => {
  const [scrollPosition, setScrollPosition] = useState<number>(0) // Use state for scroll position
  const [isScrolling, setIsScrolling] = useState<boolean>(false) // Track scrolling state
  const saveTimeoutRef = useRef<number | null>(null) // For delayed saving of scroll position
  const scrollingTimeoutRef = useRef<number | null>(null) // For tracking when scrolling stops
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

  const restoreScrollPosition = useCallback(() => {
    const savedPosition = getPosition(optionsRef.current.scrollKey) // Get scroll position using store
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
        setScrollPosition(positionToRestore) // Restore scroll position in state
      } else {
        // Content is too short for saved position, reset to top
        window.scrollTo({ top: 0, behavior: 'instant' })
        setScrollPosition(0)
      }
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const { debounceDelay } = optionsRef.current

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      setIsScrolling(true) // Set scrolling to true when scrolling starts

      const executeScrollHandling = () => {
        const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop

        // Update scroll position state
        setScrollPosition(currentScrollPosition)

        // Save scroll position after a short delay
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = window.setTimeout(() => {
          setPosition(optionsRef.current.scrollKey, currentScrollPosition)
        }, 150)

        // Set scrolling to false after a delay (scrolling has stopped)
        if (scrollingTimeoutRef.current) {
          clearTimeout(scrollingTimeoutRef.current)
        }
        scrollingTimeoutRef.current = window.setTimeout(() => {
          setIsScrolling(false)
        }, 150)
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
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current)
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return {
    restoreScrollPosition,
    scrollPosition,
    isScrolling,
  }
}
