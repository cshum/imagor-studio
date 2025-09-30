import { useEffect, useState } from 'react'

interface LoadingBarProps {
  isLoading: boolean
  theme?: 'light' | 'dark' | 'auto'
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

export function LoadingBar({ isLoading, theme = 'auto' }: LoadingBarProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (isLoading) {
      setProgress(0)
      intervalId = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 90) {
            clearInterval(intervalId)
            return 90
          }
          return prevProgress + 10
        })
      }, 200)
    } else {
      setProgress(100)
      setTimeout(() => setProgress(0), 200) // Reset after animation completes
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isLoading])

  if (progress === 0) return null

  const themeClasses = themeClassesMap[theme] || themeClassesMap.auto

  return (
    <div className={`fixed top-0 left-0 h-0.75 w-full ${themeClasses.background} z-[100]`}>
      <div
        className={`h-full ${themeClasses.bar} transition-all duration-200 ease-out`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
