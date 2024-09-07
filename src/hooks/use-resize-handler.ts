import { useCallback, useEffect, useRef } from 'react'

export const useResizeHandler = (updateWidthCallback: () => void) => {
  const resizeTimeoutRef = useRef<number | null>(null)

  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current)
    }

    resizeTimeoutRef.current = window.setTimeout(() => {
      updateWidthCallback()
    }, 100) // 100ms debounce delay
  }, [updateWidthCallback])

  useEffect(() => {
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [handleResize])
}
