import { useEffect, useState } from 'react'

// Define the breakpoints based on your Tailwind config
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

type Breakpoint = keyof typeof breakpoints

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${breakpoints[breakpoint]})`)

    const updateMatch = () => setMatches(media.matches)

    // Set initial value
    updateMatch()

    // Add listener for changes
    media.addEventListener('change', updateMatch)

    // Clean up listener on component unmount
    return () => media.removeEventListener('change', updateMatch)
  }, [breakpoint])

  return matches
}
