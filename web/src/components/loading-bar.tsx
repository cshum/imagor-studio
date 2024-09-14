import { useEffect, useState } from 'react'

interface LoadingBarProps {
  isLoading: boolean
}

export function LoadingBar({ isLoading }: LoadingBarProps) {
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

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-secondary z-[100]">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
