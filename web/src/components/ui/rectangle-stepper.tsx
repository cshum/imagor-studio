import { cn } from '@/lib/utils'

interface RectangleStepperProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function RectangleStepper({ currentStep, totalSteps, className }: RectangleStepperProps) {
  return (
    <div className={cn('flex w-full items-center gap-3', className)}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber <= currentStep

        return (
          <div
            key={stepNumber}
            className={cn(
              'h-1 flex-1 rounded-sm transition-all duration-200',
              isCompleted ? 'bg-primary' : 'bg-muted',
            )}
          />
        )
      })}
    </div>
  )
}
