import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ImagorSignerType } from '@/generated/graphql'

export interface ExternalImagorFormData {
  baseUrl: string
  secret: string
  unsafe: boolean
  signerType: ImagorSignerType
  signerTruncate: number
}

export interface ExternalImagorFormRef {
  getValues: () => ExternalImagorFormData
}

interface ExternalImagorFormProps {
  onSubmit: (data: ExternalImagorFormData) => void
  disabled?: boolean
  initialValues?: Partial<ExternalImagorFormData>
}

export const ExternalImagorForm = forwardRef<ExternalImagorFormRef, ExternalImagorFormProps>(
  ({ onSubmit, disabled = false, initialValues }, ref) => {
    const { t } = useTranslation()

    const {
      register,
      handleSubmit,
      getValues,
      setValue,
      watch,
      formState: { errors },
    } = useForm<ExternalImagorFormData>({
      defaultValues: {
        baseUrl: initialValues?.baseUrl || '',
        secret: initialValues?.secret || '',
        unsafe: initialValues?.unsafe || false,
        signerType: initialValues?.signerType || 'SHA1',
        signerTruncate: initialValues?.signerTruncate || 0,
      },
    })

    const watchedUnsafe = watch('unsafe')
    const watchedSignerType = watch('signerType')

    useImperativeHandle(ref, () => ({
      getValues,
    }))

    return (
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='baseUrl'>
            {t('pages.imagor.baseUrl')} <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='baseUrl'
            placeholder='https://imagor.example.com'
            disabled={disabled}
            {...register('baseUrl', {
              required: t('pages.imagor.baseUrlRequired'),
              pattern: {
                value: /^https?:\/\/.+/,
                message: t('pages.imagor.baseUrlInvalid'),
              },
            })}
          />
          <p className='text-muted-foreground text-sm'>{t('pages.imagor.baseUrlDescription')}</p>
          {errors.baseUrl && <p className='text-destructive text-sm'>{errors.baseUrl.message}</p>}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='secret'>{t('pages.imagor.secret')}</Label>
          <Input
            id='secret'
            type='password'
            placeholder={t('pages.imagor.secretPlaceholder')}
            disabled={disabled}
            {...register('secret')}
          />
          <p className='text-muted-foreground text-sm'>
            {t('pages.imagor.externalSecretDescription')}
          </p>
          {errors.secret && <p className='text-destructive text-sm'>{errors.secret.message}</p>}
        </div>

        <div className='flex items-center space-x-2'>
          <Checkbox
            id='unsafe'
            checked={watchedUnsafe}
            onCheckedChange={(checked) => setValue('unsafe', checked as boolean)}
            disabled={disabled}
          />
          <div className='grid gap-1.5 leading-none'>
            <Label
              htmlFor='unsafe'
              className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              {t('pages.imagor.unsafeMode')}
            </Label>
            <p className='text-muted-foreground text-xs'>
              {t('pages.imagor.unsafeModeDescription')}
            </p>
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='signerType'>{t('pages.imagor.signerType')}</Label>
          <Select
            value={watchedSignerType}
            onValueChange={(value) => setValue('signerType', value as ImagorSignerType)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('pages.imagor.selectSignerType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='SHA1'>SHA1</SelectItem>
              <SelectItem value='SHA256'>SHA256</SelectItem>
              <SelectItem value='SHA512'>SHA512</SelectItem>
            </SelectContent>
          </Select>
          <p className='text-muted-foreground text-sm'>{t('pages.imagor.signerTypeDescription')}</p>
          {errors.signerType && (
            <p className='text-destructive text-sm'>{errors.signerType.message}</p>
          )}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='signerTruncate'>{t('pages.imagor.signerTruncate')}</Label>
          <Input
            id='signerTruncate'
            type='number'
            min='0'
            placeholder='0'
            disabled={disabled}
            {...register('signerTruncate', {
              valueAsNumber: true,
              min: {
                value: 0,
                message: t('pages.imagor.signerTruncateMin'),
              },
            })}
          />
          <p className='text-muted-foreground text-sm'>
            {t('pages.imagor.signerTruncateDescription')}
          </p>
          {errors.signerTruncate && (
            <p className='text-destructive text-sm'>{errors.signerTruncate.message}</p>
          )}
        </div>

        <Button type='submit' className='hidden' />
      </form>
    )
  },
)

ExternalImagorForm.displayName = 'ExternalImagorForm'
