import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

interface LoadingBarProps {
  isLoading: boolean
  theme?: 'light' | 'dark' | 'auto'
  size?: 'thin' | 'default'
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

export function LoadingBar({ isLoading, theme = 'auto', size = 'default' }: LoadingBarProps) {
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
  const heightClassName = size === 'thin' ? 'h-0.5' : 'h-0.75'
  const backgroundClassName = cn(themeClasses.background, size === 'thin' && 'opacity-40')
  const barClassName = cn(themeClasses.bar, size === 'thin' && 'opacity-95')

  return (
    <div className={cn('fixed top-0 left-0 z-[100] w-full', heightClassName, backgroundClassName)}>
      <div
        className={cn('h-full transition-all duration-200 ease-out', barClassName)}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
