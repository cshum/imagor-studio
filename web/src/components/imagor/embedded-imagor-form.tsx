import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export interface EmbeddedImagorFormData {
  // No configurable options for embedded mode after CachePath removal
}

export interface EmbeddedImagorFormRef {
  getValues: () => EmbeddedImagorFormData
}

interface EmbeddedImagorFormProps {
  onSubmit: (data: EmbeddedImagorFormData) => void
  disabled?: boolean
  initialValues?: Partial<EmbeddedImagorFormData>
}

export const EmbeddedImagorForm = forwardRef<EmbeddedImagorFormRef, EmbeddedImagorFormProps>(
  ({ onSubmit }, ref) => {
    const { t } = useTranslation()

    const {
      handleSubmit,
      getValues,
    } = useForm<EmbeddedImagorFormData>({
      defaultValues: {},
    })

    useImperativeHandle(ref, () => ({
      getValues,
    }))

    return (
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <div className='text-muted-foreground text-sm'>
          {t('pages.imagor.embeddedModeSimplified')}
        </div>

        <Button type='submit' className='hidden' />
      </form>
    )
  },
)

EmbeddedImagorForm.displayName = 'EmbeddedImagorForm'
