import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a debounced version of the given callback.
 *
 * Useful for inputs that fire rapidly (e.g. `<input type="color">` onChange
 * fires on every drag movement) where you want the UI to stay reactive but
 * only commit the final value after the user stops interacting.
 *
 * @param onCommit  Callback invoked with the latest value after `delay` ms of inactivity.
 * @param delay     Debounce delay in milliseconds (default 300).
 * @returns         A stable function that accepts a value and schedules the commit.
 */
export function useDebouncedCommit<T>(onCommit: (value: T) => void, delay = 300) {
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const debouncedCommit = useCallback(
    (value: T) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => commitRef.current(value), delay)
    },
    [delay],
  )

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return debouncedCommit
}
