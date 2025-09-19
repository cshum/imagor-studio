import React, { useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLicense } from '@/stores/license-store'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface LicenseActivationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const LicenseActivationDialog: React.FC<LicenseActivationDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [licenseKey, setLicenseKey] = useState('')
  const [message, setMessage] = useState('')
  const { activateLicense, isLoading } = useLicense()

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setMessage('Please enter a license key')
      return
    }

    const result = await activateLicense(licenseKey.trim())
    setMessage(result.message)

    if (result.success) {
      // Close dialog after successful activation
      setTimeout(() => {
        onOpenChange(false)
        setLicenseKey('')
        setMessage('')
      }, 2000)
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
            <Heart className='h-5 w-5 text-blue-600' />
            Support Imagor Studio Development
          </DialogTitle>
          <DialogDescription>
            Enter your license key to support ongoing development and remove this reminder.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='license-key'>License Key</Label>
            <Input
              id='license-key'
              placeholder='IMGR-xxxx-xxxx-xxxx-xxxx'
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              disabled={isLoading}
            />
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

          <div className='rounded-md bg-blue-50 p-4 dark:bg-blue-900/20'>
            <h4 className='mb-2 font-medium text-blue-900 dark:text-blue-400'>
              Why support development?
            </h4>
            <ul className='space-y-1 text-sm text-blue-800 dark:text-blue-300'>
              <li>• Ongoing feature development and improvements</li>
              <li>• Bug fixes and security updates</li>
              <li>• Community support and documentation</li>
              <li>• Keeping the project alive and thriving</li>
            </ul>
          </div>

          <div className='text-center'>
            <p className='text-muted-foreground mb-2 text-sm'>Don't have a license yet?</p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                // TODO: Open purchase page
                window.open('https://buy.imagor-studio.com', '_blank')
              }}
            >
              Get License ($39)
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleClose} disabled={isLoading}>
            Maybe Later
          </Button>
          <Button onClick={handleActivate} disabled={isLoading || !licenseKey.trim()}>
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Activate License
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
