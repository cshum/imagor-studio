import { useEffect } from 'react'

/**
 * Prevents the macOS elastic/springy overscroll bounce on document.body
 * while the component is mounted, then restores the previous value on unmount.
 */
export function useNoBodyOverscroll() {
  useEffect(() => {
    const prev = document.body.style.overscrollBehavior
    document.body.style.overscrollBehavior = 'none'
    return () => {
      document.body.style.overscrollBehavior = prev
    }
  }, [])
}
