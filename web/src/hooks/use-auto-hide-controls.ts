import { RefObject, useCallback, useEffect, useRef, useState } from 'react'

export interface UseAutoHideControlsOptions {
  enabled?: boolean
  hideDelay?: number
  elementRef: RefObject<HTMLElement | null>
}

export interface UseAutoHideControlsReturn {
  showControls: boolean
  resetTimer: () => void
}

/**
 * Custom hook to auto-hide controls after a period of inactivity.
 * On desktop, mouse movement resets the timer.
 * On mobile (touch devices), tapping the element resets the timer.
 * @param enabled - Whether the auto-hide feature is enabled
 * @param hideDelay - Delay in milliseconds before hiding controls (default: 3000)
 * @param elementRef - Ref to the element to attach the event listeners
 * @returns Object containing showControls boolean state and a resetTimer function
 */
export function useAutoHideControls({
  enabled = true,
  hideDelay = 3000,
  elementRef,
}: UseAutoHideControlsOptions): UseAutoHideControlsReturn {
  const [showControls, setShowControls] = useState(true)
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current)
    }
    setShowControls(true)
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false)
    }, hideDelay)
  }, [hideDelay])

  useEffect(() => {
    // If not enabled, always show controls
    if (!enabled) {
      setShowControls(true)
      return
    }

    const handleMouseMove = () => {
      resetTimer()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only reset timer on Tab key
      if (event.key === 'Tab') {
        resetTimer()
      }
    }

    const handleTouchStart = () => {
      resetTimer()
    }

    // Start initial timer
    resetTimer()

    // Add mouse move, keyboard, and touch listeners
    const element = elementRef.current
    if (element) {
      element.addEventListener('mousemove', handleMouseMove)
      element.addEventListener('keydown', handleKeyDown)
      element.addEventListener('touchstart', handleTouchStart, { passive: true })
    }

    // Cleanup
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove)
        element.removeEventListener('keydown', handleKeyDown)
        element.removeEventListener('touchstart', handleTouchStart)
      }
    }
  }, [enabled, resetTimer, elementRef])

  return { showControls, resetTimer }
}
