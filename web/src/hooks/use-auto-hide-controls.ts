import { RefObject, useEffect, useRef, useState } from 'react'

export interface UseAutoHideControlsOptions {
  enabled?: boolean
  hideDelay?: number
  elementRef: RefObject<HTMLElement | null>
}

export interface UseAutoHideControlsReturn {
  showControls: boolean
}

/**
 * Custom hook to auto-hide controls after a period of inactivity
 * @param enabled - Whether the auto-hide feature is enabled (e.g., isDesktop)
 * @param hideDelay - Delay in milliseconds before hiding controls (default: 3000)
 * @param elementRef - Ref to the element to attach the mouse move listener
 * @returns Object containing showControls boolean state
 */
export function useAutoHideControls({
  enabled = true,
  hideDelay = 3000,
  elementRef,
}: UseAutoHideControlsOptions): UseAutoHideControlsReturn {
  const [showControls, setShowControls] = useState(true)
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // If not enabled, always show controls
    if (!enabled) {
      setShowControls(true)
      return
    }

    const resetHideTimer = () => {
      // Clear existing timer
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }

      // Show controls
      setShowControls(true)

      // Set new timer to hide controls after specified delay
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false)
      }, hideDelay)
    }

    const handleMouseMove = () => {
      resetHideTimer()
    }

    // Start initial timer
    resetHideTimer()

    // Add mouse move listener
    const element = elementRef.current
    if (element) {
      element.addEventListener('mousemove', handleMouseMove)
    }

    // Cleanup
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [enabled, hideDelay, elementRef])

  return { showControls }
}
