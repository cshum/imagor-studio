import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface EmbeddedImagorFormData {
  cachePath: string
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
  ({ onSubmit, disabled = false, initialValues }, ref) => {
    const { t } = useTranslation()

    const {
      register,
      handleSubmit,
      getValues,
      formState: { errors },
    } = useForm<EmbeddedImagorFormData>({
      defaultValues: {
        cachePath: initialValues?.cachePath || '',
      },
    })

    useImperativeHandle(ref, () => ({
      getValues,
    }))

    return (
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='cachePath'>{t('pages.imagor.cachePath')}</Label>
          <Input id='cachePath' placeholder='' disabled={disabled} {...register('cachePath')} />
          <p className='text-muted-foreground text-sm'>{t('pages.imagor.cachePathDescription')}</p>
          {errors.cachePath && (
            <p className='text-destructive text-sm'>{errors.cachePath.message}</p>
          )}
        </div>

        <Button type='submit' className='hidden' />
      </form>
    )
  },
)

EmbeddedImagorForm.displayName = 'EmbeddedImagorForm'
