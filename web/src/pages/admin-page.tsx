import { useState } from 'react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { setSystemRegistry } from '@/api/registry-api'
import { extractErrorMessage } from '@/lib/error-utils'
import type { AdminLoaderData } from '@/loaders/account-loader'

interface AdminPageProps {
  loaderData?: AdminLoaderData
}

export function AdminPage({ loaderData }: AdminPageProps) {
  const [isUpdatingGuestMode, setIsUpdatingGuestMode] = useState(false)
  const [guestModeEnabled, setGuestModeEnabled] = useState(
    loaderData?.guestModeEnabled ?? false
  )

  const onGuestModeToggle = async (enabled: boolean) => {
    setIsUpdatingGuestMode(true)

    try {
      await setSystemRegistry('auth.enableGuestMode', enabled ? 'true' : 'false')
      setGuestModeEnabled(enabled)
      toast.success(`Guest mode ${enabled ? 'enabled' : 'disabled'} successfully!`)
    } catch (err) {
      const errorMessage = extractErrorMessage(err)
      toast.error(`Failed to update guest mode: ${errorMessage}`)
      
      // Revert the checkbox state on error
      setGuestModeEnabled(!enabled)
    } finally {
      setIsUpdatingGuestMode(false)
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
                disabled={isUpdatingGuestMode}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
