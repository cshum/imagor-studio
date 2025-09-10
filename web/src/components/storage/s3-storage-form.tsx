import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Checkbox } from '@/components/ui/checkbox'
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
    const form = useForm<S3StorageFormData>({
      resolver: zodResolver(s3StorageSchema),
      defaultValues: {
        bucket: initialValues?.bucket || '',
        region: initialValues?.region || 'us-east-1',
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
                    <FormLabel>Bucket Name *</FormLabel>
                    <FormControl>
                      <Input placeholder='my-image-bucket' {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>
                      The name of your S3 bucket where images will be stored
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='region'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder='us-east-1' {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>
                      AWS region where your bucket is located (e.g., us-east-1, eu-west-1)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='endpoint'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Endpoint</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='https://s3.amazonaws.com'
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormDescription>
                      Custom S3 endpoint for S3-compatible services (leave empty for AWS S3)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='forcePathStyle'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-start space-y-0 space-x-3'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className='space-y-1 leading-none'>
                      <FormLabel>Force Path Style</FormLabel>
                      <FormDescription>
                        Enable for MinIO and LocalStack. Most other S3-compatible services work
                        better with this disabled.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='accessKeyId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key ID</FormLabel>
                    <FormControl>
                      <Input placeholder='AKIAIOSFODNN7EXAMPLE' {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>
                      AWS access key ID (leave empty to use IAM roles or environment variables)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='secretAccessKey'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Access Key</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormDescription>
                      AWS secret access key (leave empty to use IAM roles or environment variables)
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
                    <FormLabel>Session Token</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder='Optional session token'
                        {...field}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormDescription>
                      AWS session token (only required for temporary credentials)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='baseDir'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Directory</FormLabel>
                    <FormControl>
                      <Input placeholder='images/' {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>
                      Optional prefix for all object keys in the bucket (e.g., "images/")
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
