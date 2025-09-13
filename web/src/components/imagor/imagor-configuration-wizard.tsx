import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { configureEmbeddedImagor, configureExternalImagor } from '@/api/imagor-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading.tsx'
import type { ImagorStatusQuery } from '@/generated/graphql'

import {
  EmbeddedImagorForm,
  type EmbeddedImagorFormData,
  type EmbeddedImagorFormRef,
} from './embedded-imagor-form'
import {
  ExternalImagorForm,
  type ExternalImagorFormData,
  type ExternalImagorFormRef,
} from './external-imagor-form'
import { ImagorTypeSelector, type ImagorType } from './imagor-type-selector'

interface ImagorConfigurationWizardProps {
  onSuccess?: (restartRequired: boolean) => void
  onError?: (error: string) => void
  onCancel?: () => void
  showCancel?: boolean
  initialConfig?: ImagorStatusQuery['imagorStatus'] | null
}

export function ImagorConfigurationWizard({
  onSuccess,
  onError,
  onCancel,
  showCancel = false,
  initialConfig,
}: ImagorConfigurationWizardProps) {
  const { t } = useTranslation()
  const [imagorType, setImagorType] = useState<ImagorType>('embedded')
  const [isLoading, setIsLoading] = useState(false)

  // Refs to access form data
  const embeddedFormRef = useRef<EmbeddedImagorFormRef>(null)
  const externalFormRef = useRef<ExternalImagorFormRef>(null)

  // Initialize form with existing configuration
  useEffect(() => {
    if (initialConfig?.configured && initialConfig.mode) {
      const type = initialConfig.mode.toLowerCase() === 'embedded' ? 'embedded' : 'external'
      setImagorType(type)
    }
  }, [initialConfig])

  // Get initial values for embedded form
  const getEmbeddedInitialValues = (): Partial<EmbeddedImagorFormData> | undefined => {
    if (!initialConfig?.embeddedConfig) return undefined
    return {
      // No cachePath needed for embedded mode
    }
  }

  // Get initial values for external form
  const getExternalInitialValues = (): Partial<ExternalImagorFormData> | undefined => {
    if (!initialConfig?.externalConfig) return undefined
    return {
      baseUrl: initialConfig.externalConfig.baseUrl,
      secret: '', // Don't pre-populate secret for security
      unsafe: initialConfig.externalConfig.unsafe,
      signerType: initialConfig.externalConfig.signerType,
      signerTruncate: initialConfig.externalConfig.signerTruncate,
    }
  }

  const handleEmbeddedSubmit = async () => {
    setIsLoading(true)
    try {
      const result = await configureEmbeddedImagor()

      if (result.success) {
        toast.success(result.message || t('pages.imagor.configurationSuccess'))
        onSuccess?.(result.restartRequired)
      } else {
        const errorMessage = result.message || t('pages.imagor.configurationError')
        toast.error(errorMessage)
        onError?.(errorMessage)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('pages.imagor.configurationError')
      toast.error(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExternalSubmit = async (data: ExternalImagorFormData) => {
    setIsLoading(true)
    try {
      const result = await configureExternalImagor({
        input: {
          baseUrl: data.baseUrl,
          secret: data.secret || null,
          unsafe: data.unsafe || null,
          signerType: data.signerType || null,
          signerTruncate: data.signerTruncate || null,
        },
      })

      if (result.success) {
        toast.success(result.message || t('pages.imagor.configurationSuccess'))
        onSuccess?.(result.restartRequired)
      } else {
        const errorMessage = result.message || t('pages.imagor.configurationError')
        toast.error(errorMessage)
        onError?.(errorMessage)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('pages.imagor.configurationError')
      toast.error(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if configuration is overridden by external config
  const isConfigOverridden = initialConfig?.isOverriddenByConfig || false

  return (
    <div>
      {isConfigOverridden && (
        <span className='mb-4 block text-orange-600 dark:text-orange-400'>
          {t('pages.imagor.configurationOverridden')}
        </span>
      )}

      <ImagorTypeSelector
        value={imagorType}
        onChange={setImagorType}
        disabled={isLoading || isConfigOverridden}
      />

      <div className='mt-6'>
        {imagorType === 'embedded' && (
          <div className='space-y-4'>
            <h4 className='font-medium'>{t('pages.imagor.embeddedConfiguration')}</h4>
            <EmbeddedImagorForm
              ref={embeddedFormRef}
              onSubmit={handleEmbeddedSubmit}
              disabled={isLoading || isConfigOverridden}
              initialValues={getEmbeddedInitialValues()}
            />
          </div>
        )}

        {imagorType === 'external' && (
          <div className='space-y-4'>
            <h4 className='font-medium'>{t('pages.imagor.externalConfiguration')}</h4>
            <ExternalImagorForm
              ref={externalFormRef}
              onSubmit={handleExternalSubmit}
              disabled={isLoading || isConfigOverridden}
              initialValues={getExternalInitialValues()}
            />
          </div>
        )}
      </div>

      <div className='mt-6 flex flex-col justify-between gap-3 sm:flex-row'>
        <div className='flex gap-3'>
          {showCancel && (
            <Button type='button' variant='outline' onClick={onCancel} disabled={isLoading}>
              {t('common.buttons.cancel')}
            </Button>
          )}
        </div>
        <ButtonWithLoading
          type='submit'
          disabled={isConfigOverridden}
          isLoading={isLoading}
          onClick={() => {
            // Trigger form submission based on imagor type
            if (imagorType === 'embedded') {
              embeddedFormRef.current?.submit()
            } else {
              const form = document.querySelector('form')
              if (form) {
                form.requestSubmit()
              }
            }
          }}
        >
          {t('pages.imagor.configureImagor')}
        </ButtonWithLoading>
      </div>
    </div>
  )
}
