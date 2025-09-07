import { ReactNode, useState } from 'react'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RectangleStepper } from '@/components/ui/rectangle-stepper'
import { cn } from '@/lib/utils'

export interface MultiStepFormStep {
  id: string
  title: string
  description?: string
  content: ReactNode
  canSkip?: boolean
  skipLabel?: string
  nextLabel?: string
  backLabel?: string
  hideBack?: boolean
  hideNext?: boolean
  onNext?: () => Promise<boolean> | boolean
  onBack?: () => void
  onSkip?: () => void
  isValid?: boolean
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

export function MultiStepForm({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  title,
  description,
  className,
  showStepper = true,
}: MultiStepFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const currentStepData = steps[currentStep - 1]
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === steps.length

  const handleNext = async () => {
    if (!currentStepData) return

    setIsLoading(true)
    try {
      let canProceed = true

      if (currentStepData.onNext) {
        canProceed = await currentStepData.onNext()
      }

      if (canProceed) {
        if (isLastStep) {
          onComplete()
        } else {
          onStepChange(currentStep + 1)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (isFirstStep) return

    if (currentStepData?.onBack) {
      currentStepData.onBack()
    }

    onStepChange(currentStep - 1)
  }

  const handleSkip = () => {
    if (currentStepData?.onSkip) {
      currentStepData.onSkip()
    } else {
      // Default skip behavior - go to next step
      if (isLastStep) {
        onComplete()
      } else {
        onStepChange(currentStep + 1)
      }
    }
  }

  const getNextButtonLabel = () => {
    if (currentStepData?.nextLabel) return currentStepData.nextLabel
    return isLastStep ? 'Complete Setup' : 'Continue'
  }

  const getBackButtonLabel = () => {
    return currentStepData?.backLabel || 'Back'
  }

  const getSkipButtonLabel = () => {
    return currentStepData?.skipLabel || 'Skip'
  }

  const isNextDisabled = () => {
    if (isLoading) return true
    if (currentStepData?.isValid !== undefined) return !currentStepData.isValid
    return false
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
          <div key={currentStep} className='animate-in fade-in-50 duration-300'>
            {currentStepData?.content}
          </div>

          {/* Navigation */}
          <div className='mt-6 flex items-center justify-between border-t pt-6'>
            <div className='flex gap-2'>
              {!isFirstStep && !currentStepData?.hideBack && (
                <Button
                  variant='outline'
                  onClick={handleBack}
                  disabled={isLoading}
                  className='flex items-center gap-2'
                >
                  <ChevronLeft className='h-4 w-4' />
                  {getBackButtonLabel()}
                </Button>
              )}
            </div>

            <div className='flex gap-2'>
              {currentStepData?.canSkip && (
                <Button variant='ghost' onClick={handleSkip} disabled={isLoading}>
                  {getSkipButtonLabel()}
                </Button>
              )}

              {!currentStepData?.hideNext && (
                <ButtonWithLoading
                  onClick={handleNext}
                  isLoading={isLoading}
                  disabled={isNextDisabled()}
                  className='flex items-center gap-2'
                >
                  {getNextButtonLabel()}
                </ButtonWithLoading>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
