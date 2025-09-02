import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface Step {
  id: string
  title: string
  description?: string
}

export interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function Stepper({ 
  steps, 
  currentStep, 
  className,
  orientation = 'horizontal' 
}: StepperProps) {
  return (
    <div className={cn(
      'flex',
      orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
      // Responsive: vertical on mobile, horizontal on larger screens
      'flex-col sm:flex-row sm:items-center',
      className
    )}>
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep
        const isUpcoming = stepNumber > currentStep

        return (
          <div
            key={step.id}
            className={cn(
              'flex items-center',
              orientation === 'horizontal' ? 'flex-row' : 'flex-col',
              index < steps.length - 1 && orientation === 'horizontal' && 'flex-1'
            )}
          >
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-background text-primary',
                  isUpcoming && 'border-muted-foreground/25 bg-background text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  stepNumber
                )}
              </div>
              
              {/* Step Content */}
              <div className={cn(
                'text-center',
                orientation === 'horizontal' ? 'mt-1.5' : 'mt-1.5 mb-3'
              )}>
                <div className={cn(
                  'text-xs font-medium',
                  isCurrent && 'text-foreground',
                  isCompleted && 'text-foreground',
                  isUpcoming && 'text-muted-foreground'
                )}>
                  {step.title}
                </div>
                {step.description && (
                  <div className={cn(
                    'text-xs mt-0.5 max-w-24',
                    isCurrent && 'text-muted-foreground',
                    isCompleted && 'text-muted-foreground',
                    isUpcoming && 'text-muted-foreground/75'
                  )}>
                    {step.description}
                  </div>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'transition-colors',
                  orientation === 'horizontal' 
                    ? 'h-[2px] flex-1 mx-4 mt-[-20px]' 
                    : 'w-[2px] h-8 ml-5 mt-[-16px] mb-[-16px]',
                  stepNumber < currentStep ? 'bg-primary' : 'bg-muted-foreground/25'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
