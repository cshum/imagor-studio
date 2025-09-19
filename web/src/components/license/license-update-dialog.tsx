import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
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
import { checkLicense } from '@/stores/license-store'

const licenseKeySchema = z.object({
  licenseKey: z.string().min(1, 'License key is required').trim(),
})

type LicenseKeyFormData = z.infer<typeof licenseKeySchema>

interface LicenseUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLicenseType?: string
  currentMaskedKey?: string
  onSuccess?: () => void
}

export const LicenseUpdateDialog: React.FC<LicenseUpdateDialogProps> = ({
  open,
  onOpenChange,
  currentLicenseType,
  currentMaskedKey,
  onSuccess,
}) => {
  const { t } = useTranslation()
  const router = useRouter()
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
        const message = isCurrentlyLicensed
          ? t('pages.license.updateSuccess')
          : t('pages.license.activationSuccess')
        toast.success(message)
        // Refresh license store to update UI immediately
        await checkLicense()
        // Invalidate router to refresh loader data
        await router.invalidate()
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

  const isCurrentlyLicensed = currentLicenseType && currentMaskedKey

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isCurrentlyLicensed
              ? t('pages.license.updateLicense')
              : t('pages.license.activateLicense')}
          </DialogTitle>
          <DialogDescription>
            {isCurrentlyLicensed
              ? 'Enter a new license key to update your current license.'
              : 'Enter your license key to activate Imagor Studio.'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Current License Info */}
          {isCurrentlyLicensed && (
            <div className='bg-muted/50 rounded-lg border p-4'>
              <h4 className='mb-2 text-sm font-medium'>Current License</h4>
              <div className='space-y-1'>
                <div className='text-sm'>
                  <span className='text-muted-foreground'>Type: </span>
                  <span>
                    {currentLicenseType!.charAt(0).toUpperCase() + currentLicenseType!.slice(1)}
                  </span>
                </div>
                <div className='text-sm'>
                  <span className='text-muted-foreground'>Key: </span>
                  <span className='font-mono'>{currentMaskedKey}</span>
                </div>
              </div>
            </div>
          )}

          {/* License Key Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
              <div className={cn('space-y-6', isLoading && 'opacity-60')}>
                <FormField
                  control={form.control}
                  name='licenseKey'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isCurrentlyLicensed ? 'New License Key' : 'License Key'}
                      </FormLabel>
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
                        {isCurrentlyLicensed
                          ? 'Paste your new license key here. This will replace your current license.'
                          : 'Paste your license key here to activate Imagor Studio.'}
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

        <DialogFooter className='flex justify-end gap-3'>
          {!isCurrentlyLicensed && (
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                window.open('https://buy.imagor-studio.com', '_blank')
              }}
            >
              {t('pages.license.purchaseLicense')}
            </Button>
          )}
          <ButtonWithLoading
            type='submit'
            onClick={form.handleSubmit(handleSubmit)}
            disabled={!form.formState.isValid}
            isLoading={isLoading}
          >
            {isCurrentlyLicensed
              ? t('pages.license.updateLicense')
              : t('pages.license.activateLicense')}
          </ButtonWithLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
