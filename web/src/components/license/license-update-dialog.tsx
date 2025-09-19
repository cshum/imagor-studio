import React, { useState } from 'react'
import { Key, Loader2 } from 'lucide-react'

import { activateLicense } from '@/api/license-api'
import { Button } from '@/components/ui/button'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'

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
  const [licenseKey, setLicenseKey] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleUpdate = async () => {
    if (!licenseKey.trim()) {
      setMessage('Please enter a license key')
      return
    }

    setIsLoading(true)
    try {
      const result = await activateLicense(licenseKey.trim())
      setMessage(result.message)

      if (result.isLicensed) {
        // Close dialog after successful activation
        setTimeout(() => {
          onOpenChange(false)
          setLicenseKey('')
          setMessage('')
          if (onSuccess) {
            onSuccess()
          }
        }, 2000)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to activate license'
      setMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setLicenseKey('')
    setMessage('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Key className='h-5 w-5 text-blue-600' />
            Update License Key
          </DialogTitle>
          <DialogDescription>
            Enter a new license key to update your current license.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {currentLicenseType && currentMaskedKey && (
            <div className='rounded-md bg-gray-50 p-3 dark:bg-gray-900/20'>
              <h4 className='mb-1 text-sm font-medium text-gray-900 dark:text-gray-100'>
                Current License
              </h4>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Type: {currentLicenseType.charAt(0).toUpperCase() + currentLicenseType.slice(1)}
              </p>
              <p className='font-mono text-sm text-gray-600 dark:text-gray-400'>
                Key: {currentMaskedKey}
              </p>
            </div>
          )}

          <div className='space-y-2'>
            <Label htmlFor='license-key'>New License Key</Label>
            <Textarea
              id='license-key'
              placeholder='IMGR-...'
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              disabled={isLoading}
              className='min-h-[120px] resize-none font-mono text-sm'
              rows={5}
            />
            <p className='text-muted-foreground text-xs'>
              Paste your new license key here. This will replace your current license.
            </p>
          </div>

          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.includes('success') || message.includes('activated')
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {message}
            </div>
          )}

          <div className='text-center'>
            <p className='text-muted-foreground mb-2 text-sm'>Need to upgrade your license?</p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                window.open('https://buy.imagor-studio.com', '_blank')
              }}
            >
              Purchase Upgrade
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isLoading || !licenseKey.trim()}>
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Update License
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
