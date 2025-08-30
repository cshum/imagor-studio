import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { setSystemRegistryObject } from '@/api/registry-api'
import { extractErrorMessage } from '@/lib/error-utils'
import type { AdminLoaderData } from '@/loaders/account-loader'

interface AdminPageProps {
  loaderData?: AdminLoaderData
}

export function AdminPage({ loaderData }: AdminPageProps) {
  const router = useRouter()
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
  
  // Registry is Record<string, string> - all values are strings
  type RegistryMap = Record<string, string>
  
  // Original values from loader - already in string format
  const originalSettings = useMemo<RegistryMap>(() => 
    loaderData?.registry || {}
  , [loaderData])
  
  // Current form state - map of registry keys to string values
  const [settings, setSettings] = useState<RegistryMap>(originalSettings)

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(originalSettings).some(key => 
      settings[key] !== originalSettings[key]
    )
  }, [settings, originalSettings])

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const onUpdateSettings = async () => {
    setIsUpdatingSettings(true)

    try {
      // Save settings directly as Record<string, string>
      await setSystemRegistryObject(settings)
      toast.success('Settings updated successfully!')
      
      // Invalidate the current route to refresh loader data
      await router.invalidate()
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
                checked={settings['auth.enableGuestMode'] === 'true'}
                onCheckedChange={(checked) => 
                  updateSetting('auth.enableGuestMode', checked ? 'true' : 'false')
                }
                disabled={isUpdatingSettings}
              />
            </div>
            
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
