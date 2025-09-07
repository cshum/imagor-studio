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

const fileStorageSchema = z.object({
  baseDir: z.string().min(1, 'Base directory is required'),
  mkdirPermissions: z.string().optional(),
  writePermissions: z.string().optional(),
})

export type FileStorageFormData = z.infer<typeof fileStorageSchema>

interface FileStorageFormProps {
  initialValues?: Partial<FileStorageFormData>
  onSubmit: (data: FileStorageFormData) => void
  disabled?: boolean
}

export function FileStorageForm({ initialValues, onSubmit, disabled }: FileStorageFormProps) {
  const form = useForm<FileStorageFormData>({
    resolver: zodResolver(fileStorageSchema),
    defaultValues: {
      baseDir: initialValues?.baseDir || './storage',
      mkdirPermissions: initialValues?.mkdirPermissions || '0755',
      writePermissions: initialValues?.writePermissions || '0644',
    },
  })

  const handleSubmit = (data: FileStorageFormData) => {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='baseDir'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base Directory</FormLabel>
              <FormControl>
                <Input placeholder='./storage' {...field} disabled={disabled} />
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
                <Input placeholder='0755' {...field} disabled={disabled} />
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
                <Input placeholder='0644' {...field} disabled={disabled} />
              </FormControl>
              <FormDescription>
                Permissions for writing new files (octal format, e.g., 0644)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
