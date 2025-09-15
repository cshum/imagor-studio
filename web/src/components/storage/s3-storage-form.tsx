import { forwardRef, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronRight } from 'lucide-react'
import * as z from 'zod'

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
import { cn } from '@/lib/utils'

const s3StorageSchema = z.object({
  bucket: z.string().min(1, 'Bucket name is required'),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  forcePathStyle: z.boolean().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  sessionToken: z.string().optional(),
  baseDir: z.string().optional(),
})

export type S3StorageFormData = z.infer<typeof s3StorageSchema>

export interface S3StorageFormRef {
  getValues: () => S3StorageFormData
  isValid: () => boolean
}

interface S3StorageFormProps {
  initialValues?: Partial<S3StorageFormData>
  onSubmit: (data: S3StorageFormData) => void
  disabled?: boolean
}

export const S3StorageForm = forwardRef<S3StorageFormRef, S3StorageFormProps>(
  ({ initialValues, onSubmit, disabled }, ref) => {
    const { t } = useTranslation()
    const [showAdvanced, setShowAdvanced] = useState(false)

    const form = useForm<S3StorageFormData>({
      resolver: zodResolver(s3StorageSchema),
      defaultValues: {
        bucket: initialValues?.bucket || '',
        region: initialValues?.region || '',
        endpoint: initialValues?.endpoint || '',
        forcePathStyle: initialValues?.forcePathStyle || false,
        accessKeyId: initialValues?.accessKeyId || '',
        secretAccessKey: initialValues?.secretAccessKey || '',
        sessionToken: initialValues?.sessionToken || '',
        baseDir: initialValues?.baseDir || '',
      },
    })

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      isValid: () => form.formState.isValid,
    }))

    const handleSubmit = (data: S3StorageFormData) => {
      onSubmit(data)
    }

    return (
      <div className='space-y-6'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
            <div className={cn('space-y-6', disabled && 'opacity-60')}>
              <FormField
                control={form.control}
                name='bucket'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.storage.bucketName')} *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>{t('pages.storage.bucketDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='region'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.storage.region')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>{t('pages.storage.regionDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='accessKeyId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.storage.accessKeyId')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>{t('pages.storage.accessKeyIdDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='secretAccessKey'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.storage.secretAccessKey')}</FormLabel>
                    <FormControl>
                      <Input type='password' {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>
                      {t('pages.storage.secretAccessKeyDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    type='button'
                    className='gap-2'
                    disabled={disabled}
                  >
                    {showAdvanced ? (
                      <ChevronDown className='text-muted-foreground h-4 w-4' />
                    ) : (
                      <ChevronRight className='text-muted-foreground h-4 w-4' />
                    )}
                    Advanced Settings
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className='space-y-6 pt-4'>
                  <FormField
                    control={form.control}
                    name='endpoint'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.storage.customEndpoint')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='https://s3.amazonaws.com'
                            {...field}
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('pages.storage.customEndpointDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='forcePathStyle'
                    render={({ field }) => {
                      const checkboxId = 'forcePathStyle-checkbox'
                      return (
                        <FormItem className='flex flex-row items-center justify-between space-y-0'>
                          <div className='space-y-1'>
                            <FormLabel htmlFor={checkboxId} className='cursor-pointer'>
                              {t('pages.storage.forcePathStyle')}
                            </FormLabel>
                            <FormDescription>
                              {t('pages.storage.forcePathStyleDescription')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Checkbox
                              id={checkboxId}
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={disabled}
                            />
                          </FormControl>
                        </FormItem>
                      )
                    }}
                  />

                  <FormField
                    control={form.control}
                    name='baseDir'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.storage.baseDirectory')}</FormLabel>
                        <FormControl>
                          <Input placeholder='images/' {...field} disabled={disabled} />
                        </FormControl>
                        <FormDescription>
                          {t('pages.storage.baseDirectoryDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='sessionToken'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.storage.sessionToken')}</FormLabel>
                        <FormControl>
                          <Input
                            type='password'
                            placeholder='Optional session token'
                            {...field}
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('pages.storage.sessionTokenDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </form>
        </Form>
      </div>
    )
  },
)
