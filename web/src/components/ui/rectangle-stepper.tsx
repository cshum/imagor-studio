import { cn } from '@/lib/utils'

interface RectangleStepperProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function RectangleStepper({ currentStep, totalSteps, className }: RectangleStepperProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber <= currentStep
        
        return (
          <div
            key={stepNumber}
            className={cn(
              'w-3 h-1 rounded-sm transition-all duration-200',
              isCompleted 
                ? 'bg-primary' 
                : 'border border-muted-foreground/30'
            )}
          />
        )
      })}
    </div>
  )
}
