import { forwardRef, ReactNode, useCallback, useImperativeHandle, useRef } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RectangleStepper } from '@/components/ui/rectangle-stepper'
import { cn } from '@/lib/utils'

export interface MultiStepFormNavigationProps {
  next: () => Promise<void>
  back: () => void
  skip: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

export interface MultiStepFormStep {
  id: string
  title: string
  description?: string
  content: (props: MultiStepFormNavigationProps) => ReactNode
}

export interface MultiStepFormProps {
  steps: MultiStepFormStep[]
  currentStep: number
  onStepChange: (step: number) => void
  onComplete: () => void
  title?: string
  description?: string
  className?: string
  showStepper?: boolean
}

export interface MultiStepFormRef {
  next: () => Promise<void>
  back: () => void
  skip: () => void
}

export const MultiStepForm = forwardRef<MultiStepFormRef, MultiStepFormProps>(
  (
    {
      steps,
      currentStep,
      onStepChange,
      onComplete,
      title,
      description,
      className,
      showStepper = true,
    },
    ref,
  ) => {
    const contentRef = useRef<HTMLDivElement>(null)

    const currentStepData = steps[currentStep - 1]
    const isFirstStep = currentStep === 1
    const isLastStep = currentStep === steps.length

    const handleNext = useCallback(async () => {
      if (isLastStep) {
        onComplete()
      } else {
        onStepChange(currentStep + 1)
      }
    }, [isLastStep, onComplete, onStepChange, currentStep])

    const handleBack = useCallback(() => {
      if (isFirstStep) return
      onStepChange(currentStep - 1)
    }, [isFirstStep, onStepChange, currentStep])

    const handleSkip = useCallback(() => {
      if (isLastStep) {
        onComplete()
      } else {
        onStepChange(currentStep + 1)
      }
    }, [isLastStep, onComplete, onStepChange, currentStep])

    // Expose navigation methods through ref
    useImperativeHandle(
      ref,
      () => ({
        next: handleNext,
        back: handleBack,
        skip: handleSkip,
      }),
      [handleNext, handleBack, handleSkip],
    )

    // Navigation props to pass to step content
    const navigationProps: MultiStepFormNavigationProps = {
      next: handleNext,
      back: handleBack,
      skip: handleSkip,
      isFirstStep,
      isLastStep,
    }

    return (
      <div className={cn('mx-auto w-full max-w-4xl', className)}>
        {/* Header */}
        {(title || description) && (
          <div className='mb-8 text-center'>
            {title && <h1 className='mb-2 text-3xl font-bold tracking-tight'>{title}</h1>}
            {description && <p className='text-muted-foreground text-lg'>{description}</p>}
          </div>
        )}

        {/* Rectangle Stepper */}
        {showStepper && (
          <div className='mb-8'>
            <RectangleStepper currentStep={currentStep} totalSteps={steps.length} />
          </div>
        )}

        {/* Step Content */}
        <Card className='min-h-[400px] p-4'>
          <CardHeader>
            <CardTitle>{currentStepData?.title}</CardTitle>
            {currentStepData?.description && (
              <CardDescription>{currentStepData.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {/* Content with fade transition */}
            <div key={currentStep} className='animate-in fade-in-50 duration-300' ref={contentRef}>
              {currentStepData?.content(navigationProps)}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  },
)

MultiStepForm.displayName = 'MultiStepForm'
