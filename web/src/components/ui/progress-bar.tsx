import { cn } from '@/lib/utils'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function ProgressBar({ currentStep, totalSteps, className }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className={cn('w-full', className)}>
      {/* Step indicator */}
      <div className='mb-2 flex items-center justify-between'>
        <span className='text-muted-foreground text-sm'>
          Step {currentStep} of {totalSteps}
        </span>
        <span className='text-muted-foreground text-sm'>{Math.round(progress)}%</span>
      </div>

      {/* Progress bar */}
      <div className='bg-muted h-2 w-full rounded-full'>
        <div
          className='bg-primary h-2 rounded-full transition-all duration-300 ease-in-out'
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
