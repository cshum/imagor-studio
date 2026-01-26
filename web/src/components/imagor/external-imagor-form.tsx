import { forwardRef, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
import { cn } from '@/lib/utils'

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
    const [showAdvanced, setShowAdvanced] = useState(false)

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
      <div className='space-y-6'>
        <div className='rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950'>
          <div className='text-sm text-blue-800 dark:text-blue-200'>
            <div className='mb-2 font-medium'>{t('pages.imagor.externalRequirements')}</div>
            <ul className='list-inside list-disc space-y-1'>
              <li>{t('pages.imagor.externalRequirement1')}</li>
              <li>{t('pages.imagor.externalRequirement2')}</li>
            </ul>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          <div className={cn('space-y-6', disabled && 'opacity-60')}>
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
              <p className='text-muted-foreground text-sm'>
                {t('pages.imagor.baseUrlDescription')}
              </p>
              {errors.baseUrl && (
                <p className='text-destructive text-sm'>{errors.baseUrl.message}</p>
              )}
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

            <div className='flex flex-row items-center justify-between space-y-0'>
              <div className='space-y-1'>
                <Label
                  htmlFor='unsafe'
                  className='cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  {t('pages.imagor.unsafeMode')}
                </Label>
                <p className='text-muted-foreground text-xs'>
                  {t('pages.imagor.unsafeModeDescription')}
                </p>
              </div>
              <Checkbox
                id='unsafe'
                checked={watchedUnsafe}
                onCheckedChange={(checked) => setValue('unsafe', checked as boolean)}
                disabled={disabled}
              />
            </div>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button
                  variant='ghost'
                  className='gap-2'
                  size='sm'
                  type='button'
                  disabled={disabled}
                >
                  {showAdvanced ? (
                    <ChevronDown className='text-muted-foreground h-4 w-4' />
                  ) : (
                    <ChevronRight className='text-muted-foreground h-4 w-4' />
                  )}
                  {t('pages.storage.advancedSettings')}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className='space-y-6 pt-4'>
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
                  <p className='text-muted-foreground text-sm'>
                    {t('pages.imagor.signerTypeDescription')}
                  </p>
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
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Button type='submit' className='hidden' />
        </form>
      </div>
    )
  },
)

ExternalImagorForm.displayName = 'ExternalImagorForm'
