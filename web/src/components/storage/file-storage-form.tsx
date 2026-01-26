import { forwardRef, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronRight } from 'lucide-react'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
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

const fileStorageSchema = z.object({
  baseDir: z.string().min(1, 'Base directory is required'),
  mkdirPermissions: z.string().optional(),
  writePermissions: z.string().optional(),
})

export type FileStorageFormData = z.infer<typeof fileStorageSchema>

export interface FileStorageFormRef {
  getValues: () => FileStorageFormData
  isValid: () => boolean
}

interface FileStorageFormProps {
  initialValues?: Partial<FileStorageFormData>
  onSubmit: (data: FileStorageFormData) => void
  disabled?: boolean
}

export const FileStorageForm = forwardRef<FileStorageFormRef, FileStorageFormProps>(
  ({ initialValues, onSubmit, disabled }, ref) => {
    const { t } = useTranslation()
    const [showAdvanced, setShowAdvanced] = useState(false)

    const form = useForm<FileStorageFormData>({
      resolver: zodResolver(fileStorageSchema),
      defaultValues: {
        baseDir: initialValues?.baseDir || '/app/gallery',
        mkdirPermissions: initialValues?.mkdirPermissions || '0755',
        writePermissions: initialValues?.writePermissions || '0644',
      },
    })

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      isValid: () => form.formState.isValid,
    }))

    const handleSubmit = (data: FileStorageFormData) => {
      onSubmit(data)
    }

    return (
      <div className='space-y-6'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
            <div className={cn('space-y-6', disabled && 'opacity-60')}>
              <FormField
                control={form.control}
                name='baseDir'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pages.storage.baseDir')}</FormLabel>
                    <FormControl>
                      <Input placeholder='/app/gallery' {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>{t('pages.storage.baseDirDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  <FormField
                    control={form.control}
                    name='mkdirPermissions'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.storage.directoryPermissions')}</FormLabel>
                        <FormControl>
                          <Input placeholder='0755' {...field} disabled={disabled} />
                        </FormControl>
                        <FormDescription>
                          {t('pages.storage.dirPermissionsDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='writePermissions'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.storage.filePermissions')}</FormLabel>
                        <FormControl>
                          <Input placeholder='0644' {...field} disabled={disabled} />
                        </FormControl>
                        <FormDescription>
                          {t('pages.storage.filePermissionsDescription')}
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
