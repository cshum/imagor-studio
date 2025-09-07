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

const s3StorageSchema = z.object({
  bucket: z.string().min(1, 'Bucket name is required'),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  sessionToken: z.string().optional(),
  baseDir: z.string().optional(),
})

export type S3StorageFormData = z.infer<typeof s3StorageSchema>

interface S3StorageFormProps {
  initialValues?: Partial<S3StorageFormData>
  onSubmit: (data: S3StorageFormData) => void
  disabled?: boolean
}

export function S3StorageForm({ initialValues, onSubmit, disabled }: S3StorageFormProps) {
  const form = useForm<S3StorageFormData>({
    resolver: zodResolver(s3StorageSchema),
    defaultValues: {
      bucket: initialValues?.bucket || '',
      region: initialValues?.region || 'us-east-1',
      endpoint: initialValues?.endpoint || '',
      accessKeyId: initialValues?.accessKeyId || '',
      secretAccessKey: initialValues?.secretAccessKey || '',
      sessionToken: initialValues?.sessionToken || '',
      baseDir: initialValues?.baseDir || '',
    },
  })

  const handleSubmit = (data: S3StorageFormData) => {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
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
                <Input placeholder='https://s3.amazonaws.com' {...field} disabled={disabled} />
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
      </form>
    </Form>
  )
}
