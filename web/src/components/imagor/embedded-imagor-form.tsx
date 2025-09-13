import { forwardRef, useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'

// Empty interface for consistency with external form
export interface EmbeddedImagorFormData {}

export interface EmbeddedImagorFormRef {
  submit: () => void
}

interface EmbeddedImagorFormProps {
  onSubmit: () => void
  disabled?: boolean
  initialValues?: Partial<EmbeddedImagorFormData>
}

export const EmbeddedImagorForm = forwardRef<EmbeddedImagorFormRef, EmbeddedImagorFormProps>(
  ({ onSubmit }, ref) => {
    const { t } = useTranslation()

    useImperativeHandle(ref, () => ({
      submit: onSubmit,
    }))

    return (
      <div className='space-y-4'>
        <div className='text-muted-foreground text-sm'>
          {t('pages.imagor.embeddedModeSimplified')}
        </div>
      </div>
    )
  }
)

EmbeddedImagorForm.displayName = 'EmbeddedImagorForm'
