import { RefObject, useCallback, useEffect, useRef, useState } from 'react'

import { getPosition, setPosition } from '@/stores/scroll-position-store'

export const useScrollHandler = (
  containerRef: RefObject<HTMLDivElement | null> | null,
  scrollKey: string, // Unique identifier for this scroll context
  debounceDelay: number = 0, // Default debounce delay is 0, meaning no debounce
  useDocumentScroll: boolean = false, // New option to use document scrolling
) => {
  const [scrollPosition, setScrollPosition] = useState<number>(0) // Use state for scroll position
  const [isScrolling, setIsScrolling] = useState<boolean>(false) // Track scrolling state
  const scrollTimeoutRef = useRef<number | null>(null)
  const debounceTimeoutRef = useRef<number | null>(null)
  
  // Store options in ref to avoid stale closures
  const optionsRef = useRef({
    scrollKey,
    debounceDelay,
    useDocumentScroll,
    containerRef,
  })

  useEffect(() => {
    optionsRef.current = {
      scrollKey,
      debounceDelay,
      useDocumentScroll,
      containerRef,
    }
  }, [scrollKey, debounceDelay, useDocumentScroll, containerRef])

  const saveScrollPosition = useCallback(
    (currentScrollPosition: number) => {
      setScrollPosition(currentScrollPosition) // Update the state

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Save scroll position after a short delay
      scrollTimeoutRef.current = window.setTimeout(() => {
        setPosition(optionsRef.current.scrollKey, currentScrollPosition) // Save scroll position using store
      }, 150)
    },
    [],
  )

  const restoreScrollPosition = useCallback(() => {
    const savedPosition = getPosition(optionsRef.current.scrollKey) // Get scroll position using store
    if (savedPosition > 0) {
      if (optionsRef.current.useDocumentScroll) {
        // Use document scrolling - following useInfiniteScroll pattern
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
      } else if (optionsRef.current.containerRef?.current) {
        // Check if content is tall enough for this scroll position
        const container = optionsRef.current.containerRef.current
        const containerHeight = container.clientHeight
        const scrollHeight = container.scrollHeight
        const maxScrollPosition = scrollHeight - containerHeight

        // Only restore if the saved position is valid for current content
        const positionToRestore = Math.min(savedPosition, Math.max(0, maxScrollPosition))

        if (positionToRestore > 0) {
          container.scrollTop = positionToRestore
          setScrollPosition(positionToRestore) // Restore scroll position in state
        } else {
          // Content is too short for saved position, reset to top
          container.scrollTop = 0
          setScrollPosition(0)
        }
      }
    }
  }, [])

  // Following the exact pattern from useInfiniteScroll
  useEffect(() => {
    const handleScroll = () => {
      const { debounceDelay, useDocumentScroll, containerRef } = optionsRef.current
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      setIsScrolling(true) // Set scrolling to true when scrolling starts

      const executeScrollHandling = () => {
        let currentScrollPosition = 0

        if (useDocumentScroll) {
          // Use document scrolling - following useInfiniteScroll pattern
          currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop
        } else if (containerRef?.current) {
          currentScrollPosition = containerRef.current.scrollTop
        }

        saveScrollPosition(currentScrollPosition)

        // Set scrolling to false after a delay (scrolling has stopped)
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
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
    }

    if (useDocumentScroll) {
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        window.removeEventListener('scroll', handleScroll)
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }
      }
    } else if (containerRef?.current) {
      const container = containerRef.current
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        container.removeEventListener('scroll', handleScroll)
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }
      }
    }
  }, []) // Empty dependency array like useInfiniteScroll

  return {
    restoreScrollPosition,
    scrollPosition,
    isScrolling,
  }
}
