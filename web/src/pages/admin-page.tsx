import { useState, useMemo } from 'react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { setSystemRegistryMultiple } from '@/api/registry-api'
import { extractErrorMessage } from '@/lib/error-utils'
import type { AdminLoaderData } from '@/loaders/account-loader'

interface AdminPageProps {
  loaderData?: AdminLoaderData
}

export function AdminPage({ loaderData }: AdminPageProps) {
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
  
  // Original values from loader
  const originalGuestModeEnabled = loaderData?.guestModeEnabled ?? false
  
  // Current form state
  const [guestModeEnabled, setGuestModeEnabled] = useState(originalGuestModeEnabled)

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return guestModeEnabled !== originalGuestModeEnabled
  }, [guestModeEnabled, originalGuestModeEnabled])

  const onGuestModeToggle = (enabled: boolean) => {
    setGuestModeEnabled(enabled)
  }

  const onUpdateSettings = async () => {
    setIsUpdatingSettings(true)

    try {
      // Prepare all settings to save
      const settingsToSave = [
        { key: 'auth.enableGuestMode', value: guestModeEnabled ? 'true' : 'false' },
        // Add more settings here as needed
      ]

      await setSystemRegistryMultiple(settingsToSave)
      toast.success('Settings updated successfully!')
      
      // Refresh the page to get updated loader data
      window.location.reload()
    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      toast.error(`Failed to update settings: ${errorMessage}`)
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Configure system-wide settings. These options are only available to administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <div className='text-base font-medium'>Guest Mode</div>
                <div className='text-sm text-muted-foreground'>
                  Allow users to browse the gallery without creating an account
                </div>
              </div>
              <Checkbox
                checked={guestModeEnabled}
                onCheckedChange={onGuestModeToggle}
                disabled={isUpdatingSettings}
              />
            </div>
            
            {hasUnsavedChanges && (
              <div className='text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3'>
                You have unsaved changes. Click "Update Settings" to save them.
              </div>
            )}
            
            <div className='flex justify-end pt-4 border-t'>
              <ButtonWithLoading
                onClick={onUpdateSettings}
                isLoading={isUpdatingSettings}
                disabled={!hasUnsavedChanges}
              >
                Update Settings
              </ButtonWithLoading>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
