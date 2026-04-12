import { forwardRef, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ImagorConfig } from '@/generated/graphql'

const schema = z.object({
  secret: z.string(),
  unsafe: z.boolean(),
  signerType: z.enum(['SHA1', 'SHA256', 'SHA512']),
  signerTruncate: z.number().int().min(0),
})

export type ImagorFormData = z.infer<typeof schema>

export interface ImagorFormRef {
  submit: () => void
}

interface ImagorFormProps {
  onSubmit: (data: ImagorFormData) => void
  disabled?: boolean
  initialValues?: ImagorConfig | null
}

export const ImagorForm = forwardRef<ImagorFormRef, ImagorFormProps>(
  ({ onSubmit, disabled, initialValues }, ref) => {
    const { t } = useTranslation()
    const [advancedOpen, setAdvancedOpen] = useState(false)

    const form = useForm<ImagorFormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        secret: '',
        unsafe: initialValues?.unsafe ?? false,
        signerType:
          (initialValues?.signerType as ImagorFormData['signerType'] | undefined) ?? 'SHA256',
        signerTruncate: initialValues?.signerTruncate ?? 32,
      },
    })

    const unsafe = form.watch('unsafe')

    useImperativeHandle(ref, () => ({
      submit: () => {
        void form.handleSubmit(onSubmit)()
      },
    }))

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          {/* Secret key */}
          <FormField
            control={form.control}
            name='secret'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pages.imagor.secret')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type='password'
                    placeholder={initialValues?.hasSecret ? '••••••••' : undefined}
                    disabled={disabled}
                    autoComplete='new-password'
                  />
                </FormControl>
                <FormDescription>{t('pages.imagor.secretDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Unsafe mode */}
          <FormField
            control={form.control}
            name='unsafe'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>{t('pages.imagor.unsafeMode')}</FormLabel>
                  <FormDescription>{t('pages.imagor.unsafeModeDescription')}</FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Advanced settings (signer type + truncate) */}
          {!unsafe && (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant='ghost'
                  className='gap-2'
                  size='sm'
                  type='button'
                  disabled={disabled}
                >
                  {advancedOpen ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  )}
                  {t('pages.storage.advancedSettings')}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className='mt-3 space-y-4'>
                <FormField
                  control={form.control}
                  name='signerType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pages.imagor.signerType')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={disabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('pages.imagor.selectSignerType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='SHA1'>SHA1</SelectItem>
                          <SelectItem value='SHA256'>SHA256</SelectItem>
                          <SelectItem value='SHA512'>SHA512</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('pages.imagor.signerTypeDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='signerTruncate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pages.imagor.signerTruncate')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('pages.imagor.signerTruncateDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </form>
      </Form>
    )
  },
)

ImagorForm.displayName = 'ImagorForm'
