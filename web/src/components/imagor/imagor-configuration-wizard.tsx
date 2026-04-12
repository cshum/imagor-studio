import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { configureEmbeddedImagor } from '@/api/imagor-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading.tsx'
import type { ImagorSignerType, ImagorStatusQuery } from '@/generated/graphql'

import {
  EmbeddedImagorForm,
  type EmbeddedImagorFormData,
  type EmbeddedImagorFormRef,
} from './embedded-imagor-form'

interface ImagorConfigurationWizardProps {
  onSuccess?: () => void
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
  const [isLoading, setIsLoading] = useState(false)
  const embeddedFormRef = useRef<EmbeddedImagorFormRef>(null)

  const isConfigOverridden = initialConfig?.isOverriddenByConfig || false

  const handleSubmit = async (data: EmbeddedImagorFormData) => {
    setIsLoading(true)
    try {
      const result = await configureEmbeddedImagor({
        input: {
          secret: data.secret.trim() !== '' ? data.secret : null,
          unsafe: data.unsafe,
          signerType: data.unsafe ? null : (data.signerType as ImagorSignerType),
          signerTruncate: data.unsafe ? null : data.signerTruncate,
        },
      })

      if (result.success) {
        toast.success(result.message || t('pages.imagor.configurationSuccess'))
        onSuccess?.()
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

  return (
    <div>
      {isConfigOverridden && (
        <span className='mb-4 block text-orange-600 dark:text-orange-400'>
          {t('pages.imagor.configurationOverridden')}
        </span>
      )}

      <div className='mt-2'>
        <EmbeddedImagorForm
          ref={embeddedFormRef}
          onSubmit={handleSubmit}
          disabled={isLoading || isConfigOverridden}
          initialValues={initialConfig?.embeddedConfig ?? null}
        />
      </div>

      <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end'>
        {showCancel && (
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            disabled={isLoading}
            className='sm:mr-auto'
          >
            {t('common.buttons.cancel')}
          </Button>
        )}
        <ButtonWithLoading
          type='submit'
          disabled={isConfigOverridden}
          isLoading={isLoading}
          onClick={() => embeddedFormRef.current?.submit()}
        >
          {t('pages.imagor.configureImagor')}
        </ButtonWithLoading>
      </div>
    </div>
  )
}
