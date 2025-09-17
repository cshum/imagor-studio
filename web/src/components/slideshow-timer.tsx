import { useEffect, useRef, useState } from 'react'

interface SlideshowTimerProps {
  isActive: boolean
  duration?: number
  theme?: 'light' | 'dark' | 'auto'
  resetKey?: string | number
}

const themeClassesMap = {
  light: {
    background: 'bg-gray-100',
    bar: 'bg-gray-900',
  },
  dark: {
    background: 'bg-gray-800',
    bar: 'bg-gray-50',
  },
  auto: {
    background: 'bg-secondary',
    bar: 'bg-primary',
  },
}

export function SlideshowTimer({
  isActive,
  duration = 5000,
  theme = 'dark',
  resetKey,
}: SlideshowTimerProps) {
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (isActive) {
      // Reset and start timer
      setProgress(0)
      startTimeRef.current = Date.now()

      const updateProgress = () => {
        if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current
          const newProgress = Math.min((elapsed / duration) * 100, 100)

          setProgress(newProgress)

          if (newProgress < 100) {
            animationFrameRef.current = requestAnimationFrame(updateProgress)
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateProgress)
    } else {
      // Stop timer and reset
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      startTimeRef.current = null
      setProgress(0)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, duration, resetKey])

  if (!isActive || progress === 0) return null

  const themeClasses = themeClassesMap[theme] || themeClassesMap.dark

  return (
    <div className={`fixed top-0 left-0 h-1 w-full ${themeClasses.background} z-[200]`}>
      <div
        className={`h-full ${themeClasses.bar} transition-none`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
