import { forwardRef, ReactNode, useCallback, useImperativeHandle, useRef } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/card'
import { cn } from '@shared/lib-utils'
import { RectangleStepper } from '@/components/ui/rectangle-stepper'

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

    useImperativeHandle(
      ref,
      () => ({
        next: handleNext,
        back: handleBack,
        skip: handleSkip,
      }),
      [handleNext, handleBack, handleSkip],
    )

    const navigationProps: MultiStepFormNavigationProps = {
      next: handleNext,
      back: handleBack,
      skip: handleSkip,
      isFirstStep,
      isLastStep,
    }

    return (
      <div className={cn('mx-auto w-full max-w-4xl', className)}>
        {(title || description) && (
          <div className='mb-6 text-center sm:mb-8'>
            {title && (
              <h1 className='mb-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl'>
                {title}
              </h1>
            )}
            {description && (
              <p className='text-muted-foreground text-sm sm:text-base md:text-lg'>{description}</p>
            )}
          </div>
        )}

        {showStepper && (
          <div className='mb-4 sm:mb-8'>
            <RectangleStepper currentStep={currentStep} totalSteps={steps.length} />
          </div>
        )}

        <Card className='min-h-[400px] p-2 sm:p-4'>
          <CardHeader className='px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6'>
            <CardTitle className='text-lg sm:text-xl'>{currentStepData?.title}</CardTitle>
            {currentStepData?.description && (
              <CardDescription className='text-sm'>{currentStepData.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
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
