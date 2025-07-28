import { RefObject, useCallback, useEffect, useRef, useState } from 'react'

import { scrollPositionActions } from '@/stores/scroll-position-store'

export const useScrollHandler = (
  containerRef: RefObject<HTMLDivElement | null>,
  scrollKey: string, // Unique identifier for this scroll context
  debounceDelay: number = 0, // Default debounce delay is 0, meaning no debounce
) => {
  const [scrollPosition, setScrollPosition] = useState<number>(0) // Use state for scroll position
  const [isScrolling, setIsScrolling] = useState<boolean>(false) // Track scrolling state
  const scrollTimeoutRef = useRef<number | null>(null)
  const debounceTimeoutRef = useRef<number | null>(null)

  const saveScrollPosition = useCallback(
    (currentScrollPosition: number) => {
      setScrollPosition(currentScrollPosition) // Update the state

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Save scroll position after a short delay
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollPositionActions.setPosition(scrollKey, currentScrollPosition) // Save scroll position using store
      }, 150)
    },
    [scrollKey],
  )

  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    setIsScrolling(true) // Set scrolling to true when scrolling starts

    const executeScrollHandling = () => {
      if (containerRef.current) {
        const currentScrollPosition = containerRef.current.scrollTop
        saveScrollPosition(currentScrollPosition) // Save scroll position through the refactored function
      }

      // Set scrolling to false after a delay (scrolling has stopped)
      scrollTimeoutRef.current = window.setTimeout(() => {
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
  }, [containerRef, debounceDelay, saveScrollPosition])

  const restoreScrollPosition = useCallback(() => {
    const savedPosition = scrollPositionActions.getPosition(scrollKey) // Get scroll position using store
    if (savedPosition > 0 && containerRef.current) {
      containerRef.current.scrollTop = savedPosition
      setScrollPosition(savedPosition) // Restore scroll position in state
    }
  }, [containerRef, scrollKey])

  // Add and clean up scroll event listener
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.addEventListener('scroll', handleScroll)
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', handleScroll)
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [handleScroll])

  return {
    handleScroll,
    restoreScrollPosition,
    scrollPosition,
    isScrolling,
  }
}
