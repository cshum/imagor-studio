import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

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
  isOverriddenByConfig?: boolean
}

export const FileStorageForm = forwardRef<FileStorageFormRef, FileStorageFormProps>(
  ({ initialValues, onSubmit, disabled, isOverriddenByConfig }, ref) => {
    const form = useForm<FileStorageFormData>({
      resolver: zodResolver(fileStorageSchema),
      defaultValues: {
        baseDir: initialValues?.baseDir || './storage',
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

    const isFormDisabled = disabled || isOverriddenByConfig

    return (
      <div className='space-y-6'>
        {isOverriddenByConfig && (
          <span className='mt-1 block text-orange-600 dark:text-orange-400'>
            File storage configuration is overridden by configuration file or environment variable
          </span>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
            <div className={cn('space-y-6', isOverriddenByConfig && 'opacity-60')}>
              <FormField
                control={form.control}
                name='baseDir'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Directory</FormLabel>
                    <FormControl>
                      <Input placeholder='./storage' {...field} disabled={isFormDisabled} />
                    </FormControl>
                    <FormDescription>
                      The directory where images will be stored on the file system
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='mkdirPermissions'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Directory Permissions</FormLabel>
                    <FormControl>
                      <Input placeholder='0755' {...field} disabled={isFormDisabled} />
                    </FormControl>
                    <FormDescription>
                      Permissions for creating new directories (octal format, e.g., 0755)
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
                    <FormLabel>File Permissions</FormLabel>
                    <FormControl>
                      <Input placeholder='0644' {...field} disabled={isFormDisabled} />
                    </FormControl>
                    <FormDescription>
                      Permissions for writing new files (octal format, e.g., 0644)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </div>
    )
  },
)
