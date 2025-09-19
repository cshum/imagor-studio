import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import * as z from 'zod'

import { activateLicense } from '@/api/license-api'
import { Button } from '@/components/ui/button'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const licenseKeySchema = z.object({
  licenseKey: z.string().min(1, 'License key is required').trim(),
})

type LicenseKeyFormData = z.infer<typeof licenseKeySchema>

interface LicenseActivationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export const LicenseActivationDialog: React.FC<LicenseActivationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LicenseKeyFormData>({
    resolver: zodResolver(licenseKeySchema),
    defaultValues: {
      licenseKey: '',
    },
  })

  const handleSubmit = async (data: LicenseKeyFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await activateLicense(data.licenseKey)
      
      if (result.isLicensed) {
        toast.success(t('pages.license.activationSuccess'))
        handleClose()
        onSuccess?.()
      } else {
        setError(result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to activate license'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Support Imagor Studio Development</DialogTitle>
          <DialogDescription>
            Enter your license key to support ongoing development and remove this reminder.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Why Support Section */}
          <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg border p-4'>
            <h4 className='mb-2 text-sm font-medium text-blue-900 dark:text-blue-400'>
              Why support development?
            </h4>
            <ul className='space-y-1 text-sm text-blue-800 dark:text-blue-300'>
              <li>• Ongoing feature development and improvements</li>
              <li>• Bug fixes and security updates</li>
              <li>• Community support and documentation</li>
              <li>• Keeping the project alive and thriving</li>
            </ul>
          </div>

          {/* License Key Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
              <div className={cn('space-y-6', isLoading && 'opacity-60')}>
                <FormField
                  control={form.control}
                  name='licenseKey'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Key</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='IMGR-...'
                          className='min-h-[120px] resize-none font-mono text-sm'
                          rows={5}
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Paste your complete license key here to activate Imagor Studio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className='bg-destructive/10 text-destructive rounded-md p-3 text-sm'>
                  {error}
                </div>
              )}
            </form>
          </Form>
        </div>

        <DialogFooter className='flex justify-between'>
          <div className='flex gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                window.open('https://buy.imagor-studio.com', '_blank')
              }}
            >
              {t('pages.license.purchaseLicense')}
            </Button>
          </div>
          <div className='flex gap-3'>
            <Button 
              type='button' 
              variant='outline' 
              onClick={handleClose} 
              disabled={isLoading}
            >
              Maybe Later
            </Button>
            <ButtonWithLoading
              type='submit'
              onClick={form.handleSubmit(handleSubmit)}
              disabled={!form.formState.isValid}
              isLoading={isLoading}
            >
              {t('pages.license.activateLicense')}
            </ButtonWithLoading>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
